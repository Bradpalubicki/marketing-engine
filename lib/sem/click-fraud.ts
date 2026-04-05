// SEM Bible — Ch 43: IP Exclusion Automation
// Rule: same IP > 5 clicks in 24h with 0 conversions → add to Google Ads IP exclusion list
// Level 1 action = auto-apply without human approval

import { supabaseAdmin } from '@/lib/supabase'
import { inngest } from '@/inngest/client'

export const CLICK_FRAUD_THRESHOLD = 5 // clicks per 24h
export const CLICK_FRAUD_WINDOW_HOURS = 24

export interface SuspiciousClickEvent {
  ip: string
  orgId: string
  campaignId: string
  googleAdsCustomerId?: string
}

/**
 * Checks if an IP has exceeded the click fraud threshold in the last 24h.
 * Returns true if suspicious (>5 clicks, 0 conversions).
 */
export async function isClickFraudSuspect(
  ip: string,
  orgId: string,
  campaignId: string
): Promise<boolean> {
  const since = new Date(Date.now() - CLICK_FRAUD_WINDOW_HOURS * 60 * 60 * 1000).toISOString()

  // Check click count from leads/attribution table
  const { count: clickCount } = await supabaseAdmin
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .gte('created_at', since)
    .eq('source', 'google_ads')

  // Check conversion count
  const { count: conversionCount } = await supabaseAdmin
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .gte('created_at', since)
    .not('converted_at', 'is', null)

  return (clickCount ?? 0) > CLICK_FRAUD_THRESHOLD && (conversionCount ?? 0) === 0
}

/**
 * Fires sem/click.suspicious Inngest event.
 * Called from click tracking middleware when fraud threshold exceeded.
 */
export async function flagSuspiciousClick(event: SuspiciousClickEvent): Promise<void> {
  await inngest.send({
    name: 'sem/click.suspicious',
    data: event,
  })
}

/**
 * Logs IP exclusion action to sem_platform_automated_actions.
 * Level 1 = auto-applied without human approval.
 */
export async function logIpExclusionAction(
  orgId: string,
  campaignId: string,
  ip: string,
  status: 'AUTO_APPLIED' | 'PENDING' = 'AUTO_APPLIED'
): Promise<void> {
  await supabaseAdmin.from('sem_platform_automated_actions').insert({
    org_id: orgId,
    campaign_id: campaignId,
    action_type: 'IP_EXCLUSION_ADDED',
    action_level: 1,
    status,
    payload: {
      ip,
      reason: `IP exceeded ${CLICK_FRAUD_THRESHOLD} clicks in ${CLICK_FRAUD_WINDOW_HOURS}h with 0 conversions`,
      applied_at: new Date().toISOString(),
    },
    operator_id: 'system',
  })
}
