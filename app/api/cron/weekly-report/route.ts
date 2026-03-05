import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'
import { format, subDays, startOfWeek } from 'date-fns'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const resend = new Resend(process.env.RESEND_API_KEY!)

interface LocationMetrics {
  locationId: string
  locationName: string
  city: string
  state: string
  weeklyLeads: number
  weeklyBooked: number
  weeklyShowed: number
  weeklySpend: number
  googleSpend: number
  microsoftSpend: number
  metaSpend: number
  prevWeekShowed: number
  gbpRating: number | null
  gbpReviewCount: number | null
}

async function getLocationMetrics(
  locationId: string,
  weekStart: string,
  weekEnd: string,
  prevWeekStart: string,
  prevWeekEnd: string
): Promise<{
  weeklyLeads: number
  weeklyBooked: number
  weeklyShowed: number
  prevWeekShowed: number
  weeklySpend: number
  googleSpend: number
  microsoftSpend: number
  metaSpend: number
}> {
  const [leadsRes, prevLeadsRes, spendRes] = await Promise.all([
    supabaseAdmin
      .from('leads')
      .select('id, status')
      .eq('location_id', locationId)
      .gte('created_at', weekStart)
      .lte('created_at', weekEnd),
    supabaseAdmin
      .from('leads')
      .select('id, status')
      .eq('location_id', locationId)
      .gte('created_at', prevWeekStart)
      .lte('created_at', prevWeekEnd),
    supabaseAdmin
      .from('spend_records')
      .select('platform, spend')
      .eq('location_id', locationId)
      .gte('spend_date', weekStart)
      .lte('spend_date', weekEnd),
  ])

  const leads = leadsRes.data ?? []
  const prevLeads = prevLeadsRes.data ?? []
  const spendRecords = spendRes.data ?? []

  const weeklyBooked = leads.filter((l) => l.status === 'booked' || l.status === 'showed').length
  const weeklyShowed = leads.filter((l) => l.status === 'showed').length
  const prevWeekShowed = prevLeads.filter((l) => l.status === 'showed').length

  const googleSpend = spendRecords
    .filter((s) => s.platform === 'google')
    .reduce((sum, s) => sum + (s.spend ?? 0), 0)
  const microsoftSpend = spendRecords
    .filter((s) => s.platform === 'microsoft')
    .reduce((sum, s) => sum + (s.spend ?? 0), 0)
  const metaSpend = spendRecords
    .filter((s) => s.platform === 'meta')
    .reduce((sum, s) => sum + (s.spend ?? 0), 0)
  const weeklySpend = googleSpend + microsoftSpend + metaSpend

  return {
    weeklyLeads: leads.length,
    weeklyBooked,
    weeklyShowed,
    prevWeekShowed,
    weeklySpend,
    googleSpend,
    microsoftSpend,
    metaSpend,
  }
}

async function generateAINarrative(metrics: LocationMetrics): Promise<string> {
  const googleCPL =
    metrics.weeklyLeads > 0 && metrics.googleSpend > 0
      ? (metrics.googleSpend / metrics.weeklyLeads).toFixed(2)
      : 'N/A'
  const bingCPL =
    metrics.weeklyLeads > 0 && metrics.microsoftSpend > 0
      ? (metrics.microsoftSpend / metrics.weeklyLeads).toFixed(2)
      : 'N/A'

  const prompt = `You are analyzing marketing performance for a men's health clinic: ${metrics.locationName} in ${metrics.city}, ${metrics.state}.

Performance data:
- This week's new leads: ${metrics.weeklyLeads}
- This week's showed appointments: ${metrics.weeklyShowed}
- This week's ad spend: $${metrics.weeklySpend.toFixed(2)}
- Google cost per lead: $${googleCPL}
- Bing cost per lead: $${bingCPL}
- Previous week showed appointments: ${metrics.prevWeekShowed}
- GBP average rating: ${metrics.gbpRating ?? 'N/A'} (${metrics.gbpReviewCount ?? 0} reviews)

Write a 3-paragraph executive summary for the clinic owner:
1. What happened this week (plain language, no jargon)
2. What is working and what needs attention
3. One specific recommendation they can act on

Requirements:
- Never use: CPM, CTR, ROAS, CPC, impressions, quality score, ad rank
- Always use: "new patients", "consultations", "calls", "reviews"
- Positive, professional tone
- Under 250 words total`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  return content.type === 'text' ? content.text : 'Unable to generate narrative.'
}

function buildHtmlEmail(metrics: LocationMetrics, narrative: string, weekLabel: string): string {
  const trend =
    metrics.weeklyShowed > metrics.prevWeekShowed
      ? `+${metrics.weeklyShowed - metrics.prevWeekShowed} vs last week`
      : metrics.weeklyShowed < metrics.prevWeekShowed
        ? `${metrics.weeklyShowed - metrics.prevWeekShowed} vs last week`
        : 'Same as last week'

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Weekly Marketing Summary — ${metrics.locationName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.1);">

    <!-- Header -->
    <div style="background: #1e40af; padding: 24px 32px; color: #fff;">
      <p style="margin: 0 0 4px; font-size: 13px; opacity: .8;">Week of ${weekLabel}</p>
      <h1 style="margin: 0; font-size: 22px; font-weight: 700;">${metrics.locationName}</h1>
      <p style="margin: 4px 0 0; font-size: 14px; opacity: .8;">Your Weekly Marketing Summary</p>
    </div>

    <!-- Metric Cards -->
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

    <!-- AI Narrative -->
    <div style="padding: 28px 32px;">
      <h2 style="margin: 0 0 16px; font-size: 16px; color: #1e293b;">This Week at a Glance</h2>
      <div style="color: #374151; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${narrative}</div>
    </div>

    <!-- Platform Breakdown -->
    <div style="margin: 0 32px 24px; background: #f8fafc; border-radius: 8px; padding: 16px;">
      <h3 style="margin: 0 0 12px; font-size: 14px; color: #475569;">Ad Spend Breakdown</h3>
      <table style="width: 100%; font-size: 13px; color: #374151; border-collapse: collapse;">
        <tr><td style="padding: 4px 0;">Google Ads</td><td style="text-align: right;">$${metrics.googleSpend.toFixed(2)}</td></tr>
        <tr><td style="padding: 4px 0;">Microsoft (Bing) Ads</td><td style="text-align: right;">$${metrics.microsoftSpend.toFixed(2)}</td></tr>
        <tr><td style="padding: 4px 0;">Meta Ads</td><td style="text-align: right;">$${metrics.metaSpend.toFixed(2)}</td></tr>
        ${metrics.gbpRating ? `<tr><td style="padding: 4px 0; border-top: 1px solid #e2e8f0; margin-top: 8px;">Google Rating</td><td style="text-align: right; border-top: 1px solid #e2e8f0;">&#9733; ${metrics.gbpRating} (${metrics.gbpReviewCount ?? 0} reviews)</td></tr>` : ''}
      </table>
    </div>

    <!-- CTA -->
    <div style="padding: 0 32px 32px; text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://marketing-engine-roan.vercel.app'}/dashboard"
         style="display: inline-block; background: #1e40af; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
        View Full Dashboard
      </a>
    </div>

    <!-- Footer -->
    <div style="background: #f1f5f9; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
      <p style="margin: 0;">Powered by NuStack Marketing Engine &mdash; <a href="mailto:reports@nustack.digital" style="color: #64748b;">reports@nustack.digital</a></p>
    </div>
  </div>
</body>
</html>`
}

export async function GET(request: NextRequest) {
  // Cron secret guard
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const weekEnd = format(subDays(now, 1), 'yyyy-MM-dd')
  const weekStart = format(subDays(now, 7), 'yyyy-MM-dd')
  const prevWeekEnd = format(subDays(now, 8), 'yyyy-MM-dd')
  const prevWeekStart = format(subDays(now, 14), 'yyyy-MM-dd')
  const weekLabel = format(startOfWeek(now, { weekStartsOn: 1 }), 'MMMM d, yyyy')

  // Get all active locations with org admin contacts
  const { data: locations, error } = await supabaseAdmin
    .from('locations')
    .select(
      `id, name, city, state,
       organizations(
         id,
         clerk_org_id,
         name
       ),
       gbp_profiles(avg_rating, review_count)`
    )
    .eq('status', 'active')

  if (error || !locations?.length) {
    return NextResponse.json({ sent: 0, error: error?.message ?? 'No active locations' })
  }

  let sent = 0
  const errors: string[] = []

  for (const location of locations) {
    try {
      const org = (location as { organizations?: { id?: string; clerk_org_id?: string; name?: string } })
        .organizations
      const gbp = (
        location as {
          gbp_profiles?: { avg_rating?: number | null; review_count?: number | null } | null
        }
      ).gbp_profiles

      if (!org?.clerk_org_id) continue

      // Get org admin emails via Clerk API
      const clerkRes = await fetch(
        `https://api.clerk.com/v1/organizations/${org.clerk_org_id}/memberships?limit=20`,
        { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` } }
      )

      if (!clerkRes.ok) continue

      const clerkData = (await clerkRes.json()) as {
        data?: Array<{ role: string; public_user_data: { user_id: string } }>
      }

      const adminMemberIds = (clerkData.data ?? [])
        .filter((m) => m.role === 'org:admin')
        .map((m) => m.public_user_data.user_id)

      if (!adminMemberIds.length) continue

      // Fetch all admin user emails in parallel (no N+1)
      const userResults = await Promise.allSettled(
        adminMemberIds.map((userId) =>
          fetch(`https://api.clerk.com/v1/users/${userId}`, {
            headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
          }).then((r) => r.ok ? r.json() as Promise<{
            email_addresses?: Array<{ email_address: string; id: string }>
            primary_email_address_id?: string
          }> : null)
        )
      )

      const adminEmails: string[] = []
      for (const result of userResults) {
        if (result.status !== 'fulfilled' || !result.value) continue
        const user = result.value
        const primaryEmail = user.email_addresses?.find(
          (e) => e.id === user.primary_email_address_id
        )
        if (primaryEmail) adminEmails.push(primaryEmail.email_address)
      }

      if (!adminEmails.length) continue

      const metrics = await getLocationMetrics(
        location.id,
        weekStart,
        weekEnd,
        prevWeekStart,
        prevWeekEnd
      )

      const fullMetrics: LocationMetrics = {
        locationId: location.id,
        locationName: location.name,
        city: location.city,
        state: location.state,
        gbpRating: gbp?.avg_rating ?? null,
        gbpReviewCount: gbp?.review_count ?? null,
        ...metrics,
      }

      const narrative = await generateAINarrative(fullMetrics)
      const html = buildHtmlEmail(fullMetrics, narrative, weekLabel)

      for (const email of adminEmails) {
        await resend.emails.send({
          from: 'Marketing Engine <reports@nustack.digital>',
          to: email,
          subject: `Your Weekly Marketing Summary — ${location.name} — Week of ${weekLabel}`,
          html,
        })
        sent++
      }
    } catch (err) {
      errors.push(`${location.name}: ${String(err)}`)
    }
  }

  return NextResponse.json({ sent, errors: errors.length ? errors : undefined })
}
