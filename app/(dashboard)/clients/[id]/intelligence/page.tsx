'use client'

// Client Intelligence Intake — 5-stage progressive form
// Auto-saves on blur. No submit button. Score updates in real time.

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { CompletenessScore } from '@/components/intelligence/CompletenessScore'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface IntelligenceData {
  business_name?: string
  primary_service?: string
  service_location_city?: string
  target_cpl?: number | null
  avg_transaction_value?: number | null
  monthly_budget?: number | null
  close_rate_pct?: number | null
  primary_offer?: string
  offer_urgency?: string
  proof_point?: string
  secondary_services?: string[]
  price_position?: string
  competitor_names?: string[]
  geographic_radius_miles?: number | null
  service_area_type?: string
  num_locations?: number | null
  website_url?: string
  phone_number?: string
  gbp_listing_url?: string
  vertical_tag?: string
  completeness?: {
    score: number
    can_launch: boolean
    smart_bidding_eligible: boolean
    missing_high_priority: string[]
  }
}

const STAGES = [
  { id: 1, label: 'Ignition' },
  { id: 2, label: 'Economics' },
  { id: 3, label: 'Offer' },
  { id: 4, label: 'Market' },
  { id: 5, label: 'Digital' },
]

const VERTICAL_OPTIONS = [
  'hvac', 'dental', 'legal', 'mens-health', 'medical', 'chiropractic',
  'physical-therapy', 'veterinary', 'real-estate', 'roofing', 'plumbing',
  'electrical', 'landscaping', 'pest-control', 'general',
]

export default function ClientIntelligencePage() {
  const params = useParams()
  const orgId = params.id as string

  const [data, setData] = useState<IntelligenceData>({})
  const [activeStage, setActiveStage] = useState(1)
  const [unlockedStages, setUnlockedStages] = useState<Set<number>>(new Set([1]))
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [loading, setLoading] = useState(true)

  // Load existing data
  useEffect(() => {
    fetch(`/api/clients/${orgId}/intelligence`)
      .then((r) => (r.status === 404 ? null : r.json()))
      .then((d) => {
        if (d) {
          setData(d)
          // Unlock stages based on existing data
          const unlocked = new Set([1])
          if (d.business_name && d.primary_service && d.service_location_city) {
            unlocked.add(2); unlocked.add(3); unlocked.add(4); unlocked.add(5)
          }
          setUnlockedStages(unlocked)
        }
      })
      .finally(() => setLoading(false))
  }, [orgId])

  const save = useCallback(
    async (patch: Partial<IntelligenceData>) => {
      setSaveState('saving')
      try {
        const res = await fetch(`/api/clients/${orgId}/intelligence`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        })
        if (!res.ok) throw new Error('Save failed')
        const updated = await res.json()
        setData((prev) => ({ ...prev, ...updated }))
        setSaveState('saved')
        setTimeout(() => setSaveState('idle'), 2000)

        // Unlock Stage 2+ after Stage 1 complete
        if (updated.business_name && updated.primary_service && updated.service_location_city) {
          setUnlockedStages(new Set([1, 2, 3, 4, 5]))
        }
      } catch {
        setSaveState('error')
        setTimeout(() => setSaveState('idle'), 3000)
      }
    },
    [orgId]
  )

  const handleBlur = (field: string, value: string | number | null | string[]) => {
    if (value === '' || value === null || value === undefined) return
    save({ [field]: value })
  }

  const stageComplete = (stage: number): boolean => {
    switch (stage) {
      case 1: return !!(data.business_name && data.primary_service && data.service_location_city)
      case 2: return !!(data.target_cpl && data.avg_transaction_value)
      case 3: return !!(data.primary_offer)
      case 4: return !!(data.geographic_radius_miles && data.service_area_type)
      case 5: return !!(data.website_url)
      default: return false
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: '#888' }}>
        Loading...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 32, padding: '32px 40px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Main form */}
      <div style={{ flex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e8e8e8', marginBottom: 4 }}>
            Client Intelligence
          </h1>
          <p style={{ color: '#888', fontSize: 14 }}>
            Fill in client details to unlock campaign targeting. Auto-saves on each field.
          </p>
        </div>

        {/* Stage tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid #2a2a2a', paddingBottom: 0 }}>
          {STAGES.map((stage) => {
            const unlocked = unlockedStages.has(stage.id)
            const complete = stageComplete(stage.id)
            const active = activeStage === stage.id
            return (
              <button
                key={stage.id}
                onClick={() => unlocked && setActiveStage(stage.id)}
                disabled={!unlocked}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: active ? '#F5C842' : unlocked ? '#e8e8e8' : '#444',
                  background: 'none',
                  border: 'none',
                  borderBottom: active ? '2px solid #F5C842' : '2px solid transparent',
                  cursor: unlocked ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: -1,
                }}
              >
                {stage.id}. {stage.label}
                {complete && <span style={{ color: '#F5C842', fontSize: 11 }}>✓</span>}
              </button>
            )
          })}
        </div>

        {/* Save indicator */}
        <div style={{ height: 20, marginBottom: 16, fontSize: 12, color: saveState === 'error' ? '#ef4444' : '#888' }}>
          {saveState === 'saving' && 'Saving...'}
          {saveState === 'saved' && '✓ Saved'}
          {saveState === 'error' && 'Save failed — check connection'}
        </div>

        {/* Stage 1 — Ignition */}
        {activeStage === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Field
              label="Business name"
              defaultValue={data.business_name ?? ''}
              onBlur={(v) => handleBlur('business_name', v)}
            />
            <Field
              label="Primary service"
              placeholder="e.g. Residential HVAC repair"
              defaultValue={data.primary_service ?? ''}
              onBlur={(v) => handleBlur('primary_service', v)}
            />
            <Field
              label="Service location city"
              defaultValue={data.service_location_city ?? ''}
              onBlur={(v) => handleBlur('service_location_city', v)}
            />
          </div>
        )}

        {/* Stage 2 — Economics */}
        {activeStage === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <NumberField
              label="Max cost per lead (USD)"
              prefix="$"
              defaultValue={data.target_cpl ?? undefined}
              onBlur={(v) => handleBlur('target_cpl', v)}
            />
            <NumberField
              label="Average client value (USD)"
              prefix="$"
              defaultValue={data.avg_transaction_value ?? undefined}
              onBlur={(v) => handleBlur('avg_transaction_value', v)}
            />
            <NumberField
              label="Monthly ad budget (USD)"
              prefix="$"
              defaultValue={data.monthly_budget ?? undefined}
              onBlur={(v) => handleBlur('monthly_budget', v)}
            />
            <NumberField
              label="Lead-to-client close rate"
              suffix="%"
              defaultValue={data.close_rate_pct ?? undefined}
              onBlur={(v) => handleBlur('close_rate_pct', v)}
            />
          </div>
        )}

        {/* Stage 3 — Offer + Differentiation */}
        {activeStage === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Field
              label="Primary offer"
              placeholder="e.g. Same-day HVAC repair"
              defaultValue={data.primary_offer ?? ''}
              onBlur={(v) => handleBlur('primary_offer', v)}
            />
            <SelectField
              label="Offer urgency"
              options={['evergreen', 'seasonal', 'limited']}
              value={data.offer_urgency ?? ''}
              onChange={(v) => { setData((p) => ({ ...p, offer_urgency: v })); save({ offer_urgency: v }) }}
            />
            <Field
              label="Proof point"
              placeholder="e.g. 500+ 5-star reviews, 20 years in business"
              defaultValue={data.proof_point ?? ''}
              onBlur={(v) => handleBlur('proof_point', v)}
            />
            <TagField
              label="Secondary services (comma-separated)"
              defaultValue={(data.secondary_services ?? []).join(', ')}
              onBlur={(tags) => save({ secondary_services: tags })}
            />
            <SelectField
              label="Price positioning"
              options={['budget', 'mid-market', 'premium']}
              value={data.price_position ?? ''}
              onChange={(v) => { setData((p) => ({ ...p, price_position: v })); save({ price_position: v }) }}
            />
          </div>
        )}

        {/* Stage 4 — Market Intelligence */}
        {activeStage === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <TagField
              label="Competitor names (up to 5)"
              defaultValue={(data.competitor_names ?? []).join(', ')}
              maxTags={5}
              onBlur={(tags) => save({ competitor_names: tags })}
            />
            <NumberField
              label="Service radius"
              suffix="miles"
              defaultValue={data.geographic_radius_miles ?? undefined}
              onBlur={(v) => handleBlur('geographic_radius_miles', v)}
            />
            <SelectField
              label="Service area type"
              options={['single-location', 'multi-location', 'regional', 'national']}
              value={data.service_area_type ?? ''}
              onChange={(v) => { setData((p) => ({ ...p, service_area_type: v })); save({ service_area_type: v }) }}
            />
            {(data.service_area_type === 'multi-location') && (
              <NumberField
                label="Number of locations"
                defaultValue={data.num_locations ?? undefined}
                onBlur={(v) => handleBlur('num_locations', v)}
              />
            )}
          </div>
        )}

        {/* Stage 5 — Digital Assets */}
        {activeStage === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Field
              label="Website URL"
              placeholder="https://"
              defaultValue={data.website_url ?? ''}
              onBlur={(v) => handleBlur('website_url', v)}
            />
            <Field
              label="Phone number"
              defaultValue={data.phone_number ?? ''}
              onBlur={(v) => handleBlur('phone_number', v)}
            />
            <Field
              label="Google Business Profile URL (optional)"
              placeholder="https://maps.google.com/..."
              defaultValue={data.gbp_listing_url ?? ''}
              onBlur={(v) => handleBlur('gbp_listing_url', v)}
            />
            <SelectField
              label="Vertical / industry"
              options={VERTICAL_OPTIONS}
              value={data.vertical_tag ?? ''}
              onChange={(v) => { setData((p) => ({ ...p, vertical_tag: v })); save({ vertical_tag: v }) }}
            />
          </div>
        )}
      </div>

      {/* Score sidebar */}
      <div style={{ width: 280, flexShrink: 0, paddingTop: 80 }}>
        {data.completeness ? (
          <CompletenessScore
            score={data.completeness.score}
            can_launch={data.completeness.can_launch}
            smart_bidding_eligible={data.completeness.smart_bidding_eligible}
            missing_high_priority={data.completeness.missing_high_priority}
          />
        ) : (
          <CompletenessScore score={0} can_launch={false} smart_bidding_eligible={false} missing_high_priority={[]} />
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({
  label, defaultValue, placeholder, onBlur,
}: {
  label: string
  defaultValue: string
  placeholder?: string
  onBlur: (v: string) => void
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </label>
      <input
        defaultValue={defaultValue}
        placeholder={placeholder}
        onBlur={(e) => { if (e.target.value.trim()) onBlur(e.target.value.trim()) }}
        style={inputStyle}
      />
    </div>
  )
}

function NumberField({
  label, defaultValue, prefix, suffix, onBlur,
}: {
  label: string
  defaultValue?: number
  prefix?: string
  suffix?: string
  onBlur: (v: number) => void
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {prefix && <span style={{ position: 'absolute', left: 12, color: '#888', fontSize: 14 }}>{prefix}</span>}
        <input
          type="number"
          defaultValue={defaultValue}
          onBlur={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onBlur(v) }}
          style={{ ...inputStyle, paddingLeft: prefix ? 28 : 12, paddingRight: suffix ? 52 : 12 }}
        />
        {suffix && <span style={{ position: 'absolute', right: 12, color: '#888', fontSize: 13 }}>{suffix}</span>}
      </div>
    </div>
  )
}

function SelectField({
  label, options, value, onChange,
}: {
  label: string
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
        <option value="">Select...</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function TagField({
  label, defaultValue, maxTags, onBlur,
}: {
  label: string
  defaultValue: string
  maxTags?: number
  onBlur: (tags: string[]) => void
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </label>
      <input
        defaultValue={defaultValue}
        placeholder="comma, separated, values"
        onBlur={(e) => {
          const tags = e.target.value.split(',').map((t) => t.trim()).filter(Boolean)
          const limited = maxTags ? tags.slice(0, maxTags) : tags
          if (limited.length > 0) onBlur(limited)
        }}
        style={inputStyle}
      />
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#1a1a1a',
  border: '1px solid #2a2a2a',
  borderRadius: 6,
  padding: '10px 12px',
  color: '#e8e8e8',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
}
