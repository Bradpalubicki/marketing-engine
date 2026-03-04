/**
 * Idempotent demo seed script.
 * Run: npm run seed
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Load .env.local
const envPath = path.resolve(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || SUPABASE_URL.includes('placeholder')) {
  console.error('ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function seed() {
  console.log('Starting demo seed...')

  // --- Organization ---
  const DEMO_ORG_CLERK_ID = 'demo_org_001'
  let orgId: string

  const { data: existingOrg } = await supabase
    .from('organizations')
    .select('id')
    .eq('clerk_org_id', DEMO_ORG_CLERK_ID)
    .single()

  if (existingOrg) {
    console.log('Demo org already exists, skipping org insert.')
    orgId = existingOrg.id
  } else {
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .insert({
        clerk_org_id: DEMO_ORG_CLERK_ID,
        name: 'NuStack Demo Clinic',
        slug: 'nustack-demo',
      })
      .select('id')
      .single()

    if (orgErr || !org) {
      console.error('Failed to insert org:', orgErr?.message)
      process.exit(1)
    }
    orgId = org.id
    console.log(`Created org: ${orgId}`)
  }

  // --- Locations ---
  const locationDefs = [
    {
      org_id: orgId,
      name: 'NuStack Demo Chicago',
      slug: 'nustack-demo-chicago',
      address: '123 N Michigan Ave',
      city: 'Chicago',
      state: 'IL',
      zip: '60601',
      phone: '(312) 555-0100',
      timezone: 'America/Chicago',
      status: 'active',
      campaign_factory_status: 'complete',
      gbp_location_id: 'demo_gbp_chicago',
    },
    {
      org_id: orgId,
      name: 'NuStack Demo Naperville',
      slug: 'nustack-demo-naperville',
      address: '456 W Jefferson Ave',
      city: 'Naperville',
      state: 'IL',
      zip: '60540',
      phone: '(630) 555-0200',
      timezone: 'America/Chicago',
      status: 'pending',
      campaign_factory_status: 'pending',
      gbp_location_id: 'demo_gbp_naperville',
    },
  ]

  const locationIds: string[] = []
  for (const loc of locationDefs) {
    const { data: existingLoc } = await supabase
      .from('locations')
      .select('id')
      .eq('slug', loc.slug)
      .single()

    if (existingLoc) {
      console.log(`Location ${loc.slug} already exists, skipping.`)
      locationIds.push(existingLoc.id)
    } else {
      const { data: newLoc, error: locErr } = await supabase
        .from('locations')
        .insert(loc)
        .select('id')
        .single()

      if (locErr || !newLoc) {
        console.error(`Failed to insert location ${loc.slug}:`, locErr?.message)
        continue
      }
      locationIds.push(newLoc.id)
      console.log(`Created location ${loc.slug}: ${newLoc.id}`)
    }
  }

  const [chicagoId, napervilleId] = locationIds

  // --- GBP Profiles ---
  if (chicagoId) {
    const { data: existingGbp } = await supabase
      .from('gbp_profiles')
      .select('id')
      .eq('location_id', chicagoId)
      .single()

    if (!existingGbp) {
      await supabase.from('gbp_profiles').insert({
        location_id: chicagoId,
        gbp_location_id: 'demo_gbp_chicago',
        account_id: 'demo_account',
        is_verified: true,
        review_count: 24,
        avg_rating: 4.8,
      })
      console.log('Created GBP profile for Chicago')
    }
  }

  if (napervilleId) {
    const { data: existingGbp } = await supabase
      .from('gbp_profiles')
      .select('id')
      .eq('location_id', napervilleId)
      .single()

    if (!existingGbp) {
      await supabase.from('gbp_profiles').insert({
        location_id: napervilleId,
        gbp_location_id: 'demo_gbp_naperville',
        account_id: 'demo_account',
        is_verified: false,
        review_count: 5,
        avg_rating: 4.6,
      })
      console.log('Created GBP profile for Naperville')
    }
  }

  // --- Landing Pages ---
  if (chicagoId) {
    const { data: existingLp } = await supabase
      .from('landing_pages')
      .select('id')
      .eq('location_id', chicagoId)
      .single()

    if (!existingLp) {
      await supabase.from('landing_pages').insert({
        location_id: chicagoId,
        slug: 'chicago-mens-health',
        title: 'Men\'s Health Chicago | Free Consultation',
        headline: 'Reclaim Your Energy, Strength & Confidence',
        subheadline: 'Chicago\'s leading men\'s health clinic — hormone optimization, TRT, and primary care.',
        cta_text: 'Book Your Free Consultation',
        is_active: true,
      })
      console.log('Created landing page for Chicago')
    }
  }

  if (napervilleId) {
    const { data: existingLp } = await supabase
      .from('landing_pages')
      .select('id')
      .eq('location_id', napervilleId)
      .single()

    if (!existingLp) {
      await supabase.from('landing_pages').insert({
        location_id: napervilleId,
        slug: 'naperville-mens-health',
        title: 'Men\'s Health Naperville | Free Consultation',
        headline: 'Naperville Men\'s Wellness Center',
        subheadline: 'Personalized hormone optimization and men\'s health care in Naperville.',
        cta_text: 'Book Your Free Consultation',
        is_active: true,
      })
      console.log('Created landing page for Naperville')
    }
  }

  // --- Demo Leads ---
  if (!chicagoId) {
    console.log('No Chicago location, skipping leads.')
    console.log('Seed complete.')
    return
  }

  const leadDefs = [
    { first_name: 'James', last_name: 'Miller', email: 'james.miller@example.com', phone: '(312) 555-1001', status: 'new', source: 'form' },
    { first_name: 'Robert', last_name: 'Johnson', email: 'robert.j@example.com', phone: '(312) 555-1002', status: 'contacted', source: 'form' },
    { first_name: 'Michael', last_name: 'Davis', email: 'michael.d@example.com', phone: '(312) 555-1003', status: 'booked', source: 'call' },
    { first_name: 'William', last_name: 'Brown', email: 'william.b@example.com', phone: '(312) 555-1004', status: 'showed', source: 'form', appointment_revenue: 350 },
    { first_name: 'David', last_name: 'Wilson', email: 'david.w@example.com', phone: '(312) 555-1005', status: 'disqualified', source: 'form' },
  ]

  for (const lead of leadDefs) {
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('email', lead.email)
      .single()

    if (existingLead) {
      console.log(`Lead ${lead.email} already exists, skipping.`)
      continue
    }

    const { data: newLead, error: leadErr } = await supabase
      .from('leads')
      .insert({
        location_id: chicagoId,
        org_id: orgId,
        ...lead,
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'mens-health-chicago',
      })
      .select('id')
      .single()

    if (leadErr || !newLead) {
      console.error(`Failed to insert lead ${lead.email}:`, leadErr?.message)
      continue
    }

    console.log(`Created lead ${lead.first_name} ${lead.last_name} (${lead.status}): ${newLead.id}`)

    // Nurture events (3 per lead, statuses: sent/sent/pending)
    const nurtureSteps = [
      { step: 1, type: 'sms', status: 'sent', content: `Hi ${lead.first_name}, thanks for reaching out to NuStack Demo Chicago. Click here to book your consultation.` },
      { step: 2, type: 'email', status: 'sent', content: `Hi ${lead.first_name}, we wanted to follow up on your inquiry about men's health services.` },
      { step: 3, type: 'sms', status: 'pending', content: `Hi ${lead.first_name}, we still have openings this week. Would you like to schedule?` },
    ]

    await supabase.from('nurture_events').insert(
      nurtureSteps.map(s => ({
        lead_id: newLead.id,
        ...s,
        sent_at: s.status === 'sent' ? new Date().toISOString() : null,
      }))
    )
    console.log(`  Created 3 nurture events for ${lead.first_name}`)
  }

  console.log('Seed complete.')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
