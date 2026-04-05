import { supabaseAdmin } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { SendReportButton, ReportScheduleRow } from './ReportActions'
import { Users, Phone, CheckCircle, TrendingUp, Star } from 'lucide-react'
import { format, startOfMonth, subWeeks, subDays } from 'date-fns'
import type { Location } from '@/types'

export const dynamic = 'force-dynamic'

interface LocationWithReport extends Location {
  weekly_report_enabled: boolean | null
}

interface WeeklyReport {
  id: string
  location_id: string | null
  org_id: string
  week_date: string
  report_html: string
  quality_rating_token: string | null
  sent_at: string
}

export default async function ReportsPage() {
  const now = new Date()
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const thisWeekStart = format(subDays(now, 7), 'yyyy-MM-dd')
  const lastWeekStart = format(subDays(now, 14), 'yyyy-MM-dd')
  const lastWeekEnd = format(subDays(now, 8), 'yyyy-MM-dd')
  const thirtyDaysAgo = format(subDays(now, 30), 'yyyy-MM-dd')
  const fourWeeksAgo = format(subWeeks(now, 4), 'yyyy-MM-dd')

  const [
    leadsRes,
    locationsRes,
    weeklyReportsRes,
    thisWeekLeadsRes,
    lastWeekLeadsRes,
    thirtyDayLeadsRes,
    thisWeekSpendRes,
    lastWeekSpendRes,
    thirtyDaySpendRes,
    topKeywordRes,
    qualityRatingsRes,
  ] = await Promise.all([
    // Monthly leads for metrics cards + performance table
    supabaseAdmin.from('leads').select('status, source, location_id').gte('created_at', monthStart),
    // Active locations
    supabaseAdmin.from('locations').select('id, name, city, state, weekly_report_enabled').eq('status', 'active'),
    // Latest weekly report per location
    supabaseAdmin
      .from('sem_weekly_reports')
      .select('id, location_id, org_id, week_date, report_html, quality_rating_token, sent_at')
      .gte('week_date', fourWeeksAgo)
      .order('week_date', { ascending: false })
      .limit(50),
    // This week leads (for trend)
    supabaseAdmin.from('leads').select('id, status').gte('created_at', thisWeekStart + 'T00:00:00Z'),
    // Last week leads (for trend)
    supabaseAdmin.from('leads').select('id, status')
      .gte('created_at', lastWeekStart + 'T00:00:00Z')
      .lte('created_at', lastWeekEnd + 'T23:59:59Z'),
    // 30-day leads (for trend)
    supabaseAdmin.from('leads').select('id, status').gte('created_at', thirtyDaysAgo + 'T00:00:00Z'),
    // This week spend
    supabaseAdmin.from('spend_records').select('spend, clicks').gte('spend_date', thisWeekStart),
    // Last week spend
    supabaseAdmin.from('spend_records').select('spend, clicks')
      .gte('spend_date', lastWeekStart)
      .lte('spend_date', lastWeekEnd),
    // 30-day spend
    supabaseAdmin.from('spend_records').select('spend, clicks').gte('spend_date', thirtyDaysAgo),
    // Top keyword by lowest CPL from platform snapshots (last 30 days)
    supabaseAdmin
      .from('sem_platform_daily_snapshots')
      .select('keyword, spend, conversions')
      .gte('snapshot_date', thirtyDaysAgo)
      .not('keyword', 'is', null)
      .gt('conversions', 0),
    // Latest quality ratings
    supabaseAdmin
      .from('leads_quality_ratings')
      .select('org_id, week_date, rating, submitted_at')
      .order('submitted_at', { ascending: false })
      .limit(10),
  ])

  const leads = leadsRes.data ?? []
  const locations = (locationsRes.data ?? []) as LocationWithReport[]
  const weeklyReports = (weeklyReportsRes.data ?? []) as WeeklyReport[]
  const qualityRatings = qualityRatingsRes.data ?? []

  // Metric card values
  const newPatients = leads.filter(l => l.status === 'showed').length
  const totalCalls = leads.filter(l => l.source === 'call').length
  const totalForms = leads.filter(l => l.source === 'form').length
  const consultations = leads.filter(l => l.status === 'booked' || l.status === 'showed').length

  // Trend table calculations
  const sumSpend = (rows: { spend?: number | string | null }[]) =>
    rows.reduce((s, r) => s + (Number(r.spend) || 0), 0)
  const sumClicks = (rows: { clicks?: number | null }[]) =>
    rows.reduce((s, r) => s + (Number(r.clicks) || 0), 0)

  const thisWeekLeads = thisWeekLeadsRes.data ?? []
  const lastWeekLeads = lastWeekLeadsRes.data ?? []
  const thirtyDayLeads = thirtyDayLeadsRes.data ?? []

  const thisWeekSpend = sumSpend(thisWeekSpendRes.data ?? [])
  const lastWeekSpend = sumSpend(lastWeekSpendRes.data ?? [])
  const thirtyDaySpend = sumSpend(thirtyDaySpendRes.data ?? [])

  const thisWeekClicks = sumClicks(thisWeekSpendRes.data ?? [])
  const lastWeekClicks = sumClicks(lastWeekSpendRes.data ?? [])
  const thirtyDayClicks = sumClicks(thirtyDaySpendRes.data ?? [])

  const cpl = (leads: number, spend: number) =>
    leads > 0 && spend > 0 ? `$${(spend / leads).toFixed(2)}` : '—'
  const ctr = (clicks: number) =>
    clicks > 0 ? `${clicks.toLocaleString()} clicks` : '—'

  const trendRows = [
    {
      label: 'Leads',
      thisWeek: thisWeekLeads.length,
      lastWeek: lastWeekLeads.length,
      avg30: Math.round(thirtyDayLeads.length / 4.3),
    },
    {
      label: 'CPL',
      thisWeek: cpl(thisWeekLeads.length, thisWeekSpend),
      lastWeek: cpl(lastWeekLeads.length, lastWeekSpend),
      avg30: cpl(Math.round(thirtyDayLeads.length / 4.3), thirtyDaySpend / 4.3),
    },
    {
      label: 'CTR (clicks)',
      thisWeek: ctr(thisWeekClicks),
      lastWeek: ctr(lastWeekClicks),
      avg30: ctr(Math.round(thirtyDayClicks / 4.3)),
    },
    {
      label: 'Ad Spend',
      thisWeek: thisWeekSpend > 0 ? `$${thisWeekSpend.toFixed(0)}` : '—',
      lastWeek: lastWeekSpend > 0 ? `$${lastWeekSpend.toFixed(0)}` : '—',
      avg30: thirtyDaySpend > 0 ? `$${(thirtyDaySpend / 4.3).toFixed(0)}/wk` : '—',
    },
  ]

  // Top keyword by CPL
  const keywordSnaps = topKeywordRes.data ?? []
  const keywordAgg: Record<string, { spend: number; conversions: number }> = {}
  for (const snap of keywordSnaps) {
    if (!snap.keyword) continue
    if (!keywordAgg[snap.keyword]) keywordAgg[snap.keyword] = { spend: 0, conversions: 0 }
    keywordAgg[snap.keyword].spend += Number(snap.spend) || 0
    keywordAgg[snap.keyword].conversions += Number(snap.conversions) || 0
  }
  const topKeyword = Object.entries(keywordAgg)
    .filter(([, v]) => v.conversions > 0)
    .map(([keyword, v]) => ({ keyword, cpl: v.spend / v.conversions }))
    .sort((a, b) => a.cpl - b.cpl)[0] ?? null

  // Latest weekly report per location (most recent week_date)
  const latestReportByLocation: Record<string, WeeklyReport> = {}
  for (const report of weeklyReports) {
    const key = report.location_id ?? 'all'
    if (!latestReportByLocation[key]) latestReportByLocation[key] = report
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monthly Report</h1>
          <p className="text-gray-500 mt-1">{format(now, 'MMMM yyyy')} &mdash; Client Summary</p>
        </div>
        <SendReportButton />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="New Patients" value={newPatients} subtitle="Showed for appointment" icon={Users} />
        <MetricCard title="Consultations Booked" value={consultations} subtitle="This month" icon={CheckCircle} />
        <MetricCard title="Calls Received" value={totalCalls} subtitle="From tracking numbers" icon={Phone} />
        <MetricCard title="Web Inquiries" value={totalForms} subtitle="Form submissions" icon={TrendingUp} />
      </div>

      {/* Trend table: this week / last week / 30-day avg */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Trend</CardTitle>
          <p className="text-sm text-gray-500">This week vs last week vs 30-day weekly average</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Metric</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">This Week</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Last Week</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">30-Day Avg / Week</th>
                </tr>
              </thead>
              <tbody>
                {trendRows.map(row => (
                  <tr key={row.label} className="border-b border-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-700">{row.label}</td>
                    <td className="py-3 px-4">{String(row.thisWeek)}</td>
                    <td className="py-3 px-4 text-gray-500">{String(row.lastWeek)}</td>
                    <td className="py-3 px-4 text-gray-400">{String(row.avg30)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Top keyword by CPL */}
      {topKeyword && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Keyword</CardTitle>
            <p className="text-sm text-gray-500">Lowest CPL from platform snapshot data (last 30 days)</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xl font-bold text-gray-900">{topKeyword.keyword}</p>
                <p className="text-sm text-gray-500 mt-1">CPL: ${topKeyword.cpl.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance by Location */}
      <Card>
        <CardHeader>
          <CardTitle>Performance by Location</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Location</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">New Inquiries</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Consultations</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">New Patients</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Conversion Rate</th>
                </tr>
              </thead>
              <tbody>
                {locations.map(loc => {
                  const locLeads = leads.filter(l => l.location_id === loc.id)
                  const locConsults = locLeads.filter(l => l.status === 'booked' || l.status === 'showed').length
                  const locPatients = locLeads.filter(l => l.status === 'showed').length
                  const convRate = locLeads.length > 0 ? Math.round((locPatients / locLeads.length) * 100) : 0
                  return (
                    <tr key={loc.id} className="border-b border-gray-50">
                      <td className="py-3 px-4 font-medium">{loc.name}</td>
                      <td className="py-3 px-4">{locLeads.length}</td>
                      <td className="py-3 px-4">{locConsults}</td>
                      <td className="py-3 px-4">{locPatients}</td>
                      <td className="py-3 px-4">{convRate}%</td>
                    </tr>
                  )
                })}
                {locations.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">No active locations</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Latest weekly report sent per location */}
      {Object.keys(latestReportByLocation).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Latest Weekly Report Sent</CardTitle>
            <p className="text-sm text-gray-500">Most recent report sent per location</p>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Location</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Week Of</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Sent</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Lead Quality Rating</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(latestReportByLocation).map(([key, report]) => {
                  const loc = locations.find(l => l.id === report.location_id)
                  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
                  return (
                    <tr key={key} className="border-b border-gray-50">
                      <td className="py-3 px-4 font-medium">{loc?.name ?? 'All locations'}</td>
                      <td className="py-3 px-4">
                        {format(new Date(report.week_date + 'T00:00:00'), 'MMM d, yyyy')}
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {format(new Date(report.sent_at), 'MMM d, h:mma')}
                      </td>
                      <td className="py-3 px-4">
                        {report.quality_rating_token ? (
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(r => {
                              const href = `${appUrl}/api/leads/rate-quality?token=${report.quality_rating_token}&rating=${r}`
                              return (
                                <a
                                  key={r}
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded border border-blue-200 transition-colors"
                                  title={`Rate ${r}/5`}
                                >
                                  <Star className="h-3 w-3" />
                                  {r}
                                </a>
                              )
                            })}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Token not available</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Lead quality ratings received */}
      {qualityRatings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Lead Quality Ratings Received</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Week</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Rating</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {qualityRatings.map(qr => (
                  <tr key={`${qr.org_id}-${qr.week_date}`} className="border-b border-gray-50">
                    <td className="py-3 px-4">
                      {format(new Date(qr.week_date + 'T00:00:00'), 'MMM d, yyyy')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: qr.rating }).map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        ))}
                        {Array.from({ length: 5 - qr.rating }).map((_, i) => (
                          <Star key={i} className="h-4 w-4 text-gray-200" />
                        ))}
                        <span className="text-xs text-gray-500 ml-1">{qr.rating}/5</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-xs">
                      {format(new Date(qr.submitted_at), 'MMM d, h:mma')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Weekly Report Schedule */}
      {locations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Report Schedule</CardTitle>
            <p className="text-sm text-gray-500">Weekly reports are sent every Monday at 8am to org admins.</p>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Location</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Weekly Report</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Schedule</th>
                </tr>
              </thead>
              <tbody>
                {locations.map(loc => (
                  <ReportScheduleRow key={loc.id} location={loc} />
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {weeklyReports.length === 0 && (
        <Card className="border-blue-100 bg-blue-50">
          <CardContent className="p-6">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This report shows activity from {format(startOfMonth(now), 'MMMM d')} through today.
              Weekly reports appear here after the first Monday report runs.
              Cost-per-patient and ROAS metrics will appear once ad platform integrations are activated.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
