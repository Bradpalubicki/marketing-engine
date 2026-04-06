'use client'

// CompletenessScore widget — displays score, launch status, follow-up queue

const FIELD_LABELS: Record<string, string> = {
  target_cpl: 'Max cost per lead',
  avg_transaction_value: 'Average client value',
  primary_offer: 'Primary offer',
  website_url: 'Website URL',
  proof_point: 'Social proof point',
  competitor_names: 'Competitor names',
  geographic_radius_miles: 'Service radius',
  close_rate_pct: 'Lead close rate',
  vertical_tag: 'Vertical / industry',
  offer_urgency: 'Offer urgency',
  secondary_services: 'Secondary services',
  price_position: 'Price positioning',
  service_area_type: 'Service area type',
  phone_number: 'Phone number',
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

interface CompletenessScoreProps {
  score: number
  can_launch: boolean
  smart_bidding_eligible: boolean
  missing_high_priority: string[]
}

export function CompletenessScore({
  score,
  can_launch,
  smart_bidding_eligible,
  missing_high_priority,
}: CompletenessScoreProps) {
  const color =
    score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444'

  const statusBadge = smart_bidding_eligible
    ? { label: '⚡ Smart bidding eligible', bg: 'rgba(245,200,66,0.15)', text: '#F5C842' }
    : can_launch
    ? { label: '✅ Ready to launch', bg: 'rgba(34,197,94,0.12)', text: '#22c55e' }
    : { label: '❌ Not ready to launch', bg: 'rgba(239,68,68,0.12)', text: '#ef4444' }

  const missingWithWeights = missing_high_priority
    .filter((f) => FIELD_WEIGHTS[f] !== undefined)
    .sort((a, b) => (FIELD_WEIGHTS[b] ?? 0) - (FIELD_WEIGHTS[a] ?? 0))

  return (
    <div
      style={{
        background: '#1a1a1a',
        border: '1px solid #2a2a2a',
        borderRadius: 12,
        padding: '20px 24px',
        minWidth: 260,
      }}
    >
      {/* Score */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 12 }}>
        <span style={{ fontSize: 48, fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 18, color: '#888' }}>/100</span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 6,
          borderRadius: 3,
          background: '#2a2a2a',
          marginBottom: 12,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${score}%`,
            background: color,
            borderRadius: 3,
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      {/* Status badge */}
      <div
        style={{
          display: 'inline-block',
          padding: '3px 10px',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 600,
          background: statusBadge.bg,
          color: statusBadge.text,
          marginBottom: missingWithWeights.length > 0 ? 16 : 0,
        }}
      >
        {statusBadge.label}
      </div>

      {/* Follow-up queue */}
      {missingWithWeights.length > 0 && (
        <div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#888',
              marginBottom: 8,
            }}
          >
            Complete these to reach 60%:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {missingWithWeights.map((field) => (
              <div
                key={field}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 13,
                }}
              >
                <span style={{ color: '#e8e8e8' }}>
                  {FIELD_LABELS[field] ?? field}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#F5C842',
                    background: 'rgba(245,200,66,0.1)',
                    padding: '1px 7px',
                    borderRadius: 10,
                  }}
                >
                  +{FIELD_WEIGHTS[field]} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
