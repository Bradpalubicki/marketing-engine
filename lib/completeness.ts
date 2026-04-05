// lib/completeness.ts
// Completeness score calculator for client_intelligence records
// Spec: Client Intelligence Data Schema v1 — 2026-04-05

type ClientIntelligence = {
  target_cpl?: number | null
  avg_transaction_value?: number | null
  close_rate_pct?: number | null
  primary_offer?: string | null
  proof_point?: string | null
  offer_urgency?: string | null
  secondary_services?: string[] | null
  price_position?: string | null
  competitor_names?: string[] | null
  geographic_radius_miles?: number | null
  service_area_type?: string | null
  website_url?: string | null
  phone_number?: string | null
  vertical_tag?: string | null
}

export type CompletenessResult = {
  score: number
  breakdown: Record<string, number>
  can_launch: boolean
  smart_bidding_eligible: boolean
  missing_high_priority: string[]
}

const FIELD_WEIGHTS: Record<string, number> = {
  target_cpl: 20,
  avg_transaction_value: 15,
  primary_offer: 15,
  website_url: 10,
  proof_point: 10,
  competitor_names: 10,
  geographic_radius_miles: 5,
  close_rate_pct: 5,
  vertical_tag: 5,
  offer_urgency: 3,
  secondary_services: 3,
  price_position: 4,
  service_area_type: 3,
  phone_number: 3,
}

const MAX_SCORE = 100
const LAUNCH_THRESHOLD = 60
const SMART_BIDDING_THRESHOLD = 80

export function calculateCompleteness(data: ClientIntelligence): CompletenessResult {
  const breakdown: Record<string, number> = {}
  let raw = 0

  for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
    const value = data[field as keyof ClientIntelligence]
    let awarded = 0

    if (Array.isArray(value)) {
      awarded = value.length >= 1 ? weight : 0
    } else if (field === 'vertical_tag') {
      awarded = value && value !== 'general' ? weight : 0
    } else {
      awarded = value !== null && value !== undefined && value !== '' ? weight : 0
    }

    breakdown[field] = awarded
    raw += awarded
  }

  const score = Math.min(raw, MAX_SCORE)
  const missing_high_priority = Object.entries(FIELD_WEIGHTS)
    .filter(([field, weight]) => weight >= 10 && breakdown[field] === 0)
    .map(([field]) => field)

  return {
    score,
    breakdown,
    can_launch: score >= LAUNCH_THRESHOLD,
    smart_bidding_eligible: score >= SMART_BIDDING_THRESHOLD && !!data.target_cpl,
    missing_high_priority,
  }
}
