import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { inngest } from '@/inngest/client'

const submitSchema = z.object({
  orgId: z.string().uuid(),
  business_description: z.string().min(1),
  target_cpl: z.coerce.number().positive().optional().nullable(),
  avg_transaction_value: z.coerce.number().positive().optional().nullable(),
  geographic_targeting: z.string().optional().nullable(),
  primary_offer: z.string().optional().nullable(),
  proof_point: z.string().optional().nullable(),
  competitor_names: z.array(z.string()).optional().default([]),
  website_url: z.string().url().optional().nullable(),
  vertical: z.string().optional().nullable(),
  is_regulated_vertical: z.boolean().optional().default(false),
  compliance_profile_required: z.boolean().optional().default(false),
  onboarding_completeness_score: z.number().int().min(0).max(100),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = submitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data

  // Update organization with intake data
  const { error: updateError } = await supabaseAdmin
    .from('organizations')
    .update({
      vertical: data.vertical ?? null,
      target_cpl: data.target_cpl ?? null,
      avg_transaction_value: data.avg_transaction_value ?? null,
      primary_offer: data.primary_offer ?? null,
      proof_point: data.proof_point ?? null,
      competitor_names: data.competitor_names.length ? data.competitor_names : null,
      website_url: data.website_url ?? null,
      is_regulated_vertical: data.is_regulated_vertical,
      compliance_profile_required: data.compliance_profile_required,
      onboarding_completeness_score: data.onboarding_completeness_score,
    })
    .eq('id', data.orgId)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to save intake data', details: updateError.message }, { status: 500 })
  }

  // Fire onboarding/completed Inngest event if score >= 60
  if (data.onboarding_completeness_score >= 60) {
    await inngest.send({
      name: 'onboarding/completed',
      data: { orgId: data.orgId, score: data.onboarding_completeness_score },
    })
  }

  // Queue Phase 2 follow-up if score < 80
  if (data.onboarding_completeness_score < 80) {
    await inngest.send({
      name: 'onboarding/incomplete',
      data: {
        orgId: data.orgId,
        score: data.onboarding_completeness_score,
        missingFields: getMissingFields(data),
      },
    })
  }

  return NextResponse.json({
    success: true,
    score: data.onboarding_completeness_score,
    launched: data.onboarding_completeness_score >= 60,
  })
}

function getMissingFields(data: z.infer<typeof submitSchema>): string[] {
  const missing: string[] = []
  if (!data.target_cpl) missing.push('Target CPL')
  if (!data.avg_transaction_value) missing.push('Average transaction value')
  if (!data.geographic_targeting?.trim()) missing.push('Geographic targeting')
  if (!data.primary_offer?.trim()) missing.push('Primary offer')
  if (!data.proof_point?.trim()) missing.push('Proof point / differentiator')
  if (!data.competitor_names?.length) missing.push('Competitor identification')
  if (!data.website_url) missing.push('Website / LP URL')
  return missing
}
