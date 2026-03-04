import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

const patchSchema = z.object({
  gbp_location_id: z.string().min(1).optional(),
  status: z.enum(['pending', 'active', 'paused', 'inactive']).optional(),
  monthly_ad_budget: z.number().positive().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await req.json() as unknown
    const parsed = patchSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: location, error } = await supabaseAdmin
      .from('locations')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single()

    if (error || !location) {
      return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
    }

    return NextResponse.json({ success: true, location })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
