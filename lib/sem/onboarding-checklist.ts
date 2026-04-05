// SEM Bible — Ch 53: Onboarding-to-First-Campaign Timeline
// CA Directive: TCPA Day 1 gate, GHL UTM Day 2, Matomo healthcare delay
// Freshpaint → Matomo per CA Directive (Freshpaint replaced with Matomo everywhere)

export interface OnboardingChecklistItem {
  day: number
  id: string
  label: string
  description: string
  required: boolean
  blocksActivation: boolean
  vertical?: string // only applies to this vertical if set
}

export const ONBOARDING_CHECKLIST: OnboardingChecklistItem[] = [
  // Day 1 — hard gates
  {
    day: 1,
    id: 'tcpa_opt_in_confirmed',
    label: 'TCPA Opt-In Language Confirmed',
    description:
      'Confirm TCPA opt-in language is present on all lead capture forms. Campaign cannot activate without this.',
    required: true,
    blocksActivation: true,
  },
  {
    day: 1,
    id: 'org_profile_complete',
    label: 'Organization Profile Complete',
    description: 'Vertical, locations, and billing confirmed.',
    required: true,
    blocksActivation: true,
  },
  {
    day: 1,
    id: 'google_ads_access',
    label: 'Google Ads Account Access Granted',
    description: 'Client has added NuStack MCC as manager on their Google Ads account.',
    required: true,
    blocksActivation: true,
  },

  // Day 2 — technical setup
  {
    day: 2,
    id: 'ghl_utm_script',
    label: 'GHL UTM Hidden Field Script Installed',
    description:
      'Install GHL UTM hidden field script on all landing pages — required before campaign activation.',
    required: true,
    blocksActivation: true,
  },
  {
    day: 2,
    id: 'callrail_tracker_configured',
    label: 'CallRail Tracker Configured',
    description: 'CallRail number swapping script active on all landing pages.',
    required: true,
    blocksActivation: false,
  },
  {
    day: 2,
    id: 'landing_page_score',
    label: 'Landing Page Score ≥ 65',
    description: 'SiteGrade LP audit must score ≥65 before campaign activates.',
    required: true,
    blocksActivation: true,
  },

  // Day 3-5 — healthcare vertical only
  {
    day: 3,
    id: 'matomo_phi_review',
    label: 'Matomo PHI-Safe Pixel Configuration Review',
    description:
      'Healthcare vertical adds 3-5 days for Matomo PHI-safe pixel configuration review + BAA execution if required.',
    required: true,
    blocksActivation: true,
    vertical: 'healthcare',
  },

  // Day 5 — campaign readiness
  {
    day: 5,
    id: 'compliance_profile_complete',
    label: 'Compliance Profile Complete (100/100)',
    description: 'All compliance fields confirmed, launch_blocked set to false.',
    required: true,
    blocksActivation: true,
  },
  {
    day: 5,
    id: 'preflight_passed',
    label: 'Pre-Flight Engine Passed',
    description: 'All pre-flight checks pass: bid strategy, TCPA, LP score, no auto-apply recommendations.',
    required: true,
    blocksActivation: true,
  },
]

/**
 * Returns checklist items for a given vertical.
 * Universal items + vertical-specific items included.
 */
export function getChecklistForVertical(vertical: string): OnboardingChecklistItem[] {
  return ONBOARDING_CHECKLIST.filter(
    (item) => item.vertical === undefined || item.vertical === vertical
  )
}

/**
 * Returns items that block campaign activation.
 */
export function getActivationBlockers(vertical: string): OnboardingChecklistItem[] {
  return getChecklistForVertical(vertical).filter((item) => item.blocksActivation)
}
