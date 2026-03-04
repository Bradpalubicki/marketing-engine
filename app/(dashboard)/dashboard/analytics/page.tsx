import { supabaseAdmin } from '@/lib/supabase'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { AttributionChart } from '@/components/dashboard/AttributionChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, TrendingUp, DollarSign, CheckCircle } from 'lucide-react'
import { format, startOfMonth, subMonths } from 'date-fns'
import type { Lead } from '@/types'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const lastMonthStart = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd')
  const lastMonthEnd = format(new Date(startOfMonth(new Date()).getTime() - 1), 'yyyy-MM-dd')

  const [leadsRes, lastMonthLeadsRes, locationsRes] = await Promise.all([
    supabaseAdmin.from('leads').select('*').gte('created_at', monthStart),
    supabaseAdmin.from('leads').select('status, source').gte('created_at', lastMonthStart).lte('created_at', lastMonthEnd),
    supabaseAdmin.from('locations').select('id, name, city, state').eq('status', 'active'),
  ])

  const leads = (leadsRes.data ?? []) as Lead[]
  const lastMonthLeads = lastMonthLeadsRes.data ?? []
  const locations = locationsRes.data ?? []

  const totalLeads = leads.length
  const booked = leads.filter(l => l.status === 'booked' || l.status === 'showed').length
  const showed = leads.filter(l => l.status === 'showed').length
  const bookingRate = totalLeads > 0 ? Math.round((booked / totalLeads) * 100) : 0
  const showRate = booked > 0 ? Math.round((showed / booked) * 100) : 0

  const leadTrend = lastMonthLeads.length > 0
    ? Math.round(((totalLeads - lastMonthLeads.length) / lastMonthLeads.length) * 100)
    : 0

  const sourceData = locations.map(loc => {
    const locLeads = leads.filter(l => l.location_id === loc.id)
    return {
      name: loc.city,
      form: locLeads.filter(l => l.source === 'form').length,
      call: locLeads.filter(l => l.source === 'call').length,
      chat: locLeads.filter(l => l.source === 'chat').length,
    }
  })

  const statusPieData = [
    { name: 'New', value: leads.filter(l => l.status === 'new').length },
    { name: 'Contacted', value: leads.filter(l => l.status === 'contacted').length },
    { name: 'Booked', value: leads.filter(l => l.status === 'booked').length },
    { name: 'Showed', value: leads.filter(l => l.status === 'showed').length },
    { name: 'No Show', value: leads.filter(l => l.status === 'no_showed').length },
  ].filter(d => d.value > 0)

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Attribution and performance — {format(new Date(), 'MMMM yyyy')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Leads"
          value={totalLeads}
          icon={Users}
          trend={{ value: leadTrend, label: 'vs last month' }}
        />
        <MetricCard
          title="Booking Rate"
          value={`${bookingRate}%`}
          subtitle={`${booked} booked`}
          icon={CheckCircle}
        />
        <MetricCard
          title="Show Rate"
          value={`${showRate}%`}
          subtitle={`${showed} showed`}
          icon={TrendingUp}
        />
        <MetricCard
          title="Revenue (MTD)"
          value="—"
          subtitle="Connect ad platforms"
          icon={DollarSign}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Leads by Source & Location</CardTitle>
          </CardHeader>
          <CardContent>
            <AttributionChart type="bar" data={sourceData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <AttributionChart type="pie" data={statusPieData} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Location Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Location</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Total Leads</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Booked</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Booking Rate</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Form</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Call</th>
                </tr>
              </thead>
              <tbody>
                {locations.map(loc => {
                  const locLeads = leads.filter(l => l.location_id === loc.id)
                  const locBooked = locLeads.filter(l => l.status === 'booked' || l.status === 'showed').length
                  const locRate = locLeads.length > 0 ? Math.round((locBooked / locLeads.length) * 100) : 0
                  return (
                    <tr key={loc.id} className="border-b border-gray-50">
                      <td className="py-3 px-4 font-medium">{loc.name}</td>
                      <td className="py-3 px-4">{locLeads.length}</td>
                      <td className="py-3 px-4">{locBooked}</td>
                      <td className="py-3 px-4">{locRate}%</td>
                      <td className="py-3 px-4">{locLeads.filter(l => l.source === 'form').length}</td>
                      <td className="py-3 px-4">{locLeads.filter(l => l.source === 'call').length}</td>
                    </tr>
                  )
                })}
                {locations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">No active locations</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
