import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { updateAttributionRecord } from '@/lib/attribution'

const appointmentWebhookSchema = z.object({
  lead_id: z.string().uuid(),
  status: z.enum(['booked', 'showed', 'no_showed', 'cancelled']),
  appointment_id: z.string().optional(),
  revenue: z.number().optional(),
  webhook_secret: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('x-webhook-secret')
  const expectedSecret = process.env.APPOINTMENTS_WEBHOOK_SECRET
  if (expectedSecret && authHeader !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json() as unknown
    const parsed = appointmentWebhookSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const data = parsed.data

    const leadStatusMap: Record<string, string> = {
      booked: 'booked',
      showed: 'showed',
      no_showed: 'no_showed',
      cancelled: 'new',
    }

    const updates: Record<string, unknown> = {
      status: leadStatusMap[data.status] ?? 'new',
      updated_at: new Date().toISOString(),
    }

    if (data.appointment_id) updates['appointment_id'] = data.appointment_id
    if (data.revenue !== undefined) updates['appointment_revenue'] = data.revenue

    await supabaseAdmin
      .from('leads')
      .update(updates)
      .eq('id', data.lead_id)

    const attrUpdates: Record<string, string | number> = {}
    if (data.status === 'booked') attrUpdates['booked_at'] = new Date().toISOString()
    if (data.status === 'showed') attrUpdates['showed_at'] = new Date().toISOString()
    if (data.revenue !== undefined) attrUpdates['revenue'] = data.revenue

    if (Object.keys(attrUpdates).length > 0) {
      await updateAttributionRecord(data.lead_id, attrUpdates)
    }

    if (data.status === 'booked' || data.status === 'showed') {
      const { data: lead } = await supabaseAdmin
        .from('leads')
        .select('gclid, fbclid, fbp')
        .eq('id', data.lead_id)
        .single()

      if (lead?.gclid) {
        await supabaseAdmin.from('offline_conversion_queue').insert({
          lead_id: data.lead_id,
          platform: 'google',
          conversion_name: data.status === 'showed' ? 'patient_showed' : 'consultation_booked',
          conversion_time: new Date().toISOString(),
          conversion_value: data.revenue ?? 0,
          gclid: lead.gclid,
          status: 'pending',
        })
      }

      if (lead?.fbclid) {
        await supabaseAdmin.from('offline_conversion_queue').insert({
          lead_id: data.lead_id,
          platform: 'meta',
          conversion_name: data.status === 'showed' ? 'PatientShowed' : 'ConsultationBooked',
          conversion_time: new Date().toISOString(),
          conversion_value: data.revenue ?? 0,
          fbc: lead.fbclid,
          status: 'pending',
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
