import { Suspense } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { AttributionChart } from '@/components/dashboard/AttributionChart'
import { DateRangeBar } from '@/components/dashboard/DateRangeBar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, TrendingUp, DollarSign, CheckCircle, Download } from 'lucide-react'
import { format, subDays } from 'date-fns'
import type { Lead } from '@/types'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<Record<string, string>>
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const sp = await searchParams

  const defaultFrom = format(subDays(new Date(), 30), 'yyyy-MM-dd')
  const defaultTo = format(new Date(), 'yyyy-MM-dd')
  const from = sp.from ?? defaultFrom
  const to = sp.to ?? defaultTo

  const lastPeriodDays = Math.round(
    (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)
  )
  const prevFrom = format(subDays(new Date(from), lastPeriodDays), 'yyyy-MM-dd')
  const prevTo = format(subDays(new Date(from), 1), 'yyyy-MM-dd')

  const [leadsRes, prevLeadsRes, locationsRes, spendRes, abInsightsRes] = await Promise.all([
    supabaseAdmin
      .from('leads')
      .select('*')
      .gte('created_at', from + 'T00:00:00Z')
      .lte('created_at', to + 'T23:59:59Z'),
    supabaseAdmin
      .from('leads')
      .select('status, source')
      .gte('created_at', prevFrom + 'T00:00:00Z')
      .lte('created_at', prevTo + 'T23:59:59Z'),
    supabaseAdmin.from('locations').select('id, name, city, state').eq('status', 'active'),
    supabaseAdmin
      .from('spend_records')
      .select('platform, spend, location_id')
      .gte('spend_date', from)
      .lte('spend_date', to),
    // A/B variant breakdown — query landing_pages via leads join
    supabaseAdmin
      .from('leads')
      .select('landing_page_id, landing_pages(ab_variant)')
      .gte('created_at', from + 'T00:00:00Z')
      .lte('created_at', to + 'T23:59:59Z')
      .not('landing_page_id', 'is', null),
  ])

  const leads = (leadsRes.data ?? []) as Lead[]
  const prevLeads = prevLeadsRes.data ?? []
  const locations = locationsRes.data ?? []
  const spendRecords = spendRes.data ?? []

  const totalLeads = leads.length
  const booked = leads.filter(l => l.status === 'booked' || l.status === 'showed').length
  const showed = leads.filter(l => l.status === 'showed').length
  const bookingRate = totalLeads > 0 ? Math.round((booked / totalLeads) * 100) : 0
  const showRate = booked > 0 ? Math.round((showed / booked) * 100) : 0

  const leadTrend = prevLeads.length > 0
    ? Math.round(((totalLeads - prevLeads.length) / prevLeads.length) * 100)
    : 0

  // Spend metrics
  const totalSpend = spendRecords.reduce((s, r) => s + (r.spend ?? 0), 0)
  const googleSpend = spendRecords.filter(r => r.platform === 'google').reduce((s, r) => s + (r.spend ?? 0), 0)
  const microsoftSpend = spendRecords.filter(r => r.platform === 'microsoft').reduce((s, r) => s + (r.spend ?? 0), 0)
  const metaSpend = spendRecords.filter(r => r.platform === 'meta').reduce((s, r) => s + (r.spend ?? 0), 0)
  const cpl = totalLeads > 0 && totalSpend > 0 ? (totalSpend / totalLeads).toFixed(2) : null
  const costPerBooked = booked > 0 && totalSpend > 0 ? (totalSpend / booked).toFixed(2) : null

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

  // A/B variant counts via landing_pages join
  const abLeads = (abInsightsRes.data ?? []) as unknown as { landing_page_id: string | null; landing_pages: { ab_variant: string | null } | null }[]
  const abVariantCounts: Record<string, number> = {}
  abLeads.forEach(l => {
    const variant = l.landing_pages?.ab_variant
    if (variant) {
      abVariantCounts[variant] = (abVariantCounts[variant] ?? 0) + 1
    }
  })
  const hasAbData = Object.keys(abVariantCounts).length > 0

  const exportUrl = `/api/leads/export?from=${from}&to=${to}`

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1">Attribution and performance</p>
        </div>
        <Link href={exportUrl}>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </Link>
      </div>

      <Suspense fallback={<div className="h-9" />}>
        <DateRangeBar currentFrom={from} currentTo={to} />
      </Suspense>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Leads"
          value={totalLeads}
          icon={Users}
          trend={{ value: leadTrend, label: 'vs prior period' }}
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
          title="Total Ad Spend"
          value={totalSpend > 0 ? `$${totalSpend.toFixed(0)}` : '—'}
          subtitle={totalSpend > 0 ? 'All platforms' : 'Connect ad platforms'}
          icon={DollarSign}
        />
      </div>

      {totalSpend > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-500 mb-1">Cost Per Lead</p>
              <p className="text-2xl font-bold text-gray-900">{cpl ? `$${cpl}` : '—'}</p>
              <div className="mt-3 space-y-1 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>Google</span><span>${googleSpend.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Microsoft</span><span>${microsoftSpend.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Meta</span><span>${metaSpend.toFixed(0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-500 mb-1">Cost Per Booked</p>
              <p className="text-2xl font-bold text-gray-900">{costPerBooked ? `$${costPerBooked}` : '—'}</p>
              <p className="text-xs text-gray-400 mt-2">{booked} booked appointments</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-500 mb-1">Cost Per Showed</p>
              <p className="text-2xl font-bold text-gray-900">
                {showed > 0 && totalSpend > 0 ? `$${(totalSpend / showed).toFixed(2)}` : '—'}
              </p>
              <p className="text-xs text-gray-400 mt-2">{showed} appointments showed</p>
            </CardContent>
          </Card>
        </div>
      )}

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

      {hasAbData && (
        <Card>
          <CardHeader>
            <CardTitle>A/B Variant Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6 flex-wrap">
              {Object.entries(abVariantCounts).map(([variant, count]) => (
                <div key={variant} className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                  <p className="text-sm text-gray-500">Variant {variant}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Spend</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">CPL</th>
                </tr>
              </thead>
              <tbody>
                {locations.map(loc => {
                  const locLeads = leads.filter(l => l.location_id === loc.id)
                  const locBooked = locLeads.filter(l => l.status === 'booked' || l.status === 'showed').length
                  const locRate = locLeads.length > 0 ? Math.round((locBooked / locLeads.length) * 100) : 0
                  const locSpend = spendRecords.filter(r => r.location_id === loc.id).reduce((s, r) => s + (r.spend ?? 0), 0)
                  const locCpl = locLeads.length > 0 && locSpend > 0 ? `$${(locSpend / locLeads.length).toFixed(2)}` : '—'
                  return (
                    <tr key={loc.id} className="border-b border-gray-50">
                      <td className="py-3 px-4 font-medium">{loc.name}</td>
                      <td className="py-3 px-4">{locLeads.length}</td>
                      <td className="py-3 px-4">{locBooked}</td>
                      <td className="py-3 px-4">{locRate}%</td>
                      <td className="py-3 px-4">{locSpend > 0 ? `$${locSpend.toFixed(0)}` : '—'}</td>
                      <td className="py-3 px-4">{locCpl}</td>
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
