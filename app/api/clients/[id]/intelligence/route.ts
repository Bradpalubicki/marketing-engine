// GET /api/clients/[id]/intelligence — fetch client_intelligence row + completeness
// PATCH /api/clients/[id]/intelligence — upsert partial update, recalculate score

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { calculateCompleteness } from '@/lib/completeness'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Partial update schema — all fields optional, no unknown keys
const PatchSchema = z.object({
  business_name: z.string().optional(),
  primary_service: z.string().optional(),
  service_location_city: z.string().optional(),
  target_cpl: z.number().int().positive().nullable().optional(),
  avg_transaction_value: z.number().int().positive().nullable().optional(),
  monthly_budget: z.number().int().positive().nullable().optional(),
  close_rate_pct: z.number().int().min(0).max(100).nullable().optional(),
  primary_offer: z.string().nullable().optional(),
  offer_urgency: z.enum(['evergreen', 'seasonal', 'limited']).nullable().optional(),
  proof_point: z.string().nullable().optional(),
  secondary_services: z.array(z.string()).nullable().optional(),
  price_position: z.enum(['budget', 'mid-market', 'premium']).nullable().optional(),
  competitor_names: z.array(z.string()).max(5).nullable().optional(),
  competitor_urls: z.array(z.string()).nullable().optional(),
  geographic_radius_miles: z.number().int().positive().nullable().optional(),
  service_area_type: z.enum(['single-location', 'multi-location', 'regional', 'national']).nullable().optional(),
  num_locations: z.number().int().positive().nullable().optional(),
  website_url: z.string().url().nullable().optional(),
  existing_lp_url: z.string().url().nullable().optional(),
  phone_number: z.string().nullable().optional(),
  gbp_listing_url: z.string().url().nullable().optional(),
  vertical_tag: z.string().nullable().optional(),
  is_licensed: z.boolean().nullable().optional(),
  license_number: z.string().nullable().optional(),
  hipaa_scope: z.boolean().nullable().optional(),
  meta_special_ad_category: z.string().nullable().optional(),
  is_24_7: z.boolean().nullable().optional(),
  offers_financing: z.boolean().nullable().optional(),
}).strict()

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data, error } = await supabase
    .from('client_intelligence')
    .select('*')
    .eq('organization_id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ exists: false }, { status: 404 })

  const completeness = calculateCompleteness(data)
  return NextResponse.json({ ...data, completeness })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  // Fetch current row to compute score on full merged data
  const { data: existing } = await supabase
    .from('client_intelligence')
    .select('*')
    .eq('organization_id', id)
    .maybeSingle()

  const merged = { ...(existing ?? {}), ...parsed.data }
  const completeness = calculateCompleteness(merged)

  const { data, error } = await supabase
    .from('client_intelligence')
    .upsert({
      organization_id: id,
      ...parsed.data,
      completeness_score: completeness.score,
      completeness_breakdown: completeness.breakdown,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'organization_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ...data, completeness })
}
