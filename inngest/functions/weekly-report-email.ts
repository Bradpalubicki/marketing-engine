import { inngest } from '../client'
import { supabaseAdmin } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'
import { format, subDays, startOfWeek, nextMonday } from 'date-fns'
import { generateRatingUrls } from '@/app/api/leads/rate-quality/route'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const resend = new Resend(process.env.RESEND_API_KEY!)

export const weeklyReportEmail = inngest.createFunction(
  {
    id: 'weekly-report-email',
    name: 'Monday Weekly Report Email',
  },
  // Cron: every Monday at 8am UTC
  { cron: '0 8 * * 1' },
  async ({ step }) => {
    const now = new Date()
    const weekEnd = format(subDays(now, 1), 'yyyy-MM-dd')
    const weekStart = format(subDays(now, 7), 'yyyy-MM-dd')
    const prevWeekEnd = format(subDays(now, 8), 'yyyy-MM-dd')
    const prevWeekStart = format(subDays(now, 14), 'yyyy-MM-dd')
    const weekDate = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const weekLabel = format(startOfWeek(now, { weekStartsOn: 1 }), 'MMMM d, yyyy')

    // Fetch all active locations with org data
    const locations = await step.run('fetch-locations', async () => {
      const { data, error } = await supabaseAdmin
        .from('locations')
        .select(`
          id, name, city, state, org_id,
          organizations(id, clerk_org_id, name),
          gbp_profiles(avg_rating, review_count)
        `)
        .eq('status', 'active')
        .eq('weekly_report_enabled', true)

      if (error) throw new Error(`Failed to fetch locations: ${error.message}`)
      return data ?? []
    })

    if (!locations.length) return { sent: 0, reason: 'No active locations with reports enabled' }

    let sent = 0
    const errors: string[] = []

    for (const location of locations) {
      try {
        const org = (location as { organizations?: { id?: string; clerk_org_id?: string; name?: string } }).organizations
        if (!org?.clerk_org_id || !org.id) continue

        // Step: gather metrics for this location
        const metrics = await step.run(`metrics-${location.id}`, async () => {
          const [leadsRes, prevLeadsRes, spendRes] = await Promise.all([
            supabaseAdmin
              .from('leads')
              .select('id, status, first_touch_source')
              .eq('location_id', location.id)
              .gte('created_at', weekStart)
              .lte('created_at', weekEnd + 'T23:59:59Z'),
            supabaseAdmin
              .from('leads')
              .select('id, status')
              .eq('location_id', location.id)
              .gte('created_at', prevWeekStart)
              .lte('created_at', prevWeekEnd + 'T23:59:59Z'),
            supabaseAdmin
              .from('spend_records')
              .select('platform, spend, clicks')
              .eq('location_id', location.id)
              .gte('spend_date', weekStart)
              .lte('spend_date', weekEnd),
          ])

          const leads = leadsRes.data ?? []
          const prevLeads = prevLeadsRes.data ?? []
          const spend = spendRes.data ?? []

          const weeklyLeads = leads.length
          const weeklyBooked = leads.filter((l) => l.status === 'booked' || l.status === 'showed').length
          const weeklyShowed = leads.filter((l) => l.status === 'showed').length
          const prevWeekShowed = prevLeads.filter((l) => l.status === 'showed').length

          const googleSpend = spend.filter((s) => s.platform === 'google').reduce((sum, s) => sum + (s.spend ?? 0), 0)
          const metaSpend = spend.filter((s) => s.platform === 'meta').reduce((sum, s) => sum + (s.spend ?? 0), 0)
          const microsoftSpend = spend.filter((s) => s.platform === 'microsoft').reduce((sum, s) => sum + (s.spend ?? 0), 0)
          const weeklySpend = googleSpend + metaSpend + microsoftSpend

          // Top performing source by volume
          const sourceCounts: Record<string, number> = {}
          leads.forEach((l) => {
            if (l.first_touch_source) {
              sourceCounts[l.first_touch_source] = (sourceCounts[l.first_touch_source] ?? 0) + 1
            }
          })
          const topSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

          return { weeklyLeads, weeklyBooked, weeklyShowed, prevWeekShowed, weeklySpend, googleSpend, metaSpend, microsoftSpend, topSource }
        })

        // Step: get org admin emails
        const adminEmails = await step.run(`emails-${location.id}`, async () => {
          const membersRes = await fetch(
            `https://api.clerk.com/v1/organizations/${org.clerk_org_id}/memberships?limit=20`,
            { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` } }
          )
          if (!membersRes.ok) return []

          const members = (await membersRes.json()) as {
            data?: Array<{ role: string; public_user_data: { user_id: string } }>
          }

          const adminIds = (members.data ?? [])
            .filter((m) => m.role === 'org:admin')
            .map((m) => m.public_user_data.user_id)

          const userResults = await Promise.allSettled(
            adminIds.map((userId) =>
              fetch(`https://api.clerk.com/v1/users/${userId}`, {
                headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
              }).then((r) => r.ok ? r.json() as Promise<{
                email_addresses?: Array<{ email_address: string; id: string }>
                primary_email_address_id?: string
              }> : null)
            )
          )

          const emails: string[] = []
          for (const result of userResults) {
            if (result.status !== 'fulfilled' || !result.value) continue
            const user = result.value
            const primary = user.email_addresses?.find((e) => e.id === user.primary_email_address_id)
            if (primary) emails.push(primary.email_address)
          }
          return emails
        })

        if (!adminEmails.length) continue

        // Step: generate AI narrative
        const narrative = await step.run(`narrative-${location.id}`, async () => {
          const cpl = metrics.weeklyLeads > 0 ? (metrics.weeklySpend / metrics.weeklyLeads).toFixed(2) : 'N/A'
          const trend = metrics.weeklyShowed > metrics.prevWeekShowed
            ? `up ${metrics.weeklyShowed - metrics.prevWeekShowed} from last week`
            : metrics.weeklyShowed < metrics.prevWeekShowed
              ? `down ${metrics.prevWeekShowed - metrics.weeklyShowed} from last week`
              : 'same as last week'

          const prompt = `You are analyzing marketing performance for ${location.name} in ${location.city}, ${location.state}.

This week: ${metrics.weeklyLeads} new leads, ${metrics.weeklyShowed} patients showed (${trend}), $${metrics.weeklySpend.toFixed(2)} total spend, CPL: $${cpl}.
Top lead source this week: ${metrics.topSource ?? 'not tracked yet'}.

Write a 3-part summary for the clinic owner:
1. One-line headline (what happened this week in plain English)
2. What worked (1 sentence)
3. What's next (1 specific planned action)

Rules: no CTR, CPM, ROAS, ad rank, Ad Strength. Use "new patients", "consultations", "leads". Under 120 words total. Positive, professional.`

          const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 300,
            messages: [{ role: 'user', content: prompt }],
          })

          const content = message.content[0]
          return content.type === 'text' ? content.text : 'Report generation unavailable this week.'
        })

        // Step: generate quality rating URLs
        const ratingUrls = await step.run(`rating-urls-${location.id}`, async () => {
          try {
            return await generateRatingUrls(org.id!, weekDate)
          } catch {
            return null
          }
        })

        // Step: build and send email
        const gbpRaw = (location as { gbp_profiles?: unknown }).gbp_profiles
        const gbpProfile = Array.isArray(gbpRaw) ? gbpRaw[0] as { avg_rating?: number | null; review_count?: number | null } | null : gbpRaw as { avg_rating?: number | null; review_count?: number | null } | null
        const locationForEmail = { name: location.name, city: location.city, state: location.state, gbp_profiles: gbpProfile }
        const reportHtml = buildReportHtml(locationForEmail, metrics, narrative, weekLabel, ratingUrls)

        await step.run(`send-${location.id}`, async () => {
          for (const email of adminEmails) {
            await resend.emails.send({
              from: 'Marketing Engine <reports@nustack.digital>',
              to: email,
              subject: `Your Weekly Marketing Summary — ${location.name} — Week of ${weekLabel}`,
              html: reportHtml,
            })
          }
        })

        // Step: log report record
        await step.run(`log-report-${location.id}`, async () => {
          await supabaseAdmin
            .from('sem_weekly_reports')
            .upsert({
              org_id: org.id,
              location_id: location.id,
              week_date: weekDate,
              report_html: reportHtml,
              quality_rating_token: ratingUrls ? Object.values(ratingUrls)[0]?.split('token=')[1]?.split('&')[0] : null,
              sent_at: new Date().toISOString(),
            }, { onConflict: 'location_id,week_date' })
        })

        sent++
      } catch (err) {
        errors.push(`${location.name}: ${String(err)}`)
      }
    }

    return { sent, errors: errors.length ? errors : undefined }
  }
)

interface LocationMetrics {
  weeklyLeads: number
  weeklyBooked: number
  weeklyShowed: number
  prevWeekShowed: number
  weeklySpend: number
  googleSpend: number
  metaSpend: number
  microsoftSpend: number
  topSource: string | null
}

function buildReportHtml(
  location: { name: string; city: string; state: string; gbp_profiles?: { avg_rating?: number | null; review_count?: number | null } | null },
  metrics: LocationMetrics,
  narrative: string,
  weekLabel: string,
  ratingUrls: Record<number, string> | null
): string {
  const trend =
    metrics.weeklyShowed > metrics.prevWeekShowed
      ? `+${metrics.weeklyShowed - metrics.prevWeekShowed} vs last week`
      : metrics.weeklyShowed < metrics.prevWeekShowed
        ? `${metrics.weeklyShowed - metrics.prevWeekShowed} vs last week`
        : 'Same as last week'

  const gbp = location.gbp_profiles as { avg_rating?: number | null; review_count?: number | null } | null

  const ratingBlock = ratingUrls
    ? `<div style="margin: 0 32px 24px; background: #eff6ff; border-radius: 8px; padding: 20px; text-align: center;">
        <p style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #1e40af;">How would you rate this week's lead quality?</p>
        <div style="display: flex; justify-content: center; gap: 8px; flex-wrap: wrap;">
          ${[1, 2, 3, 4, 5].map((r) => `<a href="${ratingUrls[r]}" style="display: inline-block; background: #1e40af; color: #fff; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600;">${r}</a>`).join('')}
        </div>
        <p style="margin: 8px 0 0; font-size: 12px; color: #64748b;">1 = poor quality &nbsp;·&nbsp; 5 = excellent quality</p>
      </div>`
    : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Weekly Marketing Summary — ${location.name}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.1);">
    <div style="background: #1e40af; padding: 24px 32px; color: #fff;">
      <p style="margin: 0 0 4px; font-size: 13px; opacity: .8;">Week of ${weekLabel}</p>
      <h1 style="margin: 0; font-size: 22px; font-weight: 700;">${location.name}</h1>
      <p style="margin: 4px 0 0; font-size: 14px; opacity: .8;">Your Weekly Marketing Summary</p>
    </div>
    <div style="display: flex; flex-wrap: wrap; gap: 1px; background: #e2e8f0; border-top: 1px solid #e2e8f0;">
      <div style="flex: 1 1 120px; background: #fff; padding: 20px; text-align: center;">
        <p style="margin: 0; font-size: 28px; font-weight: 700; color: #1e40af;">${metrics.weeklyLeads}</p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">New Leads</p>
      </div>
      <div style="flex: 1 1 120px; background: #fff; padding: 20px; text-align: center;">
        <p style="margin: 0; font-size: 28px; font-weight: 700; color: #059669;">${metrics.weeklyBooked}</p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">Consultations Booked</p>
      </div>
      <div style="flex: 1 1 120px; background: #fff; padding: 20px; text-align: center;">
        <p style="margin: 0; font-size: 28px; font-weight: 700; color: #7c3aed;">${metrics.weeklyShowed}</p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">Patients Showed <span style="font-size: 11px; color: #94a3b8;">(${trend})</span></p>
      </div>
      <div style="flex: 1 1 120px; background: #fff; padding: 20px; text-align: center;">
        <p style="margin: 0; font-size: 28px; font-weight: 700; color: #b45309;">$${metrics.weeklySpend.toFixed(0)}</p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">Total Ad Spend</p>
      </div>
    </div>
    <div style="padding: 28px 32px;">
      <h2 style="margin: 0 0 16px; font-size: 16px; color: #1e293b;">This Week at a Glance</h2>
      <div style="color: #374151; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${narrative}</div>
    </div>
    <div style="margin: 0 32px 24px; background: #f8fafc; border-radius: 8px; padding: 16px;">
      <h3 style="margin: 0 0 12px; font-size: 14px; color: #475569;">Ad Spend Breakdown</h3>
      <table style="width: 100%; font-size: 13px; color: #374151; border-collapse: collapse;">
        <tr><td style="padding: 4px 0;">Google Ads</td><td style="text-align: right;">$${metrics.googleSpend.toFixed(2)}</td></tr>
        <tr><td style="padding: 4px 0;">Microsoft (Bing) Ads</td><td style="text-align: right;">$${metrics.microsoftSpend.toFixed(2)}</td></tr>
        <tr><td style="padding: 4px 0;">Meta Ads</td><td style="text-align: right;">$${metrics.metaSpend.toFixed(2)}</td></tr>
        ${gbp?.avg_rating ? `<tr><td style="padding: 4px 0; border-top: 1px solid #e2e8f0; margin-top: 8px;">Google Rating</td><td style="text-align: right; border-top: 1px solid #e2e8f0;">&#9733; ${gbp.avg_rating} (${gbp.review_count ?? 0} reviews)</td></tr>` : ''}
      </table>
    </div>
    ${ratingBlock}
    <div style="padding: 0 32px 32px; text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://marketing-engine-roan.vercel.app'}/dashboard"
         style="display: inline-block; background: #1e40af; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
        View Full Dashboard
      </a>
    </div>
    <div style="background: #f1f5f9; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
      Powered by NuStack Marketing Engine &mdash; <a href="mailto:reports@nustack.digital" style="color: #64748b;">reports@nustack.digital</a>
    </div>
  </div>
</body>
</html>`
}
