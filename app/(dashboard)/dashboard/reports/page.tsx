import { supabaseAdmin } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { SendReportButton, ReportScheduleRow } from './ReportActions'
import { Users, Phone, CheckCircle, TrendingUp } from 'lucide-react'
import { format, startOfMonth, subWeeks } from 'date-fns'
import type { Location } from '@/types'

export const dynamic = 'force-dynamic'

interface AIInsight {
  id: string
  location_id: string | null
  week_start: string
  week_end: string
  insights_text: string
  created_at: string
}

interface LocationWithReport extends Location {
  weekly_report_enabled: boolean | null
}

export default async function ReportsPage() {
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const fourWeeksAgo = format(subWeeks(new Date(), 4), 'yyyy-MM-dd')

  const [leadsRes, locationsRes, insightsRes] = await Promise.all([
    supabaseAdmin.from('leads').select('status, source, location_id').gte('created_at', monthStart),
    supabaseAdmin.from('locations').select('id, name, city, state, weekly_report_enabled').eq('status', 'active'),
    supabaseAdmin
      .from('ai_insights')
      .select('id, location_id, week_start, week_end, insights_text, created_at')
      .gte('week_start', fourWeeksAgo)
      .order('week_start', { ascending: false })
      .limit(20),
  ])

  const leads = leadsRes.data ?? []
  const locations = (locationsRes.data ?? []) as LocationWithReport[]
  const insights = (insightsRes.data ?? []) as AIInsight[]

  const newPatients = leads.filter(l => l.status === 'showed').length
  const totalCalls = leads.filter(l => l.source === 'call').length
  const totalForms = leads.filter(l => l.source === 'form').length
  const consultations = leads.filter(l => l.status === 'booked' || l.status === 'showed').length

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monthly Report</h1>
          <p className="text-gray-500 mt-1">{format(new Date(), 'MMMM yyyy')} &mdash; Client Summary</p>
        </div>
        <SendReportButton />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="New Patients"
          value={newPatients}
          subtitle="Showed for appointment"
          icon={Users}
        />
        <MetricCard
          title="Consultations Booked"
          value={consultations}
          subtitle="This month"
          icon={CheckCircle}
        />
        <MetricCard
          title="Calls Received"
          value={totalCalls}
          subtitle="From tracking numbers"
          icon={Phone}
        />
        <MetricCard
          title="Web Inquiries"
          value={totalForms}
          subtitle="Form submissions"
          icon={TrendingUp}
        />
      </div>

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

      {/* Past Reports from AI Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Past Weekly Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {insights.map(insight => (
              <div key={insight.id} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Week of {format(new Date(insight.week_start + 'T00:00:00'), 'MMMM d, yyyy')}
                  </span>
                  <span className="text-xs text-gray-400">
                    {insight.location_id
                      ? (locations.find(l => l.id === insight.location_id)?.name ?? 'Unknown location')
                      : 'All locations'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                  {insight.insights_text.slice(0, 320)}{insight.insights_text.length > 320 ? '...' : ''}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {insights.length === 0 && (
        <Card className="border-blue-100 bg-blue-50">
          <CardContent className="p-6">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This report shows activity from {format(startOfMonth(new Date()), 'MMMM d')} through today.
              Weekly AI insights appear here after the first Sunday report runs.
              Cost-per-patient and ROAS metrics will appear once ad platform integrations are activated.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
