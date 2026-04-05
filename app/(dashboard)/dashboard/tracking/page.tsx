import { supabaseAdmin } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format, subDays, subHours } from 'date-fns'
import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PLATFORMS = ['google', 'meta', 'microsoft'] as const
type Platform = (typeof PLATFORMS)[number]

const PLATFORM_LABELS: Record<Platform, string> = {
  google: 'Google Ads',
  meta: 'Meta Ads',
  microsoft: 'Microsoft (Bing) Ads',
}

type ConversionStatus = 'firing' | 'not_firing' | 'unknown'

interface PlatformStatus {
  platform: Platform
  status: ConversionStatus
  lastFired: string | null
  conversionsLast24h: number
}

interface LocationTrackingStatus {
  locationId: string
  locationName: string
  city: string
  state: string
  hasHistory: boolean
  platforms: PlatformStatus[]
}

function StatusBadge({ status }: { status: ConversionStatus }) {
  if (status === 'firing') {
    return (
      <Badge className="bg-green-50 text-green-700 border-green-200 gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Firing
      </Badge>
    )
  }
  if (status === 'not_firing') {
    return (
      <Badge className="bg-red-50 text-red-700 border-red-200 gap-1">
        <XCircle className="h-3 w-3" />
        Not Firing
      </Badge>
    )
  }
  return (
    <Badge className="bg-gray-50 text-gray-500 border-gray-200 gap-1">
      <HelpCircle className="h-3 w-3" />
      Unknown
    </Badge>
  )
}

export default async function TrackingPage() {
  const now = new Date()
  const last24h = subHours(now, 24).toISOString()
  const last60Days = format(subDays(now, 60), 'yyyy-MM-dd')

  // Fetch all active locations
  const { data: locations } = await supabaseAdmin
    .from('locations')
    .select('id, name, city, state')
    .eq('status', 'active')
    .order('name')

  if (!locations?.length) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Conversion Health</h1>
        <p className="text-gray-500">No active locations found.</p>
      </div>
    )
  }

  // Fetch snapshot data: last 24h conversions per location+platform
  const locationIds = locations.map((l) => l.id)

  const { data: recentSnapshots } = await supabaseAdmin
    .from('sem_platform_daily_snapshots')
    .select('location_id, platform, conversions, snapshot_date, created_at')
    .in('location_id', locationIds)
    .gte('created_at', last24h)

  // Fetch oldest snapshot per location to determine if they have 60+ days history
  const { data: historyCheck } = await supabaseAdmin
    .from('sem_platform_daily_snapshots')
    .select('location_id, snapshot_date')
    .in('location_id', locationIds)
    .order('snapshot_date', { ascending: true })
    .limit(locationIds.length * 3)

  // Fetch last fired timestamp per location+platform (most recent snapshot with conversions > 0)
  const { data: lastFiredSnapshots } = await supabaseAdmin
    .from('sem_platform_daily_snapshots')
    .select('location_id, platform, snapshot_date, conversions')
    .in('location_id', locationIds)
    .gt('conversions', 0)
    .order('snapshot_date', { ascending: false })

  // Build per-location history map
  const oldestSnapshotByLocation: Record<string, string> = {}
  for (const snap of historyCheck ?? []) {
    if (!oldestSnapshotByLocation[snap.location_id]) {
      oldestSnapshotByLocation[snap.location_id] = snap.snapshot_date
    }
  }

  // Build last-fired map: location_id → platform → { date, conversions }
  const lastFiredMap: Record<string, Record<string, { date: string; conversions: number }>> = {}
  for (const snap of lastFiredSnapshots ?? []) {
    if (!lastFiredMap[snap.location_id]) lastFiredMap[snap.location_id] = {}
    if (!lastFiredMap[snap.location_id][snap.platform]) {
      lastFiredMap[snap.location_id][snap.platform] = {
        date: snap.snapshot_date,
        conversions: Number(snap.conversions),
      }
    }
  }

  // Build 24h conversion totals map
  const conversions24hMap: Record<string, Record<string, number>> = {}
  for (const snap of recentSnapshots ?? []) {
    if (!conversions24hMap[snap.location_id]) conversions24hMap[snap.location_id] = {}
    conversions24hMap[snap.location_id][snap.platform] =
      (conversions24hMap[snap.location_id][snap.platform] ?? 0) + Number(snap.conversions ?? 0)
  }

  // Check if location has any snapshots at all
  const allLocationIds = new Set((historyCheck ?? []).map((s) => s.location_id))

  // Build final status per location
  const locationStatuses: LocationTrackingStatus[] = locations.map((loc) => {
    const hasAnySnapshots = allLocationIds.has(loc.id)
    const oldest = oldestSnapshotByLocation[loc.id]
    const hasHistory = hasAnySnapshots && oldest ? oldest <= last60Days : false

    const platforms: PlatformStatus[] = PLATFORMS.map((platform) => {
      const conv24h = conversions24hMap[loc.id]?.[platform] ?? 0
      const lastFired = lastFiredMap[loc.id]?.[platform] ?? null

      let status: ConversionStatus
      if (!hasAnySnapshots) {
        status = 'unknown'
      } else if (conv24h > 0) {
        status = 'firing'
      } else {
        // Has snapshots for this location but zero conversions in last 24h on this platform
        const hadAnyForPlatform = !!lastFiredMap[loc.id]?.[platform]
        status = hadAnyForPlatform ? 'not_firing' : 'unknown'
      }

      return {
        platform,
        status,
        lastFired: lastFired?.date ?? null,
        conversionsLast24h: conv24h,
      }
    })

    return {
      locationId: loc.id,
      locationName: loc.name,
      city: loc.city,
      state: loc.state,
      hasHistory,
      platforms,
    }
  })

  const totalFiring = locationStatuses.flatMap((l) => l.platforms).filter((p) => p.status === 'firing').length
  const totalNotFiring = locationStatuses.flatMap((l) => l.platforms).filter((p) => p.status === 'not_firing').length

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Conversion Health</h1>
        <p className="text-gray-500 mt-1">
          Per-platform conversion tracking status — updated from daily snapshot data
        </p>
      </div>

      {/* Summary badges */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="text-sm font-semibold text-green-700">{totalFiring} Firing</span>
        </div>
        {totalNotFiring > 0 && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <XCircle className="h-5 w-5 text-red-600" />
            <span className="text-sm font-semibold text-red-700">{totalNotFiring} Not Firing</span>
          </div>
        )}
      </div>

      {locationStatuses.map((loc) => (
        <Card key={loc.locationId}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {loc.locationName}
              <span className="text-sm font-normal text-gray-400 ml-2">
                {loc.city}, {loc.state}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!loc.hasHistory && (
              <p className="text-sm text-gray-400 italic mb-4">
                No data yet — conversion history builds after 60 days of platform snapshot ingestion.
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Platform</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Status</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Conversions (last 24h)</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Last Fired</th>
                  </tr>
                </thead>
                <tbody>
                  {loc.platforms.map((p) => (
                    <tr key={p.platform} className="border-b border-gray-50">
                      <td className="py-2 px-3 font-medium">{PLATFORM_LABELS[p.platform]}</td>
                      <td className="py-2 px-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="py-2 px-3 text-gray-600">
                        {p.status === 'unknown' ? '—' : p.conversionsLast24h}
                      </td>
                      <td className="py-2 px-3 text-gray-400 text-xs">
                        {p.lastFired
                          ? format(new Date(p.lastFired + 'T00:00:00'), 'MMM d, yyyy')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
