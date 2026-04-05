// SEM Bible — MP5: CallRail Integration (SEM attribution)
// Evaluates call duration against vertical threshold → logs to sem_search_term_log
// Returns 200 always — no webhook retries

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { parseWebhook } from '@/lib/callrail'
import { getCallThreshold } from '@/lib/sem/call-thresholds'

export async function POST(req: NextRequest) {
  // Validate webhook secret
  const webhookSecret = process.env.CALLRAIL_WEBHOOK_SECRET
  if (webhookSecret) {
    const sig = req.headers.get('x-callrail-secret') ?? req.headers.get('x-callrail-signature')
    if (!sig || sig !== webhookSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let body: Record<string, unknown>
  try {
    body = await req.json() as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 200 })
  }

  const webhook = parseWebhook(body)

  // Only process call_completed events
  const eventType = String(body.event_type ?? body.type ?? 'call_completed')
  if (!eventType.includes('call_completed') && !eventType.includes('call.completed')) {
    return NextResponse.json({ skipped: true, reason: 'not call_completed' }, { status: 200 })
  }

  try {
    // Look up org + vertical via callrail tracker
    const { data: tracker } = await supabaseAdmin
      .from('callrail_trackers')
      .select('location_id, locations(id, org_id, organizations(id, vertical: google_ads_customer_id))')
      .eq('callrail_tracker_id', webhook.tracker_id)
      .single()

    // Resolve org_id and vertical
    const locationData = (tracker as Record<string, unknown> | null)?.locations as
      | { id: string; org_id: string }
      | undefined

    const orgId = locationData?.org_id ?? null

    // Get vertical from compliance profile
    let vertical = 'default'
    if (orgId) {
      const { data: profile } = await supabaseAdmin
        .from('sem_client_compliance_profiles')
        .select('vertical')
        .eq('org_id', orgId)
        .single()
      if (profile?.vertical) vertical = profile.vertical
    }

    const threshold = getCallThreshold(vertical)
    const isConversion = webhook.duration >= threshold

    // Extract SEM attribution from call UTM params (passed via CallRail keyword tracking)
    const searchTerm = String(body.keywords ?? body.utm_term ?? body.keyword ?? '')
    const gclid = String(body.gclid ?? body.utm_content ?? '')
    const campaignId = String(body.utm_campaign ?? body.campaign_id ?? 'unknown')

    // Log to sem_search_term_log
    if (orgId && searchTerm) {
      await supabaseAdmin.from('sem_search_term_log').insert({
        org_id: orgId,
        campaign_id: campaignId,
        search_term: searchTerm,
        clicks: 1,
        conversions: isConversion ? 1 : 0,
        cost: 0, // cost pulled separately from Google Ads API
        attribution_source: gclid ? 'gclid' : 'callrail',
      })
    }

    return NextResponse.json({
      success: true,
      duration: webhook.duration,
      threshold,
      isConversion,
      vertical,
    })
  } catch {
    // Always 200 — no retries
    return NextResponse.json({ error: 'Processing failed' }, { status: 200 })
  }
}
