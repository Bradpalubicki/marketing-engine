import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { parseWebhook } from '@/lib/callrail'
import { inngest } from '@/inngest/client'
import { createAttributionRecord } from '@/lib/attribution'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>
    const webhook = parseWebhook(body)

    const { data: tracker } = await supabaseAdmin
      .from('callrail_trackers')
      .select('location_id, locations(id, org_id, name, phone)')
      .eq('callrail_tracker_id', webhook.tracker_id)
      .single()

    if (!tracker) {
      return NextResponse.json({ error: 'Tracker not found' }, { status: 200 })
    }

    const location = (tracker as unknown as { locations?: { id: string; org_id: string; name: string; phone: string } }).locations

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 200 })
    }

    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .insert({
        location_id: location.id,
        org_id: location.org_id,
        source: 'call',
        phone: webhook.caller_number,
        callrail_call_id: String(body.id ?? ''),
        status: 'new',
      })
      .select()
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Failed to create lead' }, { status: 200 })
    }

    await createAttributionRecord(lead.id, location.id, null, null)

    await inngest.send({
      name: 'lead/created',
      data: {
        leadId: lead.id,
        firstName: 'there',
        phone: webhook.caller_number,
        locationName: location.name,
        bookingLink: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/book/${location.id}`,
      },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 200 })
  }
}
