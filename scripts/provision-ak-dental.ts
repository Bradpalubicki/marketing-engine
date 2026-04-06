/**
 * One-off provisioning script — AK Ultimate Dental
 * Run via: doppler run --project marketing-engine --config prd -- npx tsx scripts/provision-ak-dental.ts
 *
 * GOOGLE_ADS_DRY_RUN=false — this is LIVE.
 *
 * NOTE: Doppler prd points to a different Supabase project (syceysungaotzrfpwfhb).
 * AK Dental lives in ftuneexcrtpagrfntbkk — credentials are hardcoded below.
 */

import { createClient } from '@supabase/supabase-js'
import { createCustomerAccount } from '../lib/google-ads'
import { Inngest } from 'inngest'

const ORG_ID = '2706bca6-24df-426e-b974-bb7ca28fb302'

// Correct Supabase project for AK Dental (ftuneexcrtpagrfntbkk)
// Doppler prd is wired to a different project — override here
const SUPABASE_URL = 'https://ftuneexcrtpagrfntbkk.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dW5lZXhjcnRwYWdyZm50YmtrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU4OTI1MywiZXhwIjoyMDg4MTY1MjUzfQ.vGCbprY9nh7uYqOfuMfDq5x_gOfaEG-OQX2cdt5iE6g'

// GBP_AGENCY_ACCOUNT_EMAIL is not in Doppler prd — inject before Google Ads call
if (!process.env.GBP_AGENCY_ACCOUNT_EMAIL) {
  process.env.GBP_AGENCY_ACCOUNT_EMAIL = 'brad@nustack.digital'
}

async function main() {
  // ── 1. Validate required Google Ads env vars ───────────────────────────────
  const requiredVars = [
    'GOOGLE_ADS_CLIENT_ID',
    'GOOGLE_ADS_CLIENT_SECRET',
    'GOOGLE_ADS_REFRESH_TOKEN',
    'GOOGLE_ADS_DEVELOPER_TOKEN',
    'GOOGLE_ADS_MCC_CUSTOMER_ID',
  ]
  const missing = requiredVars.filter(v => !process.env[v])
  if (missing.length) {
    throw new Error(`Missing env vars: ${missing.join(', ')}`)
  }

  const inngestEventKey = process.env.INNGEST_EVENT_KEY
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // ── 2. Create Google Ads sub-account ───────────────────────────────────────
  console.log('Creating Google Ads sub-account for AK Ultimate Dental...')
  console.log(`  MCC: ${process.env.GOOGLE_ADS_MCC_CUSTOMER_ID}`)
  console.log(`  GBP_AGENCY_ACCOUNT_EMAIL: ${process.env.GBP_AGENCY_ACCOUNT_EMAIL}`)

  const customerId = await createCustomerAccount({
    descriptiveName: 'AK Ultimate Dental',
    currencyCode: 'USD',
    timeZone: 'America/Anchorage',
  })
  console.log(`New Google Ads customer ID: ${customerId}`)

  // ── 3. Update organizations table ─────────────────────────────────────────
  console.log('Updating organizations table...')
  const { error: orgError } = await supabase
    .from('organizations')
    .update({ google_ads_customer_id: customerId })
    .eq('id', ORG_ID)

  if (orgError) {
    throw new Error(`organizations update failed: ${orgError.message}`)
  }
  console.log('organizations.google_ads_customer_id updated ✓')

  // ── 4. Update client_intelligence table ───────────────────────────────────
  console.log('Updating client_intelligence table...')
  const { error: ciError } = await supabase
    .from('client_intelligence')
    .update({ google_ads_customer_id: customerId })
    .eq('organization_id', ORG_ID)

  if (ciError) {
    throw new Error(`client_intelligence update failed: ${ciError.message}`)
  }
  console.log('client_intelligence.google_ads_customer_id updated ✓')

  console.log(`Sub-account created and saved: ${customerId}`)

  // ── 5. Fire Inngest event: campaign/dental.requested ──────────────────────
  console.log('Firing Inngest event campaign/dental.requested...')

  if (!inngestEventKey) {
    console.warn('INNGEST_EVENT_KEY not set — skipping Inngest event.')
  } else {
    const inngestClient = new Inngest({
      id: 'marketing-engine',
      eventKey: inngestEventKey,
    })

    const result = await inngestClient.send({
      name: 'campaign/dental.requested',
      data: {
        organization_id: ORG_ID,
        google_ads_customer_id: customerId,
        monthly_budget: 3000,
      },
    })

    console.log('Inngest event sent:', JSON.stringify(result))
  }
}

main().catch((err) => {
  console.error('Script failed:', err)
  process.exit(1)
})
