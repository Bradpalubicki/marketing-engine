const GBP_BASE_URL = 'https://mybusiness.googleapis.com/v4'

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
  const data = (await response.json()) as { access_token: string }
  return data.access_token
}

export interface GBPReview {
  reviewId: string
  reviewer: { displayName: string; profilePhotoUrl?: string }
  starRating: string
  comment?: string
  createTime: string
}

export interface GBPProfileData {
  name: string
  metadata?: {
    mapsUri?: string
    newReviewUri?: string
  }
  regularHours?: unknown
}

export async function fetchProfile(accountId: string, locationId: string): Promise<GBPProfileData> {
  const token = await getAccessToken()
  const response = await fetch(
    `${GBP_BASE_URL}/accounts/${accountId}/locations/${locationId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )
  if (!response.ok) {
    throw new Error(`GBP profile fetch failed: ${response.status}`)
  }
  return response.json() as Promise<GBPProfileData>
}

export async function fetchReviews(accountId: string, locationId: string): Promise<GBPReview[]> {
  const token = await getAccessToken()
  const response = await fetch(
    `${GBP_BASE_URL}/accounts/${accountId}/locations/${locationId}/reviews`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )
  if (!response.ok) {
    throw new Error(`GBP reviews fetch failed: ${response.status}`)
  }
  const data = (await response.json()) as { reviews?: GBPReview[] }
  return data.reviews ?? []
}

export async function replyToReview(
  accountId: string,
  locationId: string,
  reviewId: string,
  response: string
): Promise<void> {
  const token = await getAccessToken()
  const res = await fetch(
    `${GBP_BASE_URL}/accounts/${accountId}/locations/${locationId}/reviews/${reviewId}/reply`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ comment: response }),
    }
  )
  if (!res.ok) {
    throw new Error(`GBP reply failed: ${res.status}`)
  }
}

export async function createPost(
  accountId: string,
  locationId: string,
  post: {
    summary: string
    callToActionType: string
    topicType: string
  }
): Promise<void> {
  const token = await getAccessToken()
  const res = await fetch(
    `${GBP_BASE_URL}/accounts/${accountId}/locations/${locationId}/localPosts`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: post.summary,
        topicType: post.topicType,
        callToAction: { actionType: post.callToActionType },
      }),
    }
  )
  if (!res.ok) {
    throw new Error(`GBP post creation failed: ${res.status}`)
  }
}

export async function updateHours(
  accountId: string,
  locationId: string,
  hours: Record<string, unknown>
): Promise<void> {
  const token = await getAccessToken()
  const res = await fetch(
    `${GBP_BASE_URL}/accounts/${accountId}/locations/${locationId}?updateMask=regularHours`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ regularHours: hours }),
    }
  )
  if (!res.ok) {
    throw new Error(`GBP hours update failed: ${res.status}`)
  }
}
