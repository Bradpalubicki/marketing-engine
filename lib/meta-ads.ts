const META_BASE = 'https://graph.facebook.com/v19.0'

function getSystemToken(): string {
  return process.env.META_SYSTEM_USER_TOKEN!
}

export async function createCampaign(
  adAccountId: string,
  params: {
    name: string
    objective: string
    status: string
    dailyBudget: number
  }
): Promise<string> {
  const token = getSystemToken()
  const response = await fetch(
    `${META_BASE}/act_${adAccountId}/campaigns`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: params.name,
        objective: params.objective,
        status: params.status,
        special_ad_categories: ['NONE'],
        daily_budget: Math.round(params.dailyBudget * 100),
      }),
    }
  )
  if (!response.ok) {
    throw new Error(`Meta campaign creation failed: ${response.status}`)
  }
  const data = (await response.json()) as { id: string }
  return data.id
}

export async function uploadOfflineConversion(params: {
  datasetId: string
  fbc: string
  conversionName: string
  eventTime: number
  value: number
  currency: string
}): Promise<void> {
  const token = getSystemToken()
  const response = await fetch(
    `${META_BASE}/${params.datasetId}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: [
          {
            event_name: params.conversionName,
            event_time: params.eventTime,
            action_source: 'system_generated',
            user_data: {
              fbc: params.fbc,
            },
            value: params.value,
            currency: params.currency,
          },
        ],
      }),
    }
  )
  if (!response.ok) {
    throw new Error(`Meta offline conversion upload failed: ${response.status}`)
  }
}

export async function getCampaignInsights(
  adAccountId: string,
  dateRange: { start: string; end: string }
): Promise<Array<{ campaignId: string; spend: number; impressions: number; clicks: number }>> {
  const token = getSystemToken()
  const response = await fetch(
    `${META_BASE}/act_${adAccountId}/insights?fields=campaign_id,spend,impressions,clicks&time_range={"since":"${dateRange.start}","until":"${dateRange.end}"}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )
  if (!response.ok) {
    throw new Error(`Meta insights fetch failed: ${response.status}`)
  }
  const data = (await response.json()) as {
    data: Array<{ campaign_id: string; spend: string; impressions: string; clicks: string }>
  }
  return data.data.map(r => ({
    campaignId: r.campaign_id,
    spend: Number(r.spend),
    impressions: Number(r.impressions),
    clicks: Number(r.clicks),
  }))
}
