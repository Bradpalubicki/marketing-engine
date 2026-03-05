'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { updateAttributionRecord } from '@/lib/attribution'
import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import twilio from 'twilio'

export async function updateLeadStatus(leadId: string, status: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  await supabaseAdmin
    .from('leads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', leadId)

  const now = new Date().toISOString()
  if (status === 'booked') await updateAttributionRecord(leadId, { booked_at: now })
  if (status === 'showed') await updateAttributionRecord(leadId, { showed_at: now })

  // Queue offline conversion if booked or showed
  if (status === 'booked' || status === 'showed') {
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('gclid, fbclid')
      .eq('id', leadId)
      .single()

    if (lead?.gclid) {
      await supabaseAdmin.from('offline_conversion_queue').upsert(
        {
          lead_id: leadId,
          platform: 'google',
          conversion_name: status === 'showed' ? 'patient_showed' : 'consultation_booked',
          conversion_time: now,
          gclid: lead.gclid,
          status: 'pending',
        },
        { onConflict: 'lead_id,platform' }
      )
    }
    if (lead?.fbclid) {
      await supabaseAdmin.from('offline_conversion_queue').upsert(
        {
          lead_id: leadId,
          platform: 'meta',
          conversion_name: status === 'showed' ? 'PatientShowed' : 'ConsultationBooked',
          conversion_time: now,
          fbc: lead.fbclid,
          status: 'pending',
        },
        { onConflict: 'lead_id,platform' }
      )
    }
  }

  revalidatePath(`/dashboard/leads/${leadId}`)
  revalidatePath('/dashboard/leads')
}

export async function resendLeadSMS(leadId: string): Promise<{ success: boolean; error?: string }> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('phone, first_name, location_id, nurture_paused, locations(name)')
    .eq('id', leadId)
    .single()

  if (!lead) return { success: false, error: 'Lead not found' }
  if (!lead.phone) return { success: false, error: 'No phone number on record' }
  if (lead.nurture_paused) return { success: false, error: 'Nurture is paused for this lead (STOP received)' }

  const locationName = (lead.locations as { name?: string } | null)?.name ?? 'our clinic'
  const message = `Hi ${lead.first_name ?? 'there'}, this is a follow-up from ${locationName}. We'd love to get you scheduled for your free consultation. Reply STOP to opt out.`

  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
    await client.messages.create({
      from: process.env.TWILIO_FROM_NUMBER!,
      to: lead.phone.startsWith('+') ? lead.phone : `+1${lead.phone}`,
      body: message,
    })

    // Log nurture event
    const existingEvents = await supabaseAdmin
      .from('nurture_events')
      .select('step')
      .eq('lead_id', leadId)
      .order('step', { ascending: false })
      .limit(1)

    const nextStep = ((existingEvents.data?.[0]?.step) ?? 0) + 1

    await supabaseAdmin.from('nurture_events').insert({
      lead_id: leadId,
      step: nextStep,
      type: 'sms',
      status: 'sent',
      content: message,
      sent_at: new Date().toISOString(),
    })

    revalidatePath(`/dashboard/leads/${leadId}`)
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
