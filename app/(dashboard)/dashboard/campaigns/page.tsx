import { supabaseAdmin } from '@/lib/supabase'
import { CampaignTable } from '@/components/dashboard/CampaignTable'
import { SpendChart } from '@/components/dashboard/SpendChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { DollarSign } from 'lucide-react'
import { format, subDays, startOfMonth } from 'date-fns'
import type { Campaign } from '@/types'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface SpendRecord {
  platform: string
  spend: number | null
  clicks: number | null
  impressions: number | null
  spend_date: string
  campaign_id: string | null
  location_id: string
}

export default async function CampaignsPage() {
  const from = format(subDays(new Date(), 30), 'yyyy-MM-dd')
  const to = format(new Date(), 'yyyy-MM-dd')
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')

  const [campaignsRes, spendRes, spendMtdRes, leadsRes] = await Promise.all([
    supabaseAdmin
      .from('campaigns')
      .select('*, locations(name, city, state)')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('spend_records')
      .select('platform, spend, clicks, impressions, spend_date, campaign_id, location_id')
      .gte('spend_date', from)
      .lte('spend_date', to),
    supabaseAdmin
      .from('spend_records')
      .select('platform, spend')
      .gte('spend_date', monthStart)
      .lte('spend_date', to),
    supabaseAdmin
      .from('leads')
      .select('location_id, utm_campaign')
      .gte('created_at', from + 'T00:00:00Z')
      .lte('created_at', to + 'T23:59:59Z'),
  ])

  const campaigns = (campaignsRes.data ?? []) as Campaign[]
  const spendRecords = (spendRes.data ?? []) as SpendRecord[]
  const spendMtd = spendMtdRes.data ?? []
  const leads = leadsRes.data ?? []

  const googleEnabled = process.env.FEATURE_GOOGLE_ADS === 'true'
  const metaEnabled = process.env.FEATURE_META_ADS === 'true'
  const microsoftEnabled = process.env.FEATURE_MICROSOFT_ADS === 'true'

  // MTD totals
  const totalMtd = spendMtd.reduce((s, r) => s + (r.spend ?? 0), 0)
  const googleMtd = spendMtd.filter(r => r.platform === 'google').reduce((s, r) => s + (r.spend ?? 0), 0)
  const microsoftMtd = spendMtd.filter(r => r.platform === 'microsoft').reduce((s, r) => s + (r.spend ?? 0), 0)
  const metaMtd = spendMtd.filter(r => r.platform === 'meta').reduce((s, r) => s + (r.spend ?? 0), 0)

  // Build daily spend chart data (last 30 days)
  const dateMap: Record<string, { google: number; microsoft: number; meta: number }> = {}
  for (let i = 29; i >= 0; i--) {
    const d = format(subDays(new Date(), i), 'MMM d')
    dateMap[d] = { google: 0, microsoft: 0, meta: 0 }
  }

  spendRecords.forEach(r => {
    const label = format(new Date(r.spend_date), 'MMM d')
    if (dateMap[label]) {
      const spend = r.spend ?? 0
      if (r.platform === 'google') dateMap[label].google += spend
      else if (r.platform === 'microsoft') dateMap[label].microsoft += spend
      else if (r.platform === 'meta') dateMap[label].meta += spend
    }
  })

  const chartData = Object.entries(dateMap).map(([date, v]) => ({ date, ...v }))

  // Per-campaign metrics
  const campaignMetrics = campaigns.map(c => {
    const cSpend = spendRecords.filter(r => r.campaign_id === c.id)
    const spend = cSpend.reduce((s, r) => s + (r.spend ?? 0), 0)
    const clicks = cSpend.reduce((s, r) => s + (r.clicks ?? 0), 0)
    const impressions = cSpend.reduce((s, r) => s + (r.impressions ?? 0), 0)
    const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : null
    const campLeads = leads.filter(l => l.utm_campaign === c.name).length
    const cpl = campLeads > 0 && spend > 0 ? (spend / campLeads).toFixed(2) : null
    return { campaign: c, spend, clicks, impressions, ctr, campLeads, cpl }
  })

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
        <p className="text-gray-500 mt-1">{campaigns.length} campaigns across all locations</p>
      </div>

      {!googleEnabled && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-medium text-blue-900">Google Ads not connected</p>
          <p className="text-sm text-blue-700 mt-0.5">Set FEATURE_GOOGLE_ADS=true and add your Google Ads credentials to activate.</p>
        </div>
      )}
      {!metaEnabled && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-indigo-900">Meta Ads not connected</p>
            <p className="text-sm text-indigo-700 mt-0.5">Set FEATURE_META_ADS=true and add your Meta credentials to activate.</p>
          </div>
          <Link href="/dashboard/settings/meta" className="text-xs text-indigo-600 underline ml-4">
            Connect Meta
          </Link>
        </div>
      )}
      {!microsoftEnabled && (
        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
          <p className="font-medium text-cyan-900">Microsoft Advertising (Bing) not connected</p>
          <p className="text-sm text-cyan-700 mt-0.5">Set FEATURE_MICROSOFT_ADS=true and complete Azure App Registration OAuth to activate. Agency MCC: G120QEFZ.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total MTD Spend"
          value={totalMtd > 0 ? `$${totalMtd.toFixed(0)}` : '—'}
          subtitle="All platforms"
          icon={DollarSign}
        />
        <MetricCard
          title="Google MTD"
          value={googleMtd > 0 ? `$${googleMtd.toFixed(0)}` : '—'}
          subtitle="Google Ads"
          icon={DollarSign}
        />
        <MetricCard
          title="Microsoft MTD"
          value={microsoftMtd > 0 ? `$${microsoftMtd.toFixed(0)}` : '—'}
          subtitle="Bing Ads"
          icon={DollarSign}
        />
        <MetricCard
          title="Meta MTD"
          value={metaMtd > 0 ? `$${metaMtd.toFixed(0)}` : '—'}
          subtitle="Meta Ads"
          icon={DollarSign}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Spend by Platform — Last 30 Days</CardTitle>
        </CardHeader>
        <CardContent>
          <SpendChart data={chartData} />
        </CardContent>
      </Card>

      {campaignMetrics.some(m => m.spend > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Campaign</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Platform</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Spend (30d)</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Clicks</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Impressions</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">CTR</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Leads</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">CPL</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignMetrics.map(({ campaign: c, spend, clicks, impressions, ctr, campLeads, cpl }) => (
                    <tr key={c.id} className="border-b border-gray-50">
                      <td className="py-3 px-4 font-medium">{c.name}</td>
                      <td className="py-3 px-4 capitalize">{c.platform}</td>
                      <td className="py-3 px-4">{spend > 0 ? `$${spend.toFixed(2)}` : '—'}</td>
                      <td className="py-3 px-4">{clicks > 0 ? clicks.toLocaleString() : '—'}</td>
                      <td className="py-3 px-4">{impressions > 0 ? impressions.toLocaleString() : '—'}</td>
                      <td className="py-3 px-4">{ctr ? `${ctr}%` : '—'}</td>
                      <td className="py-3 px-4">{campLeads}</td>
                      <td className="py-3 px-4">{cpl ? `$${cpl}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Campaigns</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <CampaignTable campaigns={campaigns} />
        </CardContent>
      </Card>
    </div>
  )
}
