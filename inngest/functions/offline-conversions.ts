import { inngest } from '../client'
import { supabaseAdmin } from '@/lib/supabase'
import { uploadOfflineConversion as uploadGoogle } from '@/lib/google-ads'
import { uploadOfflineConversion as uploadMeta } from '@/lib/meta-ads'
import { uploadOfflineConversion as uploadMicrosoft } from '@/lib/microsoft-ads'

export const offlineConversions = inngest.createFunction(
  { id: 'offline-conversions', name: 'Offline Conversion Upload' },
  { cron: '0 */6 * * *' },
  async ({ step }) => {
    const googleEnabled = process.env.FEATURE_GOOGLE_ADS === 'true'
    const metaEnabled = process.env.FEATURE_META_ADS === 'true'
    const microsoftEnabled = process.env.FEATURE_MICROSOFT_ADS === 'true'

    if (!googleEnabled && !metaEnabled && !microsoftEnabled) {
      return { skipped: true, reason: 'All ad feature flags disabled' }
    }

    // Process queued offline conversions (Google + Meta pattern — unchanged)
    const { data: queue } = await supabaseAdmin
      .from('offline_conversion_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempt_count', 3)
      .limit(50)

    // Process msclkid conversions from leads table (new in v2)
    const { data: msLeads } = microsoftEnabled
      ? await supabaseAdmin
          .from('leads')
          .select('id, msclkid, location_id, created_at, status, organizations(microsoft_ads_account_id)')
          .not('msclkid', 'is', null)
          .in('status', ['booked', 'showed'])
          .neq('offline_conversion_sent', true)
          .limit(50)
      : { data: null }

    let uploaded = 0
    let failed = 0

    // --- Queue-based uploads (Google + Meta) ---
    for (const item of queue ?? []) {
      await step.run(`ocq-${item.id}`, async () => {
        try {
          await supabaseAdmin
            .from('offline_conversion_queue')
            .update({ attempt_count: (item.attempt_count ?? 0) + 1 })
            .eq('id', item.id)

          if (item.platform === 'google') {
            if (!googleEnabled) return { skipped: true }

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

            const org = (lead as { organizations?: { google_ads_customer_id?: string } })
              .organizations
            if (!org?.google_ads_customer_id) {
              await supabaseAdmin
                .from('offline_conversion_queue')
                .update({ status: 'failed', error_message: 'No Google customer ID' })
                .eq('id', item.id)
              failed++
              return { failed: true, reason: 'No Google customer ID' }
            }

            await uploadGoogle({
              customerId: org.google_ads_customer_id,
              gclid: lead.gclid,
              conversionName: item.conversion_name ?? 'Booked Appointment',
              conversionTime: item.conversion_time ?? new Date().toISOString(),
              conversionValue: item.conversion_value ?? 0,
            })
          } else if (item.platform === 'meta') {
            if (!metaEnabled) return { skipped: true }

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
              eventTime: Math.floor(
                new Date(item.conversion_time ?? Date.now()).getTime() / 1000
              ),
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

    // --- MSCLKID direct upload (v2 — Microsoft) ---
    for (const lead of msLeads ?? []) {
      await step.run(`ms-conversion-${lead.id}`, async () => {
        try {
          const org = (
            lead as {
              organizations?: { microsoft_ads_account_id?: string }
            }
          ).organizations

          if (!org?.microsoft_ads_account_id) {
            return { skipped: true, reason: 'No Microsoft Ads account ID' }
          }

          if (!lead.msclkid) {
            return { skipped: true, reason: 'No MSCLKID' }
          }

          await uploadMicrosoft({
            accountId: org.microsoft_ads_account_id,
            msclkid: lead.msclkid,
            conversionName: lead.status === 'showed' ? 'patient_showed' : 'Booked Appointment',
            conversionTime: lead.created_at ?? new Date().toISOString(),
            conversionValue: lead.status === 'showed' ? 250 : 50,
            currencyCode: 'USD',
          })

          await supabaseAdmin
            .from('leads')
            .update({ offline_conversion_sent: true })
            .eq('id', lead.id)

          uploaded++
          return { uploaded: true, leadId: lead.id }
        } catch (err) {
          failed++
          return { error: String(err), leadId: lead.id }
        }
      })
    }

    return { uploaded, failed }
  }
)
