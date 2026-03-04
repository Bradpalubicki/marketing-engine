import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { inngest } from '@/inngest/client'
import { createAttributionRecord } from '@/lib/attribution'

const leadCreateSchema = z.object({
  first_name: z.string().min(1),
  phone: z.string().regex(/^\d{10}$/),
  service_interest: z.enum(['mens_health', 'hormone_optimization', 'primary_care', 'wellness']),
  zip: z.string().regex(/^\d{5}$/),
  location_id: z.string().uuid(),
  landing_page_id: z.string().uuid().optional(),
  gclid: z.string().optional().nullable(),
  fbclid: z.string().optional().nullable(),
  msclkid: z.string().optional().nullable(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as unknown
    const parsed = leadCreateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }

    const data = parsed.data

    const cookieHeader = req.headers.get('cookie') ?? ''
    const cookies = cookieHeader.split(';').reduce<Record<string, string>>((acc, c) => {
      const [k, v] = c.trim().split('=')
      if (k && v) acc[k] = decodeURIComponent(v)
      return acc
    }, {})

    const gclid = data.gclid ?? cookies['_gclid'] ?? null
    const fbclid = data.fbclid ?? cookies['_fbclid'] ?? null
    const msclkid = data.msclkid ?? cookies['_msclkid'] ?? null
    const fbp = cookies['_fbp'] ?? null

    const utmSource = cookies['_utm_source'] ?? null
    const utmMedium = cookies['_utm_medium'] ?? null
    const utmCampaign = cookies['_utm_campaign'] ?? null

    const { data: location, error: locationError } = await supabaseAdmin
      .from('locations')
      .select('id, org_id, name, phone, callrail_phone')
      .eq('id', data.location_id)
      .single()

    if (locationError || !location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .insert({
        location_id: data.location_id,
        org_id: location.org_id,
        source: 'form',
        first_name: data.first_name,
        phone: data.phone,
        gclid,
        fbclid,
        msclkid,
        fbp,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        landing_page_id: data.landing_page_id ?? null,
        status: 'new',
      })
      .select()
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
    }

    const leadSource = gclid ? 'google' : msclkid ? 'microsoft' : fbclid ? 'meta' : null
    await createAttributionRecord(lead.id, data.location_id, leadSource, null)

    await inngest.send({
      name: 'lead/created',
      data: {
        leadId: lead.id,
        firstName: data.first_name,
        phone: data.phone,
        locationName: location.name,
        bookingLink: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/book/${data.location_id}`,
      },
    })

    if (data.landing_page_id) {
      supabaseAdmin
        .from('landing_pages')
        .update({ conversions: 1 })
        .eq('id', data.landing_page_id)
        .then(() => null, () => null)
    }

    return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
