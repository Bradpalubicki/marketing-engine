import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { calculateCompleteness } from '@/lib/completeness'

const IntakeSchema = z.object({
  org_id: z.string().min(1),
  business_name: z.string().optional(),
  primary_service: z.string().optional(),
  service_location_city: z.string().optional(),
  target_cpl: z.number().positive().optional().nullable(),
  avg_transaction_value: z.number().positive().optional().nullable(),
  monthly_budget: z.number().positive().optional().nullable(),
  close_rate_pct: z.number().min(0).max(100).optional().nullable(),
  primary_offer: z.string().optional().nullable(),
  offer_urgency: z.enum(['evergreen', 'seasonal', 'limited']).optional().nullable(),
  proof_point: z.string().optional().nullable(),
  secondary_services: z.array(z.string()).optional().nullable(),
  price_position: z.enum(['budget', 'mid-market', 'premium']).optional().nullable(),
  competitor_names: z.array(z.string()).optional().nullable(),
  competitor_urls: z.array(z.string()).optional().nullable(),
  geographic_radius_miles: z.number().positive().optional().nullable(),
  service_area_type: z.enum(['single-location', 'multi-location', 'regional', 'national']).optional().nullable(),
  num_locations: z.number().int().positive().optional().nullable(),
  website_url: z.string().optional().nullable(),
  existing_lp_url: z.string().optional().nullable(),
  phone_number: z.string().optional().nullable(),
  gbp_listing_url: z.string().optional().nullable(),
  ghl_contact_id: z.string().optional().nullable(),
  google_ads_customer_id: z.string().optional().nullable(),
  meta_ad_account_id: z.string().optional().nullable(),
  vertical_tag: z.string().optional().nullable(),
  is_licensed: z.boolean().optional().nullable(),
  license_number: z.string().optional().nullable(),
  meta_special_ad_category: z.enum(['none', 'housing', 'employment', 'credit', 'health']).optional().nullable(),
  is_24_7: z.boolean().optional().nullable(),
  offers_financing: z.boolean().optional().nullable(),
  tune_up_price: z.number().optional().nullable(),
  primary_equipment_brands: z.array(z.string()).optional().nullable(),
  climate_zone: z.enum(['desert', 'humid', 'mixed', 'cold']).optional().nullable(),
  is_emergency_service: z.boolean().optional().nullable(),
  accepts_insurance: z.boolean().optional().nullable(),
  insurance_networks: z.array(z.string()).optional().nullable(),
  primary_procedure_focus: z.enum(['general', 'cosmetic', 'implants', 'orthodontics', 'emergency']).optional().nullable(),
  new_patient_offer: z.string().optional().nullable(),
  has_sedation: z.boolean().optional().nullable(),
  practice_areas: z.array(z.string()).optional().nullable(),
  bar_state: z.string().optional().nullable(),
  contingency_fee: z.boolean().optional().nullable(),
  consultation_type: z.enum(['free', 'paid', 'phone-only']).optional().nullable(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = IntakeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { org_id, ...fields } = parsed.data

  // Fetch existing record to merge for score calculation
  const { data: existing } = await supabaseAdmin
    .from('client_intelligence')
    .select('*')
    .eq('organization_id', org_id)
    .maybeSingle()

  // Merge incoming fields with existing data for score computation
  const merged = { ...existing, ...fields }

  // Calculate completeness score
  const completenessResult = calculateCompleteness(merged)

  // Upsert to client_intelligence
  const upsertPayload = {
    ...fields,
    organization_id: org_id,
    vertical_tag: fields.vertical_tag ?? existing?.vertical_tag ?? 'general',
    completeness_score: completenessResult.score,
    completeness_breakdown: completenessResult.breakdown,
  }

  const { error: upsertError } = await supabaseAdmin
    .from('client_intelligence')
    .upsert(upsertPayload, { onConflict: 'organization_id' })

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  return NextResponse.json({
    score: completenessResult.score,
    breakdown: completenessResult.breakdown,
    can_launch: completenessResult.can_launch,
    smart_bidding_eligible: completenessResult.smart_bidding_eligible,
    missing_high_priority: completenessResult.missing_high_priority,
  })
}
