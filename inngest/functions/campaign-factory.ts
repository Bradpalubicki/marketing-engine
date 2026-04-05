import Anthropic from '@anthropic-ai/sdk'
import { inngest } from '../client'
import { supabaseAdmin } from '@/lib/supabase'
import { generateRSACopy, generateMetaCopy } from '@/lib/ad-copy-generator'
import { checkCompliance } from '@/lib/compliance'
import { createCampaign as createMicrosoftCampaign } from '@/lib/microsoft-ads'
import { createCustomerAccount, createCampaign as createGoogleCampaign } from '@/lib/google-ads'

interface LocationActivatedEvent {
  locationId: string
  locationName: string
  city: string
  state: string
  orgId: string
  googleCustomerId?: string
  metaAdAccountId?: string
  microsoftAccountId?: string
  adBudgetMonthly?: number
  platforms?: ('google' | 'microsoft' | 'meta')[]
}

interface GeneratedAssets {
  rsaCopy: Awaited<ReturnType<typeof generateRSACopy>>
  metaCopy: Awaited<ReturnType<typeof generateMetaCopy>>
  sitelinks: string[]
  callouts: string[]
}

async function generateSitelinksAndCallouts(
  locationName: string,
  anthropicClient: Anthropic
): Promise<{ sitelinks: string[]; callouts: string[] }> {
  const message = await anthropicClient.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system:
      'You generate healthcare-compliant ad assets. Never use Rx drug names or prescription language.',
    messages: [
      {
        role: 'user',
        content: `Generate ad assets for ${locationName}, a men's health clinic.

Return exactly this JSON:
{
  "sitelinks": ["text1", "text2", "text3", "text4"],
  "callouts": ["callout1", "callout2", "callout3", "callout4", "callout5", "callout6", "callout7", "callout8"]
}

Sitelinks (max 25 chars each): navigation links like "Book Now", "Our Locations", "Meet Our Doctors", "Patient Reviews"
Callouts (max 25 chars each): short value props like "Board-Certified Physicians", "HIPAA-Compliant Care", "Same-Day Appointments", "No Referral Required"`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected Claude response type')

  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON in sitelinks/callouts response')

  const parsed = JSON.parse(jsonMatch[0]) as { sitelinks: string[]; callouts: string[] }
  return parsed
}

export const campaignFactory = inngest.createFunction(
  { id: 'campaign-factory', name: 'Campaign Factory' },
  { event: 'location/activated' },
  async ({ event, step }) => {
    const {
      locationId,
      locationName,
      city,
      state,
      orgId,
      metaAdAccountId,
      microsoftAccountId,
      adBudgetMonthly = 3000,
    } = event.data as LocationActivatedEvent

    let googleCustomerId = (event.data as LocationActivatedEvent).googleCustomerId

    // Completeness gate — require score >= 60 before factory runs
    const { data: intel } = await supabaseAdmin
      .from('client_intelligence')
      .select('completeness_score')
      .eq('organization_id', orgId)
      .maybeSingle()

    if (!intel || intel.completeness_score < 60) {
      await supabaseAdmin
        .from('locations')
        .update({ campaign_factory_status: 'failed' })
        .eq('id', locationId)
      return {
        success: false,
        reason: 'completeness_gate',
        score: intel?.completeness_score ?? 0,
        message: 'Complete your client profile (60% required) before launching campaigns.',
      }
    }

    await supabaseAdmin
      .from('locations')
      .update({ campaign_factory_status: 'running' })
      .eq('id', locationId)

    // Step 0: Provision Google Ads sub-account if client doesn't have one yet
    if (process.env.FEATURE_GOOGLE_ADS === 'true' && !googleCustomerId) {
      const newCustomerId = await step.run('provision-google-ads-account', async () => {
        const customerId = await createCustomerAccount({
          descriptiveName: locationName,
          timeZone: 'America/Chicago',
        })

        // Save customer ID back to the organization record
        await supabaseAdmin
          .from('organizations')
          .update({ google_ads_customer_id: customerId })
          .eq('id', orgId)

        return customerId
      })

      // Use the newly created account for the rest of the factory
      googleCustomerId = newCustomerId
    }

    // Step 1: Pre-flight compliance check
    const complianceResult = await step.run('pre-flight-compliance', async () => {
      const rsaCopy = await generateRSACopy(locationName, 'mens health')
      const metaCopy = await generateMetaCopy(locationName, 'mens health')

      const allCopy = [
        ...rsaCopy.headlines,
        ...rsaCopy.descriptions,
        metaCopy.primaryText,
        metaCopy.headline,
        metaCopy.description,
      ].join(' ')

      const result = checkCompliance(allCopy)
      return { passed: result.passed, violations: result.violations }
    })

    if (!complianceResult.passed) {
      await supabaseAdmin
        .from('locations')
        .update({
          campaign_factory_status: 'failed',
          campaign_factory_notes: `Compliance violations: ${complianceResult.violations.join('; ')}`,
        })
        .eq('id', locationId)

      return {
        success: false,
        reason: 'compliance_failure',
        violations: complianceResult.violations,
      }
    }

    // Step 2: Generate all copy + assets
    const assets = await step.run('generate-copy', async (): Promise<GeneratedAssets> => {
      const anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

      const [rsaCopy, metaCopy, extras] = await Promise.all([
        generateRSACopy(locationName, 'mens health'),
        generateMetaCopy(locationName, 'mens health'),
        generateSitelinksAndCallouts(locationName, anthropicClient),
      ])

      return {
        rsaCopy,
        metaCopy,
        sitelinks: extras.sitelinks,
        callouts: extras.callouts,
      }
    })

    // Budget splits
    const googleDailyBudget = (adBudgetMonthly * 0.6) / 30.4
    const microsoftDailyBudget = (adBudgetMonthly * 0.4) / 28

    // Step 3: Google campaign (if enabled)
    if (process.env.FEATURE_GOOGLE_ADS === 'true' && googleCustomerId) {
      await step.run('create-google-campaign', async () => {
        // Idempotency check
        const { data: existing } = await supabaseAdmin
          .from('campaigns')
          .select('id, platform_campaign_id')
          .eq('location_id', locationId)
          .eq('platform', 'google')
          .eq('status', 'active')

        if (existing?.length && existing[0].platform_campaign_id) {
          return { skipped: true, existingId: existing[0].platform_campaign_id }
        }

        const platformCampaignId = await createGoogleCampaign(googleCustomerId, {
          name: `${locationName} - Search - Men's Health`,
          dailyBudgetMicros: Math.round(googleDailyBudget * 1_000_000),
          // Switched to MANUAL_CPC $2.00 — upgrade to TARGET_CPA after 30 conversions
          biddingStrategy: 'MANUAL_CPC',
        })

        await supabaseAdmin.from('campaigns').insert({
          location_id: locationId,
          platform: 'google',
          platform_campaign_id: platformCampaignId,
          name: `${locationName} - Search - Men's Health`,
          type: 'search',
          status: 'active',
          daily_budget: googleDailyBudget,
          monthly_budget: adBudgetMonthly * 0.6,
          // Switched to MANUAL_CPC $2.00 — upgrade to TARGET_CPA after 30 conversions
          bidding_strategy: 'MANUAL_CPC',
        })

        return {
          created: true,
          platformCampaignId,
          headlines: assets.rsaCopy.headlines.length,
          sitelinks: assets.sitelinks,
          callouts: assets.callouts,
        }
      })
    } else {
      await step.run('create-google-pending', async () => {
        await supabaseAdmin.from('campaigns').insert({
          location_id: locationId,
          platform: 'google',
          name: `${locationName} - Search - Men's Health [PENDING ACTIVATION]`,
          type: 'search',
          status: 'paused',
          daily_budget: googleDailyBudget,
          monthly_budget: adBudgetMonthly * 0.6,
          // Switched to MANUAL_CPC $2.00 — upgrade to TARGET_CPA after 30 conversions
          bidding_strategy: 'MANUAL_CPC',
        })
        return { skipped: true, reason: 'FEATURE_GOOGLE_ADS disabled or no customer ID' }
      })
    }

    // Step 4: Microsoft campaign (parallel-eligible — runs after Google step resolves)
    if (process.env.FEATURE_MICROSOFT_ADS === 'true' && microsoftAccountId) {
      await step.run('create-microsoft-campaign', async () => {
        // Idempotency check
        const { data: existing } = await supabaseAdmin
          .from('campaigns')
          .select('id, platform_campaign_id')
          .eq('location_id', locationId)
          .eq('platform', 'microsoft')
          .eq('status', 'active')

        if (existing?.length && existing[0].platform_campaign_id) {
          return { skipped: true, existingId: existing[0].platform_campaign_id }
        }

        const platformCampaignId = await createMicrosoftCampaign(microsoftAccountId, {
          name: `${locationName} - Search - Men's Health`,
          dailyBudget: microsoftDailyBudget,
          biddingStrategy: 'ManualCpc', // EnhancedCpc deprecated — removed per CA Gap Directive 2026-04-05
        })

        await supabaseAdmin.from('campaigns').insert({
          location_id: locationId,
          platform: 'microsoft',
          platform_campaign_id: platformCampaignId,
          name: `${locationName} - Search - Men's Health`,
          type: 'search',
          status: 'active',
          daily_budget: microsoftDailyBudget,
          monthly_budget: adBudgetMonthly * 0.4,
          bidding_strategy: 'MANUAL_CPC',
        })

        return { created: true, platformCampaignId }
      })
    } else {
      await step.run('create-microsoft-pending', async () => {
        await supabaseAdmin.from('campaigns').insert({
          location_id: locationId,
          platform: 'microsoft',
          name: `${locationName} - Search - Men's Health [PENDING ACTIVATION]`,
          type: 'search',
          status: 'paused',
          daily_budget: microsoftDailyBudget,
          monthly_budget: adBudgetMonthly * 0.4,
          bidding_strategy: 'MANUAL_CPC', // EnhancedCpc deprecated — removed per CA Gap Directive 2026-04-05
        })
        return { skipped: true, reason: 'FEATURE_MICROSOFT_ADS disabled or no account ID' }
      })
    }

    // Step 5: Meta placeholder
    if (process.env.FEATURE_META_ADS !== 'true' || !metaAdAccountId) {
      await step.run('log-meta-placeholder', async () => {
        await supabaseAdmin.from('campaigns').insert({
          location_id: locationId,
          platform: 'meta',
          name: `${locationName} - Meta - Lead Gen [PENDING ACTIVATION]`,
          type: 'lead_gen',
          status: 'paused',
          bidding_strategy: 'LOWEST_COST',
        })
        return { skipped: true, reason: 'FEATURE_META_ADS disabled or no ad account ID' }
      })
    }

    // Step 6: Mark complete
    await step.run('update-status', async () => {
      await supabaseAdmin
        .from('locations')
        .update({ campaign_factory_status: 'complete' })
        .eq('id', locationId)
      return { complete: true }
    })

    return {
      success: true,
      locationId,
      locationName,
      orgId,
      city,
      state,
      googleDailyBudget,
      microsoftDailyBudget,
    }
  }
)
