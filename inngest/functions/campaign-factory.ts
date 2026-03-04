import { inngest } from '../client'
import { supabaseAdmin } from '@/lib/supabase'
import { generateRSACopy, generateMetaCopy } from '@/lib/ad-copy-generator'

export const campaignFactory = inngest.createFunction(
  { id: 'campaign-factory', name: 'Campaign Factory' },
  { event: 'location/activated' },
  async ({ event, step }) => {
    const { locationId, locationName, city, orgId, googleCustomerId, metaAdAccountId } =
      event.data as {
        locationId: string
        locationName: string
        city: string
        orgId: string
        googleCustomerId?: string
        metaAdAccountId?: string
      }

    await supabaseAdmin
      .from('locations')
      .update({ campaign_factory_status: 'running' })
      .eq('id', locationId)

    if (process.env.FEATURE_GOOGLE_ADS === 'true' && googleCustomerId) {
      await step.run('create-google-campaigns', async () => {
        const copy = await generateRSACopy(locationName, 'mens health')

        await supabaseAdmin.from('campaigns').insert({
          location_id: locationId,
          platform: 'google',
          name: `${locationName} - Search - Men's Health`,
          type: 'search',
          status: 'paused',
          bidding_strategy: 'TARGET_CPA',
        })

        return { created: true, headlines: copy.headlines.length, copy }
      })
    } else {
      await step.run('log-google-skip', async () => {
        await supabaseAdmin.from('campaigns').insert({
          location_id: locationId,
          platform: 'google',
          name: `${locationName} - Search - Men's Health [PENDING ACTIVATION]`,
          type: 'search',
          status: 'paused',
          bidding_strategy: 'TARGET_CPA',
        })
        return { skipped: true, reason: 'Google Ads feature flag disabled' }
      })
    }

    if (process.env.FEATURE_META_ADS === 'true' && metaAdAccountId) {
      await step.run('create-meta-campaigns', async () => {
        const copy = await generateMetaCopy(locationName, 'mens health')

        await supabaseAdmin.from('campaigns').insert({
          location_id: locationId,
          platform: 'meta',
          name: `${locationName} - Meta - Lead Gen`,
          type: 'lead_gen',
          status: 'paused',
          bidding_strategy: 'LOWEST_COST',
        })

        return { created: true, copy }
      })
    } else {
      await step.run('log-meta-skip', async () => {
        await supabaseAdmin.from('campaigns').insert({
          location_id: locationId,
          platform: 'meta',
          name: `${locationName} - Meta - Lead Gen [PENDING ACTIVATION]`,
          type: 'lead_gen',
          status: 'paused',
          bidding_strategy: 'LOWEST_COST',
        })
        return { skipped: true, reason: 'Meta Ads feature flag disabled' }
      })
    }

    await supabaseAdmin
      .from('locations')
      .update({ campaign_factory_status: 'complete' })
      .eq('id', locationId)

    return { success: true, locationId, locationName, orgId, city }
  }
)
