import { inngest } from '../client'
import { supabaseAdmin } from '@/lib/supabase'
import { uploadOfflineConversion as uploadGoogle } from '@/lib/google-ads'
import { uploadOfflineConversion as uploadMeta } from '@/lib/meta-ads'

export const offlineConversions = inngest.createFunction(
  { id: 'offline-conversions', name: 'Offline Conversion Upload' },
  { cron: '0 */6 * * *' },
  async ({ step }) => {
    if (
      process.env.FEATURE_GOOGLE_ADS !== 'true' &&
      process.env.FEATURE_META_ADS !== 'true'
    ) {
      return { skipped: true, reason: 'Ad feature flags disabled' }
    }

    const { data: queue } = await supabaseAdmin
      .from('offline_conversion_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempt_count', 3)
      .limit(50)

    if (!queue?.length) return { processed: 0 }

    let uploaded = 0
    let failed = 0

    for (const item of queue) {
      await step.run(`ocq-${item.id}`, async () => {
        try {
          await supabaseAdmin
            .from('offline_conversion_queue')
            .update({ attempt_count: (item.attempt_count ?? 0) + 1 })
            .eq('id', item.id)

          if (item.platform === 'google') {
            if (process.env.FEATURE_GOOGLE_ADS !== 'true') {
              return { skipped: true }
            }

            const { data: lead } = await supabaseAdmin
              .from('leads')
              .select('gclid, location_id, organizations(google_ads_customer_id)')
              .eq('id', item.lead_id)
              .single()

            if (!lead?.gclid) {
              await supabaseAdmin
                .from('offline_conversion_queue')
                .update({ status: 'failed', error_message: 'No GCLID' })
                .eq('id', item.id)
              failed++
              return { failed: true, reason: 'No GCLID' }
            }

            const org = (lead as { organizations?: { google_ads_customer_id?: string } }).organizations
            if (!org?.google_ads_customer_id) {
              await supabaseAdmin
                .from('offline_conversion_queue')
                .update({ status: 'failed', error_message: 'No customer ID' })
                .eq('id', item.id)
              failed++
              return { failed: true, reason: 'No customer ID' }
            }

            await uploadGoogle({
              customerId: org.google_ads_customer_id,
              gclid: lead.gclid,
              conversionName: item.conversion_name ?? 'lead_booked',
              conversionTime: item.conversion_time ?? new Date().toISOString(),
              conversionValue: item.conversion_value ?? 0,
            })
          } else if (item.platform === 'meta') {
            if (process.env.FEATURE_META_ADS !== 'true') {
              return { skipped: true }
            }

            if (!item.fbc) {
              await supabaseAdmin
                .from('offline_conversion_queue')
                .update({ status: 'failed', error_message: 'No FBC' })
                .eq('id', item.id)
              failed++
              return { failed: true, reason: 'No FBC' }
            }

            const datasetId = process.env.META_BUSINESS_MANAGER_ID ?? ''
            await uploadMeta({
              datasetId,
              fbc: item.fbc,
              conversionName: item.conversion_name ?? 'Lead',
              eventTime: Math.floor(new Date(item.conversion_time ?? Date.now()).getTime() / 1000),
              value: item.conversion_value ?? 0,
              currency: 'USD',
            })
          }

          await supabaseAdmin
            .from('offline_conversion_queue')
            .update({ status: 'uploaded', uploaded_at: new Date().toISOString() })
            .eq('id', item.id)

          uploaded++
          return { uploaded: true }
        } catch (err) {
          const errorMsg = String(err)
          if ((item.attempt_count ?? 0) >= 2) {
            await supabaseAdmin
              .from('offline_conversion_queue')
              .update({ status: 'failed', error_message: errorMsg })
              .eq('id', item.id)
          }
          failed++
          return { error: errorMsg }
        }
      })
    }

    return { uploaded, failed }
  }
)
