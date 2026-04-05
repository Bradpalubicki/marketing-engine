import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import * as jose from 'jose'

const querySchema = z.object({
  token: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
})

const THANK_YOU_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Thank You — Lead Quality Rating</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #fff; border-radius: 12px; padding: 48px 40px; max-width: 420px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 700; color: #1e293b; margin: 0 0 8px; }
    p { font-size: 15px; color: #64748b; margin: 0; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#9989;</div>
    <h1>Thank you!</h1>
    <p>Your lead quality rating has been recorded. This helps us improve your campaign performance.</p>
  </div>
</body>
</html>`

const ALREADY_RATED_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Already Rated</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #fff; border-radius: 12px; padding: 48px 40px; max-width: 420px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 700; color: #1e293b; margin: 0 0 8px; }
    p { font-size: 15px; color: #64748b; margin: 0; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#8505;&#65039;</div>
    <h1>Already submitted</h1>
    <p>You have already rated lead quality for this week. Only one rating per week is recorded.</p>
  </div>
</body>
</html>`

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse({
    token: searchParams.get('token'),
    rating: searchParams.get('rating'),
  })

  if (!parsed.success) {
    return new NextResponse('Invalid request — missing token or rating.', { status: 400, headers: { 'Content-Type': 'text/plain' } })
  }

  const { token, rating } = parsed.data

  // Verify JWT signature
  const secret = process.env.JWT_SECRET
  if (!secret) {
    return new NextResponse('Server configuration error.', { status: 500, headers: { 'Content-Type': 'text/plain' } })
  }

  let orgId: string
  let weekDate: string

  try {
    const secretKey = new TextEncoder().encode(secret)
    const { payload } = await jose.jwtVerify(token, secretKey)
    orgId = payload.orgId as string
    weekDate = payload.weekDate as string

    if (!orgId || !weekDate) {
      throw new Error('Missing payload fields')
    }
  } catch {
    return new NextResponse('Invalid or expired rating link.', { status: 401, headers: { 'Content-Type': 'text/plain' } })
  }

  // Check if already rated for this org + week
  const { data: existing } = await supabaseAdmin
    .from('leads_quality_ratings')
    .select('id')
    .eq('org_id', orgId)
    .eq('week_date', weekDate)
    .single()

  if (existing) {
    return new NextResponse(ALREADY_RATED_HTML, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  // Write rating
  const { error } = await supabaseAdmin
    .from('leads_quality_ratings')
    .insert({
      org_id: orgId,
      week_date: weekDate,
      rating,
      token,
    })

  if (error) {
    // Handle unique constraint race condition gracefully
    if (error.code === '23505') {
      return new NextResponse(ALREADY_RATED_HTML, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })
    }
    return new NextResponse('Failed to record rating. Please try again.', { status: 500, headers: { 'Content-Type': 'text/plain' } })
  }

  return new NextResponse(THANK_YOU_HTML, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  })
}

/**
 * Token generation helper — call this at report send time.
 * Generates 5 separate rating URLs (1–5) to embed in the weekly email.
 *
 * Usage:
 *   const urls = await generateRatingUrls(orgId, weekDate)
 *   // urls[1] = rating 1 link, urls[5] = rating 5 link
 */
export async function generateRatingUrls(
  orgId: string,
  weekDate: string
): Promise<Record<number, string>> {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET not set')

  const secretKey = new TextEncoder().encode(secret)
  const token = await new jose.SignJWT({ orgId, weekDate })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secretKey)

  const baseUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/leads/rate-quality?token=${token}&rating=`

  return {
    1: `${baseUrl}1`,
    2: `${baseUrl}2`,
    3: `${baseUrl}3`,
    4: `${baseUrl}4`,
    5: `${baseUrl}5`,
  }
}
