import { inngest } from '../client'
import { supabaseAdmin } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const resend = new Resend(process.env.RESEND_API_KEY!)

export const expectationDocJob = inngest.createFunction(
  { id: 'expectation-doc', name: 'Auto-generate Month 1/3/6 Expectation Document' },
  { event: 'onboarding/completed' },
  async ({ event, step }) => {
    const { orgId } = event.data as { orgId: string }

    // Step 1: Fetch org intake data
    const org = await step.run('fetch-org-data', async () => {
      const { data, error } = await supabaseAdmin
        .from('organizations')
        .select('id, name, vertical, target_cpl, expectation_doc_sent_at')
        .eq('id', orgId)
        .single()

      if (error || !data) throw new Error(`Org not found: ${orgId}`)
      return data
    })

    // Guard: only send once
    if (org.expectation_doc_sent_at) {
      return { skipped: true, reason: 'Expectation doc already sent' }
    }

    // Step 2: Fetch vertical benchmarks
    const benchmarks = await step.run('fetch-benchmarks', async () => {
      const vertical = org.vertical ?? 'healthcare'
      const { data } = await supabaseAdmin
        .from('sem_vertical_benchmarks')
        .select('avg_cpl_low, avg_cpl_high, month1_cpl_multiplier')
        .eq('vertical', vertical)
        .single()

      return data ?? { avg_cpl_low: 80, avg_cpl_high: 200, month1_cpl_multiplier: 1.50 }
    })

    // Step 3: Generate expectation doc via Claude
    const docHtml = await step.run('generate-expectation-doc', async () => {
      const targetCpl = org.target_cpl ?? benchmarks.avg_cpl_high
      const month1Cpl = (Number(targetCpl) * Number(benchmarks.month1_cpl_multiplier)).toFixed(2)
      const vertical = org.vertical ?? 'healthcare'

      const prompt = `You are an SEM account manager at NuStack Digital. Generate a client expectation document for ${org.name} who runs a ${vertical} business.

Their target CPL: $${targetCpl}
Industry benchmark CPL: $${benchmarks.avg_cpl_low}–$${benchmarks.avg_cpl_high}
Month 1 CPL expectation: $${month1Cpl} (learning period)

Write a clear, confident, plain-English document covering:
1. What Month 1 will look like and why CPL will be elevated (learning period)
2. What Month 3 should look like as data accumulates
3. What Month 6 looks like when the account is mature
4. What they should never judge the campaign on (single-day data, CTR alone, Ad Strength)
5. What they should always judge it on (weekly CPL trend, lead quality, close rate)

Tone: confident, no jargon, no hedging. This document should make the client feel they hired experts.

Format the output as clean HTML paragraphs with <h2> section headings. No <html> or <body> tags — inner content only.`

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      })

      const content = message.content[0]
      return content.type === 'text' ? content.text : '<p>Unable to generate document.</p>'
    })

    // Step 4: Get org admin email via Clerk
    const adminEmail = await step.run('get-admin-email', async () => {
      const { data: orgRow } = await supabaseAdmin
        .from('organizations')
        .select('clerk_org_id')
        .eq('id', orgId)
        .single()

      if (!orgRow?.clerk_org_id) return null

      const membersRes = await fetch(
        `https://api.clerk.com/v1/organizations/${orgRow.clerk_org_id}/memberships?limit=20`,
        { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` } }
      )
      if (!membersRes.ok) return null

      const members = (await membersRes.json()) as {
        data?: Array<{ role: string; public_user_data: { user_id: string } }>
      }

      const adminIds = (members.data ?? [])
        .filter((m) => m.role === 'org:admin')
        .map((m) => m.public_user_data.user_id)

      if (!adminIds.length) return null

      const userRes = await fetch(`https://api.clerk.com/v1/users/${adminIds[0]}`, {
        headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
      })
      if (!userRes.ok) return null

      const user = (await userRes.json()) as {
        email_addresses?: Array<{ email_address: string; id: string }>
        primary_email_address_id?: string
      }

      return (
        user.email_addresses?.find((e) => e.id === user.primary_email_address_id)
          ?.email_address ?? null
      )
    })

    if (!adminEmail) {
      return { sent: false, reason: 'No admin email found' }
    }

    // Step 5: Send via Resend
    await step.run('send-expectation-doc', async () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>What to Expect from Your Campaign — ${org.name}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.1);">
    <div style="background: #1e40af; padding: 24px 32px; color: #fff;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 700;">What to Expect from Your Campaign</h1>
      <p style="margin: 6px 0 0; font-size: 14px; opacity: .8;">${org.name} — NuStack Digital</p>
    </div>
    <div style="padding: 32px; color: #374151; font-size: 15px; line-height: 1.7;">
      ${docHtml}
    </div>
    <div style="background: #f1f5f9; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
      Powered by NuStack Marketing Engine &mdash; <a href="mailto:reports@nustack.digital" style="color: #64748b;">reports@nustack.digital</a>
    </div>
  </div>
</body>
</html>`

      await resend.emails.send({
        from: 'NuStack Digital <reports@nustack.digital>',
        to: adminEmail,
        subject: `What to Expect from Your Campaign — ${org.name}`,
        html,
      })
    })

    // Step 6: Log delivery timestamp
    await step.run('log-delivery', async () => {
      await supabaseAdmin
        .from('organizations')
        .update({ expectation_doc_sent_at: new Date().toISOString() })
        .eq('id', orgId)
    })

    return { sent: true, to: adminEmail, orgId }
  }
)
