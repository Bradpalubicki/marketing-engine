// SEM Bible — Ch 43: IP Exclusion Inngest Handler
// Triggered by sem/click.suspicious event
// Level 1 = auto-apply without human approval

import { inngest } from '../client'
import { supabaseAdmin } from '@/lib/supabase'
import { logIpExclusionAction } from '@/lib/sem/click-fraud'

interface SuspiciousClickEventData {
  ip: string
  orgId: string
  campaignId: string
  googleAdsCustomerId?: string
}

export const semClickFraudHandler = inngest.createFunction(
  { id: 'sem-click-fraud-handler', name: 'SEM: IP Exclusion Auto-Apply' },
  { event: 'sem/click.suspicious' },
  async ({ event, logger }) => {
    const { ip, orgId, campaignId, googleAdsCustomerId } = event.data as SuspiciousClickEventData

    logger.info('Processing suspicious click event', { ip, orgId, campaignId })

    // Add to Google Ads IP exclusion list via CampaignCriterionServiceClient
    // TODO: Replace with real Google Ads API call when developer token approved (Phase 3)
    // CampaignCriterionServiceClient.mutateCampaignCriteria → IpBlock criterion
    if (googleAdsCustomerId) {
      logger.info('Google Ads IP exclusion would be applied', {
        customerId: googleAdsCustomerId,
        campaignId,
        ip,
      })
    }

    // Log as Level 1 auto-applied action
    await logIpExclusionAction(orgId, campaignId, ip, 'AUTO_APPLIED')

    // Verify exclusion was logged
    const { data: action } = await supabaseAdmin
      .from('sem_platform_automated_actions')
      .select('id, status')
      .eq('org_id', orgId)
      .eq('action_type', 'IP_EXCLUSION_ADDED')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    logger.info('IP exclusion logged', { actionId: action?.id, status: action?.status })

    return {
      ip,
      orgId,
      campaignId,
      actionStatus: 'AUTO_APPLIED',
      googleAdsCustomerId: googleAdsCustomerId ?? null,
    }
  }
)
