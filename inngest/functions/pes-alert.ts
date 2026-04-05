import { inngest } from '../client'
import { supabaseAdmin } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const resend = new Resend(process.env.RESEND_API_KEY!)

interface PesCalculatedEventData {
  locationId: string
  orgId: string
  locationName: string
  pesScore: number
  components: {
    roas: number
    pacing: number
    qualityScore: number
    creativeHealth: number
  }
}

export const pesAlert = inngest.createFunction(
  {
    id: 'pes-alert',
    name: 'PES Critical Alert (< 55)',
  },
  { event: 'pes/calculated' },
  async ({ event, step }) => {
    const data = event.data as PesCalculatedEventData

    // Only trigger for PES < 55
    if (data.pesScore >= 55) {
      return { skipped: true, pesScore: data.pesScore, reason: 'PES above threshold' }
    }

    // Step 1: Identify lowest-scoring component
    const lowestComponent = step.run('identify-lowest-component', () => {
      const components = data.components
      const entries = [
        { name: 'ROAS', score: components.roas },
        { name: 'Pacing', score: components.pacing },
        { name: 'Quality Score', score: components.qualityScore },
        { name: 'Creative Health', score: components.creativeHealth },
      ]
      return entries.sort((a, b) => a.score - b.score)[0]
    })

    const lowest = await lowestComponent

    // Step 2: Generate diagnostic summary via Claude
    const diagnostic = await step.run('generate-diagnostic', async () => {
      const prompt = `You are a senior SEM analyst at NuStack Digital. A client account has triggered a PES (Platform Efficiency Score) critical alert.

Account: ${data.locationName}
Overall PES: ${data.pesScore}/100 (critical threshold: 55)
Lowest component: ${lowest.name} (score: ${lowest.score})
All components: ROAS=${data.components.roas}, Pacing=${data.components.pacing}, Quality Score=${data.components.qualityScore}, Creative Health=${data.components.creativeHealth}

Write one paragraph (3–5 sentences) diagnosing the most likely cause and recommended immediate action. Be specific. Use plain English — no acronym soup. This goes to Brad (agency owner) for immediate review.`

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      })

      const content = message.content[0]
      return content.type === 'text' ? content.text : 'Diagnostic unavailable.'
    })

    // Step 3: Log alert to sem_pes_alerts
    const alertId = await step.run('log-alert', async () => {
      const { data: alert, error } = await supabaseAdmin
        .from('sem_pes_alerts')
        .insert({
          org_id: data.orgId,
          location_id: data.locationId,
          pes_score: data.pesScore,
          lowest_component: lowest.name,
          alert_sent_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (error) throw new Error(`Failed to log PES alert: ${error.message}`)
      return alert.id
    })

    // Step 4: Send Slack message to Brad
    await step.run('send-slack-alert', async () => {
      const slackWebhookUrl = process.env.SLACK_ALERT_WEBHOOK_URL
      if (!slackWebhookUrl) return { skipped: true, reason: 'SLACK_ALERT_WEBHOOK_URL not set' }

      await fetch(slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 *PES Critical Alert* — ${data.locationName}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `🚨 *PES Critical Alert*\n*Account:* ${data.locationName}\n*PES Score:* ${data.pesScore}/100\n*Lowest Component:* ${lowest.name} (${lowest.score})\n\n${diagnostic}`,
              },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `Alert ID: ${alertId} · 24-hour resolution SLA · <${process.env.NEXT_PUBLIC_APP_URL}/dashboard|View Dashboard>`,
                },
              ],
            },
          ],
        }),
      })
    })

    // Step 5: Send email to Brad
    await step.run('send-email-alert', async () => {
      const bradEmail = process.env.BRAD_ALERT_EMAIL ?? 'bradnmc@gmail.com'

      await resend.emails.send({
        from: 'Marketing Engine <reports@nustack.digital>',
        to: bradEmail,
        subject: `🚨 PES Critical Alert — ${data.locationName} (${data.pesScore}/100)`,
        html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fef2f2; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.1);">
    <div style="background: #dc2626; padding: 20px 28px; color: #fff;">
      <h1 style="margin: 0; font-size: 18px; font-weight: 700;">PES Critical Alert</h1>
      <p style="margin: 4px 0 0; font-size: 13px; opacity: .9;">${data.locationName}</p>
    </div>
    <div style="padding: 24px 28px;">
      <table style="width: 100%; font-size: 14px; color: #374151; border-collapse: collapse; margin-bottom: 20px;">
        <tr><td style="padding: 6px 0; font-weight: 600;">PES Score</td><td style="text-align: right; color: #dc2626; font-weight: 700; font-size: 18px;">${data.pesScore}/100</td></tr>
        <tr><td style="padding: 6px 0;">Lowest Component</td><td style="text-align: right;">${lowest.name} (${lowest.score})</td></tr>
        <tr><td style="padding: 6px 0;">ROAS</td><td style="text-align: right;">${data.components.roas}</td></tr>
        <tr><td style="padding: 6px 0;">Pacing</td><td style="text-align: right;">${data.components.pacing}</td></tr>
        <tr><td style="padding: 6px 0;">Quality Score</td><td style="text-align: right;">${data.components.qualityScore}</td></tr>
        <tr><td style="padding: 6px 0;">Creative Health</td><td style="text-align: right;">${data.components.creativeHealth}</td></tr>
      </table>
      <div style="background: #fef2f2; border-left: 3px solid #dc2626; padding: 12px 16px; border-radius: 0 6px 6px 0; font-size: 14px; color: #374151; line-height: 1.6;">
        <strong>Diagnostic:</strong><br>${diagnostic}
      </div>
      <div style="margin-top: 20px; padding: 12px; background: #f8fafc; border-radius: 8px; font-size: 13px; color: #64748b;">
        ⏱ 24-hour resolution SLA. If unresolved, a follow-up alert will be sent.
      </div>
      <div style="margin-top: 20px; text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://marketing-engine-roan.vercel.app'}/dashboard"
           style="display: inline-block; background: #dc2626; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600;">
          Review Now
        </a>
      </div>
    </div>
  </div>
</body>
</html>`,
      })
    })

    // Step 6: Schedule 24-hour follow-up check (sleep then check resolved_at)
    await step.sleep('wait-24h-resolution', '24h')

    await step.run('check-resolution-sla', async () => {
      const { data: alert } = await supabaseAdmin
        .from('sem_pes_alerts')
        .select('resolved_at')
        .eq('id', alertId)
        .single()

      if (alert?.resolved_at) return { resolved: true }

      // Still unresolved — send follow-up
      const bradEmail = process.env.BRAD_ALERT_EMAIL ?? 'bradnmc@gmail.com'
      await resend.emails.send({
        from: 'Marketing Engine <reports@nustack.digital>',
        to: bradEmail,
        subject: `⚠️ PES Alert UNRESOLVED 24h — ${data.locationName}`,
        html: `<p>The PES critical alert for <strong>${data.locationName}</strong> (score: ${data.pesScore}) logged 24 hours ago has not been marked as resolved.</p><p>Alert ID: ${alertId}</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">Review in Dashboard</a></p>`,
      })

      await supabaseAdmin
        .from('sem_pes_alerts')
        .update({ followup_sent_at: new Date().toISOString() })
        .eq('id', alertId)

      return { resolved: false, followupSent: true }
    })

    return { alertId, pesScore: data.pesScore, lowestComponent: lowest.name }
  }
)
