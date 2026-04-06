// Dental Campaign Factory
// Triggered when vertical_tag = 'healthcare_dental' AND completeness_score >= 60
// All campaigns created PAUSED, MANUAL_CPC, $2.00 ceiling, validateOnly=true
// Spec: Dental Vertical — Campaign Factory Phase 3

import { inngest } from '../client'
import { supabaseAdmin } from '@/lib/supabase'
import { campaignExistsByName, createCampaignWithDryRun } from '@/lib/google-ads'

interface DentalFactoryEvent {
  organizationId: string
  locationId: string
  customerId: string
  monthlyBudget: number
  locationName: string
  city: string
}

// Dental campaign structure — 2 campaigns, implants-heavy budget split
const DENTAL_CAMPAIGNS = [
  { name: 'Implants', budgetPct: 0.6, keywordCluster: 'implants' },
  { name: 'General', budgetPct: 0.4, keywordCluster: 'general' },
] as const

const CPC_BID_CEILING_MICROS = 2_000_000 // $2.00

export const dentalCampaignFactory = inngest.createFunction(
  { id: 'dental-campaign-factory', name: 'Dental Campaign Factory' },
  { event: 'campaign/dental.requested' },
  async ({ event, step }) => {
    const { organizationId, locationId, customerId, monthlyBudget, locationName, city } =
      event.data as DentalFactoryEvent

    // Completeness + vertical gate
    const { data: intel } = await supabaseAdmin
      .from('client_intelligence')
      .select('completeness_score, vertical_tag, is_licensed')
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (!intel || intel.completeness_score < 60 || intel.vertical_tag !== 'healthcare_dental') {
      return { success: false, reason: 'gate_failed', score: intel?.completeness_score ?? 0 }
    }

    const googleBudget = monthlyBudget * 0.6
    const results = []

    for (const campaign of DENTAL_CAMPAIGNS) {
      const campaignName = `Dental — ${campaign.name} — ${city}`
      const dailyBudgetMicros = Math.round((googleBudget * campaign.budgetPct / 30.44) * 1_000_000)

      const result = await step.run(`create-dental-${campaign.keywordCluster}`, async () => {
        // GAQL idempotency check
        const { exists, campaignId } = await campaignExistsByName(customerId, campaignName)
        if (exists) {
          supabaseAdmin.from('sem_platform_automated_actions').insert({
            org_id: organizationId,
            campaign_id: campaignId ?? 'unknown',
            action_type: 'campaign_skipped_duplicate',
            action_level: 1,
            status: 'COMPLETE',
            payload: { campaignName, reason: 'already_exists' },
          })
          return { skipped: true, campaignName, existingId: campaignId }
        }

        // Create PAUSED campaign — validateOnly=true dry-run pass first
        const { resourceName, dryRun } = await createCampaignWithDryRun(customerId, {
          name: campaignName,
          dailyBudgetMicros,
          biddingStrategy: 'MANUAL_CPC',
          cpcBidCeilingMicros: CPC_BID_CEILING_MICROS,
          validateOnly: true,
        })

        if (!dryRun) {
          const platformCampaignId = resourceName.split('/').pop()!
          await supabaseAdmin.from('campaigns').insert({
            location_id: locationId,
            platform: 'google',
            platform_campaign_id: platformCampaignId,
            name: campaignName,
            type: 'search',
            status: 'paused',
            daily_budget: dailyBudgetMicros / 1_000_000,
            monthly_budget: googleBudget * campaign.budgetPct,
            bidding_strategy: 'MANUAL_CPC',
          })
        } else {
          supabaseAdmin.from('sem_platform_automated_actions').insert({
            org_id: organizationId,
            campaign_id: 'dry_run',
            action_type: 'dry_run',
            action_level: 1,
            status: 'COMPLETE',
            payload: {
              campaignName,
              dailyBudget: (dailyBudgetMicros / 1_000_000).toFixed(2),
              platform: 'google',
            },
          })
        }

        return { created: !dryRun, dryRun, campaignName, resourceName }
      })

      results.push(result)
    }

    await supabaseAdmin
      .from('locations')
      .update({ campaign_factory_status: 'complete' })
      .eq('id', locationId)

    return { success: true, locationId, campaigns: results }
  }
)
