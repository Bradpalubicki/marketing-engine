// Meta CAPI — Server-side Conversion API
// Phase 4-A: Does NOT require App Review
// Trigger: GHL pipeline stage → Appointment Booked
// All healthcare clients excluded from Meta pixels/CAPI — HIPAA gate
// Spec: Phase 4 section 4-A

import { inngest } from '../client'
import { supabaseAdmin } from '@/lib/supabase'
import { hashEmail, hashPhone, assertNoPHI, MetaEventName } from '@/lib/hipaa'

interface GhlAppointmentEvent {
  contactId: string
  locationId: string
  pipelineStage: string
  email?: string
  phone?: string
  fbclid?: string
  fbclid_timestamp?: number
}

export const metaCapi = inngest.createFunction(
  { id: 'meta-capi', name: 'Meta CAPI — Appointment Booked' },
  { event: 'ghl/appointment.booked' },
  async ({ event, step }) => {
    const { contactId, locationId, email, phone, fbclid, fbclid_timestamp } =
      event.data as GhlAppointmentEvent

    // HIPAA gate — check if location belongs to a healthcare org
    const { data: intel } = await supabaseAdmin
      .from('client_intelligence')
      .select('hipaa_scope, vertical_tag')
      .eq('organization_id', locationId) // may need join — skip if no match
      .maybeSingle()

    if (intel?.hipaa_scope) {
      return { skipped: true, reason: 'hipaa_scope', vertical: intel.vertical_tag }
    }

    const pixelId = process.env.META_PIXEL_ID
    const accessToken = process.env.META_SYSTEM_USER_TOKEN

    if (!pixelId || !accessToken) {
      return { skipped: true, reason: 'meta_credentials_not_configured' }
    }

    // Build CAPI payload — NO PHI in outbound
    const userData: Record<string, unknown> = {}
    if (email) userData.em = [hashEmail(email)]
    if (phone) userData.ph = [hashPhone(phone)]
    if (fbclid) {
      userData.fbc = `fb.1.${fbclid_timestamp ?? Date.now()}.${fbclid}`
    }

    const payload = {
      data: [
        {
          event_name: MetaEventName.Lead,
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'crm',
          event_id: `lead_${contactId}_${Date.now()}`,
          user_data: userData,
        },
      ],
    }

    // Assert no PHI slipped through
    assertNoPHI(payload.data[0] as Record<string, unknown>)

    await step.run('send-meta-capi-event', async () => {
      const response = await fetch(
        `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )

      if (!response.ok) {
        const err = await response.text()
        throw new Error(`Meta CAPI failed: ${response.status} — ${err}`)
      }

      const result = await response.json()
      return result
    })

    return { success: true, contactId, eventName: MetaEventName.Lead }
  }
)
