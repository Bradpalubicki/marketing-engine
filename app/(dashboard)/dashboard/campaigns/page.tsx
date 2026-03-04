import { supabaseAdmin } from '@/lib/supabase'
import { CampaignTable } from '@/components/dashboard/CampaignTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Campaign } from '@/types'

export const dynamic = 'force-dynamic'

export default async function CampaignsPage() {
  const { data } = await supabaseAdmin
    .from('campaigns')
    .select('*, locations(name, city, state)')
    .order('created_at', { ascending: false })

  const campaigns = (data ?? []) as Campaign[]
  const googleEnabled = process.env.FEATURE_GOOGLE_ADS === 'true'
  const metaEnabled = process.env.FEATURE_META_ADS === 'true'

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
        <p className="text-gray-500 mt-1">{campaigns.length} campaigns across all locations</p>
      </div>

      {!googleEnabled && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-blue-900">Google Ads not connected</p>
            <p className="text-sm text-blue-700 mt-0.5">Set FEATURE_GOOGLE_ADS=true and add your Google Ads credentials to activate.</p>
          </div>
        </div>
      )}

      {!metaEnabled && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-indigo-900">Meta Ads not connected</p>
            <p className="text-sm text-indigo-700 mt-0.5">Set FEATURE_META_ADS=true and add your Meta credentials to activate.</p>
          </div>
        </div>
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
