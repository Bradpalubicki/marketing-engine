'use client'

import { useState } from 'react'
import type { VerticalClassification } from '@/app/api/intake/classify-vertical/route'

const VERTICAL_LABELS: Record<string, string> = {
  hvac: 'HVAC',
  dental: 'Dental',
  healthcare: 'Healthcare',
  legal: 'Legal',
  fitness: 'Fitness / Gym',
  real_estate: 'Real Estate',
  ecommerce: 'E-commerce',
  restaurant: 'Restaurant',
  other: 'Other',
}

interface VerticalClassifierBadgeProps {
  onClassified?: (classification: VerticalClassification) => void
}

export function useVerticalClassifier(onClassified?: (c: VerticalClassification) => void) {
  const [classification, setClassification] = useState<VerticalClassification | null>(null)
  const [classifying, setClassifying] = useState(false)

  async function classifyAnswer(answer: string) {
    if (!answer.trim() || answer.trim().length < 5) return
    setClassifying(true)
    try {
      const res = await fetch('/api/intake/classify-vertical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer }),
      })
      if (!res.ok) return
      const data = (await res.json()) as VerticalClassification
      setClassification(data)
      onClassified?.(data)
    } catch {
      // silent — classifier is enhancement, not blocking
    } finally {
      setClassifying(false)
    }
  }

  return { classification, classifying, classifyAnswer, setClassification }
}

interface BadgeProps {
  classification: VerticalClassification | null
  classifying: boolean
}

export function VerticalClassifierBadge({ classification, classifying }: BadgeProps) {
  if (classifying) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-500">Detecting vertical...</span>
      </div>
    )
  }

  if (!classification) return null

  const label = VERTICAL_LABELS[classification.vertical] ?? classification.vertical
  const confidenceColor =
    classification.confidence === 'high'
      ? 'bg-green-100 text-green-800 border-green-200'
      : classification.confidence === 'medium'
        ? 'bg-blue-100 text-blue-800 border-blue-200'
        : 'bg-gray-100 text-gray-600 border-gray-200'

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${confidenceColor}`}>
          Detected: {label}
        </span>
        <span className="text-xs text-gray-400 capitalize">{classification.confidence} confidence</span>
      </div>

      {classification.compliance_profile_required && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Compliance Notice:</strong> This vertical has advertising compliance requirements. We will apply the appropriate profile automatically — no additional steps needed from you.
          </p>
        </div>
      )}
    </div>
  )
}
