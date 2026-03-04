import { supabaseAdmin } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { Button } from '@/components/ui/button'
import { Download, Users, Phone, CheckCircle, TrendingUp } from 'lucide-react'
import { format, startOfMonth } from 'date-fns'
import type { Location } from '@/types'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')

  const [leadsRes, locationsRes] = await Promise.all([
    supabaseAdmin.from('leads').select('status, source, location_id').gte('created_at', monthStart),
    supabaseAdmin.from('locations').select('id, name, city, state').eq('status', 'active'),
  ])

  const leads = leadsRes.data ?? []
  const locations = (locationsRes.data ?? []) as Location[]

  const newPatients = leads.filter(l => l.status === 'showed').length
  const totalCalls = leads.filter(l => l.source === 'call').length
  const totalForms = leads.filter(l => l.source === 'form').length
  const consultations = leads.filter(l => l.status === 'booked' || l.status === 'showed').length

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monthly Report</h1>
          <p className="text-gray-500 mt-1">{format(new Date(), 'MMMM yyyy')} — Client Summary</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
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

      <Card className="border-blue-100 bg-blue-50">
        <CardContent className="p-6">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> This report shows activity from {format(startOfMonth(new Date()), 'MMMM d')} through today.
            Cost-per-patient and ROAS metrics will appear once ad platform integrations are activated.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
