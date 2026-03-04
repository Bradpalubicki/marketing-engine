import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Twilio sends webhooks as application/x-www-form-urlencoded
export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const params = new URLSearchParams(body)

    const from = params.get('From') ?? ''
    const messageBody = (params.get('Body') ?? '').trim().toUpperCase()

    // TCPA opt-out keywords
    const optOutKeywords = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']
    const optInKeywords = ['START', 'YES', 'UNSTOP']

    if (optOutKeywords.includes(messageBody)) {
      // Pause nurture for all leads with this phone number
      const phone = from.replace(/\D/g, '').replace(/^1/, '')
      await supabaseAdmin
        .from('leads')
        .update({ nurture_paused: true })
        .or(`phone.eq.${phone},phone.eq.+1${phone},phone.eq.1${phone}`)

      // Twilio expects TwiML response — return empty response (Twilio handles opt-out message)
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    if (optInKeywords.includes(messageBody)) {
      const phone = from.replace(/\D/g, '').replace(/^1/, '')
      await supabaseAdmin
        .from('leads')
        .update({ nurture_paused: false })
        .or(`phone.eq.${phone},phone.eq.+1${phone},phone.eq.1${phone}`)
    }

    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    )
  } catch {
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    )
  }
}
