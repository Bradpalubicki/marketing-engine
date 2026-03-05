import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

const spendSchema = z.object({
  platform: z.enum(['google', 'meta', 'microsoft']),
  spend_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  spend: z.number().min(0),
  clicks: z.number().int().min(0).nullable().optional(),
  impressions: z.number().int().min(0).nullable().optional(),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: locationId } = await context.params

  // Verify location exists
  const { data: location } = await supabaseAdmin
    .from('locations')
    .select('id')
    .eq('id', locationId)
    .single()

  if (!location) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = spendSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { platform, spend_date, spend, clicks, impressions } = parsed.data

  const { data, error } = await supabaseAdmin
    .from('spend_records')
    .insert({
      location_id: locationId,
      platform,
      spend_date,
      spend,
      clicks: clicks ?? null,
      impressions: impressions ?? null,
      campaign_id: null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to save spend record' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: locationId } = await context.params

  const { data, error } = await supabaseAdmin
    .from('spend_records')
    .select('id, platform, spend_date, spend, clicks, impressions')
    .eq('location_id', locationId)
    .is('campaign_id', null)
    .order('spend_date', { ascending: false })
    .limit(10)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch spend records' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
