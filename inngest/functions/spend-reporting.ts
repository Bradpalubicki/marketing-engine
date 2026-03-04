import { inngest } from '../client'
import { supabaseAdmin } from '@/lib/supabase'
import { getCampaignSpend } from '@/lib/google-ads'
import { getCampaignInsights } from '@/lib/meta-ads'
import { format, subDays } from 'date-fns'

export const spendReporting = inngest.createFunction(
  { id: 'spend-reporting', name: 'Daily Spend Reporting' },
  { cron: '0 6 * * *' },
  async ({ step }) => {
    if (
      process.env.FEATURE_GOOGLE_ADS !== 'true' &&
      process.env.FEATURE_META_ADS !== 'true'
    ) {
      return { skipped: true, reason: 'Ad platform feature flags disabled' }
    }

    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
    const dateRange = { start: yesterday, end: yesterday }

    const { data: locations } = await supabaseAdmin
      .from('locations')
      .select('id, org_id, organizations(google_ads_customer_id, meta_ad_account_id)')
      .eq('status', 'active')

    if (!locations?.length) return { processed: 0 }

    for (const location of locations) {
      await step.run(`spend-${location.id}`, async () => {
        const org = (location as { organizations?: { google_ads_customer_id?: string; meta_ad_account_id?: string } }).organizations

        if (process.env.FEATURE_GOOGLE_ADS === 'true' && org?.google_ads_customer_id) {
          try {
            const spendData = await getCampaignSpend(org.google_ads_customer_id, dateRange)
            for (const record of spendData) {
              const { data: campaign } = await supabaseAdmin
                .from('campaigns')
                .select('id')
                .eq('platform_campaign_id', record.campaignId)
                .single()

              if (campaign) {
                await supabaseAdmin.from('spend_records').upsert({
                  location_id: location.id,
                  platform: 'google',
                  campaign_id: campaign.id,
                  spend_date: yesterday,
                  spend: record.spend,
                  impressions: record.impressions,
                  clicks: record.clicks,
                }, { onConflict: 'campaign_id,spend_date' })
              }
            }
          } catch (err) {
            return { error: String(err), platform: 'google' }
          }
        }

        if (process.env.FEATURE_META_ADS === 'true' && org?.meta_ad_account_id) {
          try {
            const insights = await getCampaignInsights(org.meta_ad_account_id, dateRange)
            for (const record of insights) {
              const { data: campaign } = await supabaseAdmin
                .from('campaigns')
                .select('id')
                .eq('platform_campaign_id', record.campaignId)
                .single()

              if (campaign) {
                await supabaseAdmin.from('spend_records').upsert({
                  location_id: location.id,
                  platform: 'meta',
                  campaign_id: campaign.id,
                  spend_date: yesterday,
                  spend: record.spend,
                  impressions: record.impressions,
                  clicks: record.clicks,
                }, { onConflict: 'campaign_id,spend_date' })
              }
            }
          } catch (err) {
            return { error: String(err), platform: 'meta' }
          }
        }

        return { processed: true, locationId: location.id }
      })
    }

    return { date: yesterday }
  }
)
