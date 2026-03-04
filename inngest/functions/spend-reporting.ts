import { inngest } from '../client'
import { supabaseAdmin } from '@/lib/supabase'
import { getCampaignSpend as getGoogleSpend } from '@/lib/google-ads'
import { getCampaignInsights } from '@/lib/meta-ads'
import { getCampaignSpend as getMicrosoftSpend } from '@/lib/microsoft-ads'
import { format, subDays } from 'date-fns'

export const spendReporting = inngest.createFunction(
  { id: 'spend-reporting', name: 'Daily Spend Reporting' },
  { cron: '0 6 * * *' },
  async ({ step }) => {
    const googleEnabled = process.env.FEATURE_GOOGLE_ADS === 'true'
    const metaEnabled = process.env.FEATURE_META_ADS === 'true'
    const microsoftEnabled = process.env.FEATURE_MICROSOFT_ADS === 'true'

    if (!googleEnabled && !metaEnabled && !microsoftEnabled) {
      return { skipped: true, reason: 'All ad platform feature flags disabled' }
    }

    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
    const dateRange = { start: yesterday, end: yesterday }

    const { data: locations } = await supabaseAdmin
      .from('locations')
      .select(
        'id, org_id, organizations(google_ads_customer_id, meta_ad_account_id, microsoft_ads_account_id)'
      )
      .eq('status', 'active')

    if (!locations?.length) return { processed: 0 }

    for (const location of locations) {
      await step.run(`spend-${location.id}`, async () => {
        const org = (
          location as {
            organizations?: {
              google_ads_customer_id?: string
              meta_ad_account_id?: string
              microsoft_ads_account_id?: string
            }
          }
        ).organizations

        // Google
        if (googleEnabled && org?.google_ads_customer_id) {
          try {
            const spendData = await getGoogleSpend(org.google_ads_customer_id, dateRange)
            for (const record of spendData) {
              const { data: campaign } = await supabaseAdmin
                .from('campaigns')
                .select('id')
                .eq('platform_campaign_id', record.campaignId)
                .single()

              if (campaign) {
                await supabaseAdmin.from('spend_records').upsert(
                  {
                    location_id: location.id,
                    platform: 'google',
                    campaign_id: campaign.id,
                    spend_date: yesterday,
                    spend: record.spend,
                    impressions: record.impressions,
                    clicks: record.clicks,
                  },
                  { onConflict: 'campaign_id,spend_date' }
                )
              }
            }
          } catch (err) {
            return { error: String(err), platform: 'google' }
          }
        }

        // Meta
        if (metaEnabled && org?.meta_ad_account_id) {
          try {
            const insights = await getCampaignInsights(org.meta_ad_account_id, dateRange)
            for (const record of insights) {
              const { data: campaign } = await supabaseAdmin
                .from('campaigns')
                .select('id')
                .eq('platform_campaign_id', record.campaignId)
                .single()

              if (campaign) {
                await supabaseAdmin.from('spend_records').upsert(
                  {
                    location_id: location.id,
                    platform: 'meta',
                    campaign_id: campaign.id,
                    spend_date: yesterday,
                    spend: record.spend,
                    impressions: record.impressions,
                    clicks: record.clicks,
                  },
                  { onConflict: 'campaign_id,spend_date' }
                )
              }
            }
          } catch (err) {
            return { error: String(err), platform: 'meta' }
          }
        }

        // Microsoft — daily at ~3am UTC (this cron runs at 6am, so Microsoft data is ready)
        if (microsoftEnabled && org?.microsoft_ads_account_id) {
          try {
            const msSpend = await getMicrosoftSpend(org.microsoft_ads_account_id, dateRange)
            for (const record of msSpend) {
              const { data: campaign } = await supabaseAdmin
                .from('campaigns')
                .select('id')
                .eq('platform_campaign_id', record.campaignId)
                .single()

              if (campaign) {
                await supabaseAdmin.from('spend_records').upsert(
                  {
                    location_id: location.id,
                    platform: 'microsoft',
                    campaign_id: campaign.id,
                    spend_date: yesterday,
                    spend: record.spend,
                    impressions: record.impressions,
                    clicks: record.clicks,
                  },
                  { onConflict: 'campaign_id,spend_date' }
                )
              }
            }
          } catch (err) {
            return { error: String(err), platform: 'microsoft' }
          }
        }

        return { processed: true, locationId: location.id }
      })
    }

    return { date: yesterday }
  }
)
