import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { updateAttributionRecord } from '@/lib/attribution'

const patchSchema = z.object({
  status: z.enum(['new', 'contacted', 'booked', 'showed', 'no_showed', 'disqualified']),
  revenue: z.number().optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const secret = req.headers.get('x-webhook-secret')
  if (!secret || secret !== process.env.APPOINTMENTS_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const { status, revenue } = parsed.data

  const { data: lead, error: leadError } = await supabaseAdmin
    .from('leads')
    .select('id, gclid, fbclid')
    .eq('id', id)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  const now = new Date().toISOString()
  const updatePayload: Record<string, unknown> = { status, updated_at: now }
  if (revenue !== undefined) updatePayload.appointment_revenue = revenue

  await supabaseAdmin.from('leads').update(updatePayload).eq('id', id)

  // Update attribution record
  if (status === 'contacted') await updateAttributionRecord(id, { contacted_at: now })
  if (status === 'booked') await updateAttributionRecord(id, { booked_at: now, ...(revenue ? { revenue } : {}) })
  if (status === 'showed') await updateAttributionRecord(id, { showed_at: now, ...(revenue ? { revenue } : {}) })

  // Queue offline conversion if booked or showed
  if (status === 'booked' || status === 'showed') {
    if (lead.gclid) {
      await supabaseAdmin.from('offline_conversion_queue').upsert(
        {
          lead_id: id,
          platform: 'google',
          conversion_name: status === 'showed' ? 'patient_showed' : 'consultation_booked',
          conversion_time: now,
          conversion_value: revenue ?? null,
          gclid: lead.gclid,
          status: 'pending',
        },
        { onConflict: 'lead_id,platform' }
      )
    }
    if (lead.fbclid) {
      await supabaseAdmin.from('offline_conversion_queue').upsert(
        {
          lead_id: id,
          platform: 'meta',
          conversion_name: status === 'showed' ? 'PatientShowed' : 'ConsultationBooked',
          conversion_time: now,
          conversion_value: revenue ?? null,
          fbc: lead.fbclid,
          status: 'pending',
        },
        { onConflict: 'lead_id,platform' }
      )
    }
  }

  return NextResponse.json({ success: true, lead: { id, status } })
}
