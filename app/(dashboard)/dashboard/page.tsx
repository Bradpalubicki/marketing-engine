import { supabaseAdmin } from '@/lib/supabase'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { LeadTable } from '@/components/dashboard/LeadTable'
import { LocationCard } from '@/components/dashboard/LocationCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, MapPin, TrendingUp, CheckCircle, Lightbulb } from 'lucide-react'
import { format, startOfMonth } from 'date-fns'
import type { Lead, Location } from '@/types'

export const dynamic = 'force-dynamic'

interface AIInsight {
  id: string
  location_id: string | null
  week_start: string
  week_end: string
  insights_text: string
  created_at: string
}

export default async function DashboardPage() {
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')

  const [locationsRes, leadsRes, recentLeadsRes, insightsRes] = await Promise.all([
    supabaseAdmin.from('locations').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('leads').select('status, location_id').gte('created_at', monthStart),
    supabaseAdmin.from('leads').select('*').order('created_at', { ascending: false }).limit(10),
    supabaseAdmin
      .from('ai_insights')
      .select('id, location_id, week_start, week_end, insights_text, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const locations = (locationsRes.data ?? []) as Location[]
  const leads = leadsRes.data ?? []
  const recentLeads = (recentLeadsRes.data ?? []) as Lead[]
  const allInsights = (insightsRes.data ?? []) as AIInsight[]

  const activeLocations = locations.filter(l => l.status === 'active').length
  const totalLeads = leads.length
  const booked = leads.filter(l => l.status === 'booked' || l.status === 'showed').length
  const bookingRate = totalLeads > 0 ? Math.round((booked / totalLeads) * 100) : 0

  const leadsByLocation: Record<string, number> = {}
  leads.forEach(l => {
    leadsByLocation[l.location_id] = (leadsByLocation[l.location_id] ?? 0) + 1
  })

  // Get latest insight per location
  const latestInsightByLocation: Record<string, AIInsight> = {}
  allInsights.forEach(insight => {
    if (insight.location_id && !latestInsightByLocation[insight.location_id]) {
      latestInsightByLocation[insight.location_id] = insight
    }
  })
  const hasInsights = Object.keys(latestInsightByLocation).length > 0

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Patient acquisition overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Locations"
          value={activeLocations}
          subtitle={`${locations.length} total locations`}
          icon={MapPin}
        />
        <MetricCard
          title="Leads This Month"
          value={totalLeads}
          subtitle={format(new Date(), 'MMMM yyyy')}
          icon={Users}
        />
        <MetricCard
          title="Booking Rate"
          value={`${bookingRate}%`}
          subtitle={`${booked} booked this month`}
          icon={CheckCircle}
        />
        <MetricCard
          title="Top Location"
          value={locations[0]?.name ?? '—'}
          subtitle="Most recent location"
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Leads</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <LeadTable leads={recentLeads} />
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Locations</h2>
          <div className="space-y-3">
            {locations.slice(0, 5).map(location => (
              <LocationCard
                key={location.id}
                location={location}
                leadsThisMonth={leadsByLocation[location.id] ?? 0}
              />
            ))}
            {locations.length === 0 && (
              <p className="text-sm text-gray-400">No locations yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* AI Insights Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-gray-900">AI Insights</h2>
        </div>

        {!hasInsights ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-400">
                First insights generate after 7 days of data. Weekly AI analysis runs every Sunday at midnight.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {locations.filter(l => l.status === 'active').map(loc => {
              const insight = latestInsightByLocation[loc.id]
              if (!insight) return null
              const snippet = insight.insights_text.slice(0, 280) + (insight.insights_text.length > 280 ? '...' : '')
              return (
                <Card key={loc.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm font-semibold">{loc.name}</CardTitle>
                      <span className="text-xs text-gray-400">
                        Week of {format(new Date(insight.week_start + 'T00:00:00'), 'MMM d')}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 leading-relaxed">{snippet}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
