import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { inngest } from '@/inngest/client'

const locationSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  zip: z.string().regex(/^\d{5}$/),
  phone: z.string().min(10),
  timezone: z.string().min(1),
  monthly_ad_budget: z.number().positive().optional(),
  status: z.enum(['pending', 'active', 'paused', 'inactive']).default('pending'),
  org_id: z.string().uuid().optional(),
})

export async function POST(req: NextRequest) {
  const { userId, orgId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json() as unknown
    const parsed = locationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }

    const data = parsed.data

    let resolvedOrgId = data.org_id
    if (!resolvedOrgId && orgId) {
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .eq('clerk_org_id', orgId)
        .single()
      resolvedOrgId = org?.id
    }

    if (!resolvedOrgId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }

    const { data: location, error } = await supabaseAdmin
      .from('locations')
      .insert({
        org_id: resolvedOrgId,
        name: data.name,
        slug: data.slug,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        phone: data.phone,
        timezone: data.timezone,
        monthly_ad_budget: data.monthly_ad_budget ?? null,
        status: data.status,
        campaign_factory_status: 'pending',
      })
      .select()
      .single()

    if (error || !location) {
      return NextResponse.json({ error: 'Failed to create location' }, { status: 500 })
    }

    if (data.status === 'active') {
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('google_ads_customer_id, meta_ad_account_id')
        .eq('id', resolvedOrgId)
        .single()

      await inngest.send({
        name: 'location/activated',
        data: {
          locationId: location.id,
          locationName: location.name,
          city: location.city,
          orgId: resolvedOrgId,
          googleCustomerId: org?.google_ads_customer_id ?? null,
          metaAdAccountId: org?.meta_ad_account_id ?? null,
        },
      })
    }

    return NextResponse.json({ id: location.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
