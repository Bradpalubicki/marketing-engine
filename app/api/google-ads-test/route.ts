import { NextResponse } from 'next/server'

const GOOGLE_ADS_BASE = 'https://googleads.googleapis.com/v19'

async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json() as { access_token?: string; error?: string }
  if (!data.access_token) throw new Error(`OAuth failed: ${JSON.stringify(data)}`)
  return data.access_token
}

export async function GET() {
  const results: Record<string, unknown> = {}

  // Step 1: OAuth token
  try {
    const token = await getAccessToken()
    results.oauth = { ok: true, token_preview: token.slice(0, 20) + '...' }

    // Step 2: List accessible accounts under MCC
    const mccId = process.env.GOOGLE_ADS_MCC_CUSTOMER_ID!
    const listRes = await fetch(
      `${GOOGLE_ADS_BASE}/customers/${mccId}/googleAds:searchStream`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
          'login-customer-id': mccId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `SELECT customer_client.id, customer_client.descriptive_name, customer_client.status FROM customer_client WHERE customer_client.manager = false`,
        }),
      }
    )

    const listData = await listRes.json()

    if (!listRes.ok) {
      results.accounts = { ok: false, status: listRes.status, error: listData }
    } else {
      const accounts = (listData as Array<{ results?: Array<{ customerClient: { id: string; descriptiveName: string; status: string } }> }>)
        .flatMap(chunk => chunk.results ?? [])
        .map(r => ({
          id: r.customerClient.id,
          name: r.customerClient.descriptiveName,
          status: r.customerClient.status,
        }))
      results.accounts = { ok: true, count: accounts.length, accounts }
    }
  } catch (err) {
    results.oauth = { ok: false, error: String(err) }
  }

  const allOk = Object.values(results).every((r) => (r as { ok: boolean }).ok)

  return NextResponse.json({
    success: allOk,
    mcc: process.env.GOOGLE_ADS_MCC_CUSTOMER_ID,
    results,
  }, { status: allOk ? 200 : 500 })
}
