'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  useVerticalClassifier,
  VerticalClassifierBadge,
} from '@/components/dashboard/VerticalClassifierBadge'
import type { VerticalClassification } from '@/app/api/intake/classify-vertical/route'

// Completeness score weights — from Chapter 9 spec
const FIELD_WEIGHTS = {
  target_cpl: 20,
  avg_transaction_value: 15,
  geographic_targeting: 15,
  primary_offer: 15,
  proof_point: 10,
  competitor_names: 10,
  website_url: 10,
  compliance_vertical: 5,
} as const

const intakeSchema = z.object({
  business_description: z.string().min(5, 'Describe what you sell (at least 5 characters)'),
  target_cpl: z.string().optional(),
  avg_transaction_value: z.string().optional(),
  geographic_targeting: z.string().optional(),
  primary_offer: z.string().optional(),
  proof_point: z.string().optional(),
  competitor_names: z.string().optional(),
  website_url: z.string().optional(),
})

type IntakeFormValues = z.infer<typeof intakeSchema>

interface IntakeFormProps {
  orgId: string
  initialValues?: Partial<IntakeFormValues>
  onComplete?: (score: number) => void
}

function calculateScore(values: IntakeFormValues, hasComplianceVertical: boolean): number {
  let score = 0
  if (values.target_cpl?.trim()) score += FIELD_WEIGHTS.target_cpl
  if (values.avg_transaction_value?.trim()) score += FIELD_WEIGHTS.avg_transaction_value
  if (values.geographic_targeting?.trim()) score += FIELD_WEIGHTS.geographic_targeting
  if (values.primary_offer?.trim()) score += FIELD_WEIGHTS.primary_offer
  if (values.proof_point?.trim()) score += FIELD_WEIGHTS.proof_point
  if (values.competitor_names?.trim()) score += FIELD_WEIGHTS.competitor_names
  if (values.website_url?.trim()) score += FIELD_WEIGHTS.website_url
  if (hasComplianceVertical) score += FIELD_WEIGHTS.compliance_vertical
  return score
}

const MISSING_FIELD_LABELS: Record<keyof Omit<IntakeFormValues, 'business_description'>, string> = {
  target_cpl: 'Target CPL',
  avg_transaction_value: 'Average transaction value',
  geographic_targeting: 'Geographic targeting',
  primary_offer: 'Primary offer',
  proof_point: 'Proof point / differentiator',
  competitor_names: 'Competitor identification',
  website_url: 'Website / LP URL',
}

export function IntakeForm({ orgId, initialValues, onComplete }: IntakeFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [classifiedVertical, setClassifiedVertical] = useState<VerticalClassification | null>(null)

  const { classification, classifying, classifyAnswer, setClassification } = useVerticalClassifier(
    (c) => setClassifiedVertical(c)
  )

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<IntakeFormValues>({
    resolver: zodResolver(intakeSchema),
    defaultValues: initialValues ?? {},
  })

  const watchedValues = watch()
  const hasComplianceVertical = classifiedVertical?.compliance_profile_required ?? false
  const score = calculateScore(watchedValues, hasComplianceVertical)

  const missingFields = (Object.entries(MISSING_FIELD_LABELS) as [keyof typeof MISSING_FIELD_LABELS, string][])
    .filter(([key]) => !watchedValues[key]?.trim())
    .map(([, label]) => label)

  const scoreColor =
    score >= 80
      ? 'bg-green-100 text-green-800'
      : score >= 60
        ? 'bg-blue-100 text-blue-800'
        : 'bg-amber-100 text-amber-800'

  const progressWidth = `${score}%`

  async function onSubmit(rawValues: IntakeFormValues) {
    setSubmitting(true)
    setSubmitError(null)

    // Re-compute score at submit time (mirrors real-time score)
    const finalScore = calculateScore(rawValues, hasComplianceVertical)

    try {
      const payload = {
        orgId,
        business_description: rawValues.business_description,
        target_cpl: rawValues.target_cpl?.trim() ? Number(rawValues.target_cpl) : null,
        avg_transaction_value: rawValues.avg_transaction_value?.trim() ? Number(rawValues.avg_transaction_value) : null,
        geographic_targeting: rawValues.geographic_targeting ?? null,
        primary_offer: rawValues.primary_offer ?? null,
        proof_point: rawValues.proof_point ?? null,
        website_url: rawValues.website_url ?? null,
        vertical: classifiedVertical?.vertical ?? null,
        is_regulated_vertical: classifiedVertical?.is_regulated ?? false,
        compliance_profile_required: classifiedVertical?.compliance_profile_required ?? false,
        onboarding_completeness_score: finalScore,
        competitor_names: rawValues.competitor_names
          ? rawValues.competitor_names.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      }

      const res = await fetch('/api/intake/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(err.error ?? 'Failed to save intake')
      }

      setSubmitted(true)
      onComplete?.(finalScore)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-4xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {score >= 60 ? 'Ready to launch!' : 'Intake saved'}
          </h2>
          <p className="text-gray-500 text-sm">
            {score >= 80
              ? 'Full campaign structure will be built automatically.'
              : score >= 60
                ? `Score: ${score}/100 — partial launch authorized. Missing fields have been flagged.`
                : `Score: ${score}/100 — please complete the missing fields to unlock launch.`}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Completeness Score */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Completeness Score</span>
            <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${scoreColor}`}>
              {score}/100
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-blue-500' : 'bg-amber-500'
              }`}
              style={{ width: progressWidth }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {score >= 80
              ? 'Full launch authorized'
              : score >= 60
                ? 'Partial launch authorized — complete missing fields for full campaign'
                : `Below 60 — complete ${missingFields.slice(0, 2).join(', ')} to unlock launch`}
          </p>
        </CardContent>
      </Card>

      {/* Stage 1: Business Fundamentals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stage 1 — Business Fundamentals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="business_description">
              What do you sell? <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="business_description"
              placeholder="Describe your business, services, or products in plain language..."
              className="mt-1"
              rows={3}
              {...register('business_description')}
              onBlur={(e) => {
                void classifyAnswer(e.target.value)
              }}
            />
            {errors.business_description && (
              <p className="text-xs text-red-500 mt-1">{errors.business_description.message}</p>
            )}
            <VerticalClassifierBadge classification={classification} classifying={classifying} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="target_cpl">Target cost per lead ($)</Label>
              <Input
                id="target_cpl"
                type="number"
                min="1"
                placeholder="e.g. 75"
                className="mt-1"
                {...register('target_cpl')}
              />
              {errors.target_cpl && (
                <p className="text-xs text-red-500 mt-1">{errors.target_cpl.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="avg_transaction_value">Average transaction value ($)</Label>
              <Input
                id="avg_transaction_value"
                type="number"
                min="1"
                placeholder="e.g. 2000"
                className="mt-1"
                {...register('avg_transaction_value')}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="geographic_targeting">Geographic targeting</Label>
            <Input
              id="geographic_targeting"
              placeholder="e.g. Dallas metro, ZIP 75201-75250, or Texas statewide"
              className="mt-1"
              {...register('geographic_targeting')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stage 2: Competitive Position */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stage 2 — Competitive Position</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="primary_offer">Primary offer</Label>
            <Input
              id="primary_offer"
              placeholder="e.g. Free TRT consultation, No-obligation estimate"
              className="mt-1"
              {...register('primary_offer')}
            />
          </div>
          <div>
            <Label htmlFor="proof_point">Strongest proof point / differentiator</Label>
            <Input
              id="proof_point"
              placeholder="e.g. 500+ 5-star reviews, 15 years in business, same-day service"
              className="mt-1"
              {...register('proof_point')}
            />
          </div>
          <div>
            <Label htmlFor="competitor_names">Top competitors (comma-separated)</Label>
            <Input
              id="competitor_names"
              placeholder="e.g. Competitor A, Competitor B, Competitor C"
              className="mt-1"
              {...register('competitor_names')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stage 3: Digital Assets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stage 3 — Digital Assets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="website_url">Website / Landing page URL</Label>
            <Input
              id="website_url"
              type="url"
              placeholder="https://yoursite.com"
              className="mt-1"
              {...register('website_url')}
            />
            {errors.website_url && (
              <p className="text-xs text-red-500 mt-1">{errors.website_url.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Missing fields summary (only shown when score < 80) */}
      {score < 80 && missingFields.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-amber-800 mb-2">
              Missing fields ({missingFields.length}):
            </p>
            <ul className="text-sm text-amber-700 list-disc list-inside space-y-0.5">
              {missingFields.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
            {score >= 60 && (
              <p className="text-xs text-amber-600 mt-2">
                Score is above 60 — you can launch now, but completing these fields improves campaign performance.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {submitError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {submitError}
        </p>
      )}

      <Button
        type="submit"
        disabled={submitting}
        className="w-full"
        size="lg"
      >
        {submitting
          ? 'Saving...'
          : score >= 60
            ? `Save & Launch (${score}/100)`
            : `Save Progress (${score}/100 — below launch threshold)`}
      </Button>
    </form>
  )
}
