// SEM Bible — MP4: Cron Jobs
// CA Directives: QS snapshot at 6AM, GCLID 90-day purge, auction insights to sem_competitive_snapshots

import { inngest } from '../client'
import { supabaseAdmin } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// 1. QS Daily Snapshot — 6AM UTC
// Pulls keyword QS from Google Ads API → sem_platform_daily_snapshots
// ---------------------------------------------------------------------------
export const qsDailySnapshot = inngest.createFunction(
  { id: 'sem-qs-daily-snapshot', name: 'SEM: QS Daily Snapshot' },
  { cron: '0 6 * * *' },
  async ({ logger }) => {
    const { data: orgs, error } = await supabaseAdmin
      .from('organizations')
      .select('id, google_ads_customer_id')
      .not('google_ads_customer_id', 'is', null)

    if (error) {
      logger.error('Failed to fetch orgs for QS snapshot', { error })
      return { skipped: true }
    }

    const results: { orgId: string; inserted: number }[] = []

    for (const org of orgs ?? []) {
      if (!org.google_ads_customer_id) continue

      // TODO: Replace with real Google Ads API call when developer token is approved (Phase 3)
      // GoogleAdsClient → KeywordViewService → keyword_view.quality_info
      const snapshotDate = new Date().toISOString().split('T')[0]
      const placeholder = {
        org_id: org.id,
        snapshot_date: snapshotDate,
        platform: 'google',
        impressions: 0,
        clicks: 0,
        conversions: 0,
        cost_micros: 0,
        quality_score_avg: null,
        impression_share: null,
        source: 'qs_daily_snapshot',
      }

      const { error: insertError } = await supabaseAdmin
        .from('sem_platform_daily_snapshots')
        .upsert(placeholder, { onConflict: 'org_id,snapshot_date,platform' })

      if (insertError) {
        logger.error('QS snapshot insert failed', { orgId: org.id, error: insertError })
      } else {
        results.push({ orgId: org.id, inserted: 1 })
      }
    }

    return { results }
  }
)

// ---------------------------------------------------------------------------
// 2. Auction Insights Weekly Pull — Monday 7AM UTC
// Writes to sem_competitive_snapshots (NOT sem_platform_daily_snapshots)
// ---------------------------------------------------------------------------
export const auctionInsightsWeekly = inngest.createFunction(
  { id: 'sem-auction-insights-weekly', name: 'SEM: Auction Insights Weekly' },
  { cron: '0 7 * * 1' },
  async ({ logger }) => {
    const { data: orgs, error } = await supabaseAdmin
      .from('organizations')
      .select('id, google_ads_customer_id')
      .not('google_ads_customer_id', 'is', null)

    if (error) {
      logger.error('Failed to fetch orgs for auction insights', { error })
      return { skipped: true }
    }

    const snapshotDate = new Date().toISOString().split('T')[0]
    const results: { orgId: string; inserted: number }[] = []

    for (const org of orgs ?? []) {
      if (!org.google_ads_customer_id) continue

      // TODO: Replace with real Google Ads API AuctionInsightService call (Phase 3)
      const placeholder = {
        org_id: org.id,
        campaign_id: 'pending_google_ads_approval',
        snapshot_date: snapshotDate,
        competitor_domain: null,
        impression_share: null,
        overlap_rate: null,
        position_above_rate: null,
        top_of_page_rate: null,
        abs_top_of_page_rate: null,
        outranking_share: null,
      }

      const { error: insertError } = await supabaseAdmin
        .from('sem_competitive_snapshots')
        .insert(placeholder)

      if (insertError) {
        logger.error('Auction insights insert failed', { orgId: org.id, error: insertError })
      } else {
        results.push({ orgId: org.id, inserted: 1 })
      }
    }

    return { results }
  }
)

// ---------------------------------------------------------------------------
// 3. Optimization Cadence Weekly — Monday 7AM UTC (after auction pull)
// Surfaces recommendations → sem_platform_automated_actions, Slack alerts L2/L3
// ---------------------------------------------------------------------------
export const optimizationCadenceWeekly = inngest.createFunction(
  { id: 'sem-optimization-cadence-weekly', name: 'SEM: Optimization Cadence Weekly' },
  { cron: '30 7 * * 1' },
  async ({ logger }) => {
    const { data: snapshots, error } = await supabaseAdmin
      .from('sem_platform_daily_snapshots')
      .select('org_id, cost_micros, impressions, clicks, conversions')
      .gte('snapshot_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

    if (error) {
      logger.error('Failed to fetch snapshots for optimization cadence', { error })
      return { skipped: true }
    }

    // Aggregate by org
    const orgMetrics: Record<string, { cost: number; conversions: number; clicks: number }> = {}
    for (const s of snapshots ?? []) {
      if (!orgMetrics[s.org_id]) orgMetrics[s.org_id] = { cost: 0, conversions: 0, clicks: 0 }
      orgMetrics[s.org_id].cost += (s.cost_micros ?? 0) / 1_000_000
      orgMetrics[s.org_id].conversions += s.conversions ?? 0
      orgMetrics[s.org_id].clicks += s.clicks ?? 0
    }

    const actions: {
      org_id: string
      campaign_id: string
      action_type: string
      action_level: number
      status: string
      payload: Record<string, unknown>
    }[] = []

    for (const [orgId, metrics] of Object.entries(orgMetrics)) {
      const cpa = metrics.conversions > 0 ? metrics.cost / metrics.conversions : null

      // Level 3: zero conversions with >$500 spend → Slack alert
      if (cpa === null && metrics.cost > 500) {
        actions.push({
          org_id: orgId,
          campaign_id: 'aggregate',
          action_type: 'ZERO_CONVERSIONS_HIGH_SPEND',
          action_level: 3,
          status: 'PENDING',
          payload: { cost: metrics.cost, conversions: 0, alert_channel: '#marketing-engine-alerts' },
        })
      }
    }

    if (actions.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('sem_platform_automated_actions')
        .insert(actions)

      if (insertError) {
        logger.error('Failed to insert optimization actions', { error: insertError })
      }
    }

    return { actionsCreated: actions.length }
  }
)

// ---------------------------------------------------------------------------
// 4. GCLID/MSCLKID 90-Day Purge — 2AM UTC daily
// Deletes click tracking records older than 90 days (HIPAA / Ch 54 retention)
// ---------------------------------------------------------------------------
export const gclidPurgeDaily = inngest.createFunction(
  { id: 'sem-gclid-purge-daily', name: 'SEM: GCLID 90-Day Purge' },
  { cron: '0 2 * * *' },
  async ({ logger }) => {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

    // Purge from leads table where source is gclid-based and no conversion within 90 days
    const { error, count } = await supabaseAdmin
      .from('leads')
      .delete({ count: 'exact' })
      .lt('created_at', cutoff)
      .eq('source', 'google_ads')
      .is('converted_at', null)

    if (error) {
      logger.error('GCLID purge failed', { error })
      return { purged: 0, error: error.message }
    }

    logger.info('GCLID purge complete', { purged: count ?? 0, cutoff })
    return { purged: count ?? 0, cutoff }
  }
)

// ---------------------------------------------------------------------------
// 5. Copy Result Feedback Loop — event-triggered: sem/copy.result.recorded
// Updates sem_copy_performance_log, re-ranks variants
// ---------------------------------------------------------------------------
export const copyResultFeedbackLoop = inngest.createFunction(
  { id: 'sem-copy-result-feedback-loop', name: 'SEM: Copy Result Feedback Loop' },
  { event: 'sem/copy.result.recorded' },
  async ({ event, logger }) => {
    const { orgId, campaignId, copyVariantId, testResult } = event.data as {
      orgId: string
      campaignId: string
      copyVariantId: string
      testResult: 'WINNER' | 'LOSER' | 'INCONCLUSIVE'
    }

    const { error } = await supabaseAdmin
      .from('sem_copy_performance_log')
      .update({ test_result: testResult })
      .eq('org_id', orgId)
      .eq('campaign_id', campaignId)
      .eq('copy_variant_id', copyVariantId)

    if (error) {
      logger.error('Copy result update failed', { error })
      return { updated: false }
    }

    logger.info('Copy result recorded', { orgId, campaignId, copyVariantId, testResult })
    return { updated: true }
  }
)
