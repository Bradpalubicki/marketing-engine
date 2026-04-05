// SEM Bible — Ch 2, 21, 27-30: Client Compliance Profile
// CA Directives: PMax min $90/day, TCPA required, vertical compliance = hard block

export interface ClientComplianceProfile {
  id: string
  org_id: string
  vertical: string
  completeness_score: number
  launch_blocked: boolean
  tcpa_confirmed: boolean
  hipaa_pixel_guard_enabled: boolean
  pmax_daily_budget: number
  vertical_compliance_passed: boolean
}

/**
 * PMax eligibility: completeness >= 80 AND daily budget >= $90.
 * CA Directive: PMax minimum = $90/day. Never recommend PMax below this threshold.
 */
export function isPMaxEligible(profile: ClientComplianceProfile): boolean {
  return (
    profile.completeness_score >= 80 &&
    profile.pmax_daily_budget >= 90
  )
}

/**
 * 60% gate — enough client intel to generate copy, keywords, and campaign structure.
 * Unlocks the campaign builder UI. Does NOT authorize ad spend.
 */
export function isCampaignBuildReady(org: { completeness_score: number }): boolean {
  return org.completeness_score >= 60
}

/**
 * 100% gate — all compliance fields confirmed including TCPA.
 * Required before any campaign goes live and spends client money.
 * Controlled by launch_blocked field on organization.
 */
export function isAdSpendReady(org: { completeness_score: number; tcpa_confirmed: boolean }): boolean {
  return org.completeness_score === 100 && org.tcpa_confirmed === true
}

/**
 * Computes whether the compliance profile should hard-block ad spend.
 * Vertical compliance failure = hard block (red gate badge, not yellow).
 * Uses isAdSpendReady — launch_blocked = true only when isAdSpendReady returns false.
 */
export function computeLaunchBlocked(profile: Omit<ClientComplianceProfile, 'launch_blocked'>): boolean {
  if (!profile.tcpa_confirmed) return true
  if (!profile.vertical_compliance_passed) return true
  if (!isAdSpendReady(profile)) return true
  return false
}

/**
 * TCPA is a required field for completeness score to reach 100.
 * Returns the adjusted score — caps at 99 if tcpa_confirmed is false.
 */
export function getAdjustedCompletenessScore(
  rawScore: number,
  tcpaConfirmed: boolean
): number {
  if (!tcpaConfirmed && rawScore >= 100) return 99
  return rawScore
}
