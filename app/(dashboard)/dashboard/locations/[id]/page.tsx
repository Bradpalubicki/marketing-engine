import { supabaseAdmin } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CampaignTable } from '@/components/dashboard/CampaignTable'
import { LeadTable } from '@/components/dashboard/LeadTable'
import { GBPLinkCard } from '@/components/dashboard/GBPLinkCard'
import { LocationStatusCard } from '@/components/dashboard/LocationStatusCard'
import { SpendSection } from './SpendSection'
import { MapPin, Phone, Globe, Settings } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { Location, Campaign, Lead, GBPProfile, SpendRecord } from '@/types'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'success',
  pending: 'warning',
  paused: 'secondary',
  inactive: 'outline',
}

export default async function LocationDetailPage({ params }: PageProps) {
  const { id } = await params

  const [locationRes, campaignsRes, leadsRes, gbpRes, spendRes] = await Promise.all([
    supabaseAdmin.from('locations').select('*').eq('id', id).single(),
    supabaseAdmin.from('campaigns').select('*').eq('location_id', id).order('created_at', { ascending: false }),
    supabaseAdmin.from('leads').select('*').eq('location_id', id).order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('gbp_profiles').select('*').eq('location_id', id).single(),
    supabaseAdmin.from('spend_records').select('id, platform, spend_date, spend, clicks, impressions').eq('location_id', id).is('campaign_id', null).order('spend_date', { ascending: false }).limit(10),
  ])

  if (locationRes.error || !locationRes.data) {
    notFound()
  }

  const location = locationRes.data as Location
  const campaigns = (campaignsRes.data ?? []) as Campaign[]
  const leads = (leadsRes.data ?? []) as Lead[]
  const gbpProfile = gbpRes.data as GBPProfile | null
  const spendRecords = (spendRes.data ?? []) as SpendRecord[]

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{location.name}</h1>
            <Badge variant={statusColors[location.status] ?? 'secondary'}>{location.status}</Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {location.address}, {location.city}, {location.state} {location.zip}
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              {location.phone}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {location.landing_page_url && (
            <a href={location.landing_page_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <Globe className="h-3.5 w-3.5 mr-1" />
                Landing Page
              </Button>
            </a>
          )}
          <Link href={`/dashboard/settings/integrations`}>
            <Button variant="outline" size="sm">
              <Settings className="h-3.5 w-3.5 mr-1" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <LocationStatusCard locationId={location.id} currentStatus={location.status} />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Campaign Factory</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={location.campaign_factory_status === 'complete' ? 'success' : 'warning'}>
              {location.campaign_factory_status}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Monthly Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">
              {location.monthly_ad_budget ? `$${location.monthly_ad_budget.toLocaleString()}` : 'Not set'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">GBP Status</CardTitle>
          </CardHeader>
          <CardContent>
            {gbpProfile ? (
              <div>
                <Badge variant="success">Connected</Badge>
                {gbpProfile.avg_rating && (
                  <p className="text-sm text-gray-500 mt-1">
                    {gbpProfile.avg_rating.toFixed(1)} ★ ({gbpProfile.review_count} reviews)
                  </p>
                )}
              </div>
            ) : (
              <Badge variant="secondary">Not connected</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      <GBPLinkCard locationId={location.id} currentGbpLocationId={location.gbp_location_id ?? null} />

      <Card>
        <CardHeader>
          <CardTitle>Active Campaigns ({campaigns.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <CampaignTable campaigns={campaigns} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Leads</CardTitle>
            <Link href={`/dashboard/leads?location=${id}`} className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <LeadTable leads={leads} />
        </CardContent>
      </Card>

      <SpendSection locationId={location.id} initialRecords={spendRecords} />
    </div>
  )
}
