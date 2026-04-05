// SEM Bible — Pre-Flight Engine
// CA Directives: eCPC deprecated Oct 2024, TCPA = hard block, LP score gate >= 65

import type { ClientComplianceProfile } from './compliance'

export type PreflightSeverity = 'BLOCK' | 'WARN'

export interface PreflightFailure {
  check: string
  message: string
  severity: PreflightSeverity
}

export interface PreflightResult {
  passed: boolean
  failures: PreflightFailure[]
}

export interface PreflightCampaignInput {
  bidStrategy: string
  lpScore?: number
  lpImprovements?: string[]
  autoApplyRecommendationsEnabled?: boolean
}

/**
 * Runs all pre-flight checks before campaign activation.
 * Any BLOCK severity failure = passed: false.
 */
export function runPreflightChecks(
  campaign: PreflightCampaignInput,
  complianceProfile: ClientComplianceProfile
): PreflightResult {
  const failures: PreflightFailure[] = []

  // eCPC deprecated Oct 2024 — CA Directive #1
  if (campaign.bidStrategy === 'eCPC') {
    failures.push({
      check: 'BID_STRATEGY',
      message: 'eCPC deprecated Oct 2024. Switch to Manual CPC or Target CPA.',
      severity: 'BLOCK',
    })
  }

  // TCPA gate — CA Directive implicit
  if (!complianceProfile.tcpa_confirmed) {
    failures.push({
      check: 'TCPA',
      message: 'TCPA opt-in language not confirmed on lead capture forms.',
      severity: 'BLOCK',
    })
  }

  // LP score gate — CA Directive #5: gate >= 65
  const lpScore = campaign.lpScore ?? 0
  if (lpScore < 65) {
    const improvements = campaign.lpImprovements ?? []
    failures.push({
      check: 'LP_SCORE',
      message: `Landing page score ${lpScore}/100. Minimum 65 required. Improve: ${improvements.join(', ')}`,
      severity: 'BLOCK',
    })
  }

  // Google auto-apply recommendations — flag if enabled
  if (campaign.autoApplyRecommendationsEnabled === true) {
    failures.push({
      check: 'AUTO_APPLY_RECOMMENDATIONS',
      message:
        'Auto-apply recommendations are enabled on this Google Ads account. Disable immediately — these override manual bid strategies and budgets without approval.',
      severity: 'BLOCK',
    })
  }

  const hasBlock = failures.some((f) => f.severity === 'BLOCK')

  return {
    passed: !hasBlock,
    failures,
  }
}
