import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { IntakeForm } from './IntakeForm'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const { orgId } = await auth()
  if (!orgId) redirect('/sign-in')

  // Resolve Clerk org_id to internal org record
  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('id, name, vertical, target_cpl, avg_transaction_value, primary_offer, proof_point, website_url, onboarding_completeness_score')
    .eq('clerk_org_id', orgId)
    .single()

  if (!org) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-500">Organization not found. Contact support.</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Campaign Intake</h1>
        <p className="text-gray-500 mt-1">
          Complete your intake to unlock your campaign. Higher completeness = better performance from day one.
        </p>
      </div>

      <IntakeForm
        orgId={org.id}
        initialValues={{
          target_cpl: org.target_cpl ?? undefined,
          avg_transaction_value: org.avg_transaction_value ?? undefined,
          primary_offer: org.primary_offer ?? undefined,
          proof_point: org.proof_point ?? undefined,
          website_url: org.website_url ?? undefined,
        }}
      />
    </div>
  )
}
