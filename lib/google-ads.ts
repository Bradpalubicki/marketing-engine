const GOOGLE_ADS_BASE = 'https://googleads.googleapis.com/v17'

async function getGoogleAccessToken(): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  })
  const data = (await response.json()) as { access_token: string }
  return data.access_token
}

function getHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    'login-customer-id': process.env.GOOGLE_ADS_MCC_CUSTOMER_ID!,
    'Content-Type': 'application/json',
  }
}

export async function createCampaign(
  customerId: string,
  params: {
    name: string
    dailyBudgetMicros: number
    biddingStrategy: string
  }
): Promise<string> {
  const token = await getGoogleAccessToken()
  const response = await fetch(
    `${GOOGLE_ADS_BASE}/customers/${customerId}/campaigns:mutate`,
    {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({
        operations: [
          {
            create: {
              name: params.name,
              advertisingChannelType: 'SEARCH',
              status: 'PAUSED',
              campaignBudget: {
                amountMicros: params.dailyBudgetMicros,
                deliveryMethod: 'STANDARD',
              },
              biddingStrategyType: params.biddingStrategy,
            },
          },
        ],
      }),
    }
  )
  if (!response.ok) {
    throw new Error(`Google Ads campaign creation failed: ${response.status}`)
  }
  const data = (await response.json()) as { results: Array<{ resourceName: string }> }
  return data.results[0].resourceName
}

export async function pauseCampaign(customerId: string, campaignId: string): Promise<void> {
  const token = await getGoogleAccessToken()
  const response = await fetch(
    `${GOOGLE_ADS_BASE}/customers/${customerId}/campaigns:mutate`,
    {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({
        operations: [
          {
            update: {
              resourceName: `customers/${customerId}/campaigns/${campaignId}`,
              status: 'PAUSED',
            },
            updateMask: 'status',
          },
        ],
      }),
    }
  )
  if (!response.ok) {
    throw new Error(`Google Ads pause failed: ${response.status}`)
  }
}

export async function updateCampaignBudget(
  customerId: string,
  budgetId: string,
  dailyBudgetMicros: number
): Promise<void> {
  const token = await getGoogleAccessToken()
  const response = await fetch(
    `${GOOGLE_ADS_BASE}/customers/${customerId}/campaignBudgets:mutate`,
    {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({
        operations: [
          {
            update: {
              resourceName: `customers/${customerId}/campaignBudgets/${budgetId}`,
              amountMicros: dailyBudgetMicros,
            },
            updateMask: 'amount_micros',
          },
        ],
      }),
    }
  )
  if (!response.ok) {
    throw new Error(`Google Ads budget update failed: ${response.status}`)
  }
}

export async function uploadOfflineConversion(params: {
  customerId: string
  gclid: string
  conversionName: string
  conversionTime: string
  conversionValue: number
}): Promise<void> {
  const token = await getGoogleAccessToken()
  const response = await fetch(
    `${GOOGLE_ADS_BASE}/customers/${params.customerId}/conversionUploads:uploadClickConversions`,
    {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({
        conversions: [
          {
            gclid: params.gclid,
            conversionAction: `customers/${params.customerId}/conversionActions/${params.conversionName}`,
            conversionDateTime: params.conversionTime,
            conversionValue: params.conversionValue,
          },
        ],
        partialFailure: true,
      }),
    }
  )
  if (!response.ok) {
    throw new Error(`Google Ads offline conversion upload failed: ${response.status}`)
  }
}

export async function getCampaignSpend(
  customerId: string,
  dateRange: { start: string; end: string }
): Promise<Array<{ campaignId: string; spend: number; impressions: number; clicks: number }>> {
  const token = await getGoogleAccessToken()
  const query = `
    SELECT campaign.id, metrics.cost_micros, metrics.impressions, metrics.clicks
    FROM campaign
    WHERE segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'
  `
  const response = await fetch(
    `${GOOGLE_ADS_BASE}/customers/${customerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ query }),
    }
  )
  if (!response.ok) {
    throw new Error(`Google Ads spend fetch failed: ${response.status}`)
  }
  const data = (await response.json()) as Array<{
    results?: Array<{
      campaign: { id: string }
      metrics: { cost_micros: string; impressions: string; clicks: string }
    }>
  }>
  const results = data[0]?.results ?? []
  return results.map(r => ({
    campaignId: r.campaign.id,
    spend: Number(r.metrics.cost_micros) / 1_000_000,
    impressions: Number(r.metrics.impressions),
    clicks: Number(r.metrics.clicks),
  }))
}
