'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { updateAttributionRecord } from '@/lib/attribution'
import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'

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
