import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import twilio from 'twilio'

const TWIML_EMPTY = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'

function validateTwilioSignature(req: NextRequest, body: string): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) return false

  const signature = req.headers.get('x-twilio-signature') ?? ''
  const url = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio`
    : req.url

  const params: Record<string, string> = {}
  new URLSearchParams(body).forEach((value, key) => {
    params[key] = value
  })

  return twilio.validateRequest(authToken, signature, url, params)
}

// Twilio sends webhooks as application/x-www-form-urlencoded
export async function POST(req: NextRequest) {
  try {
    const body = await req.text()

    // Validate Twilio signature to prevent spoofed opt-outs
    if (process.env.TWILIO_AUTH_TOKEN) {
      const isValid = validateTwilioSignature(req, body)
      if (!isValid) {
        return new NextResponse(TWIML_EMPTY, { headers: { 'Content-Type': 'text/xml' }, status: 403 })
      }
    }

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
      return new NextResponse(TWIML_EMPTY, { headers: { 'Content-Type': 'text/xml' } })
    }

    if (optInKeywords.includes(messageBody)) {
      const phone = from.replace(/\D/g, '').replace(/^1/, '')
      await supabaseAdmin
        .from('leads')
        .update({ nurture_paused: false })
        .or(`phone.eq.${phone},phone.eq.+1${phone},phone.eq.1${phone}`)
    }

    return new NextResponse(TWIML_EMPTY, { headers: { 'Content-Type': 'text/xml' } })
  } catch {
    return new NextResponse(TWIML_EMPTY, { headers: { 'Content-Type': 'text/xml' } })
  }
}
