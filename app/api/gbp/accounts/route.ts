import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

async function getAccessToken(): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GBP_CLIENT_ID!,
      client_secret: process.env.GBP_CLIENT_SECRET!,
      refresh_token: process.env.GBP_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  })
  const data = (await response.json()) as { access_token?: string; error?: string }
  if (!data.access_token) {
    throw new Error(`Token refresh failed: ${data.error ?? 'unknown'}`)
  }
  return data.access_token
}

interface GBPAccount {
  name: string
  accountName: string
  type: string
  state: { status: string }
}

interface GBPLocation {
  name: string
  title: string
  storefrontAddress?: { locality?: string; administrativeArea?: string }
}

export interface GBPLocationResult {
  accountId: string
  accountName: string
  locationId: string
  locationName: string
  locationResourceName: string
  city?: string
  state?: string
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.GBP_REFRESH_TOKEN) {
    return NextResponse.json({ error: 'GBP not connected' }, { status: 400 })
  }

  try {
    const token = await getAccessToken()

    // List accounts
    const accountsRes = await fetch(
      'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!accountsRes.ok) {
      const err = await accountsRes.text()
      return NextResponse.json({ error: `Failed to list accounts: ${err}` }, { status: 500 })
    }

    const accountsData = (await accountsRes.json()) as { accounts?: GBPAccount[] }
    const accounts = accountsData.accounts ?? []

    const results: GBPLocationResult[] = []

    for (const account of accounts) {
      const accountId = account.name.replace('accounts/', '')

      const locRes = await fetch(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title,storefrontAddress`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (!locRes.ok) continue

      const locData = (await locRes.json()) as { locations?: GBPLocation[] }
      const locations = locData.locations ?? []

      for (const loc of locations) {
        const locationId = loc.name.split('/').pop() ?? loc.name
        results.push({
          accountId,
          accountName: account.accountName,
          locationId,
          locationName: loc.title,
          locationResourceName: loc.name,
          city: loc.storefrontAddress?.locality,
          state: loc.storefrontAddress?.administrativeArea,
        })
      }
    }

    return NextResponse.json({ locations: results })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
