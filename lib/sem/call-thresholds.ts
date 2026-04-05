// SEM Bible — Ch 42: Call Duration Thresholds (canonical map)
// CA Directive: dental = 60s (NOT 90s). See Ch 23 cross-reference fix.

export const CALL_DURATION_THRESHOLDS: Record<string, number> = {
  dental: 60,
  healthcare: 90,
  legal: 120,
  hvac: 60,
  home_services: 60,
  default: 60,
}

/**
 * Returns the duration threshold (in seconds) for a given vertical.
 * Falls back to 'default' if vertical not found.
 */
export function getCallThreshold(vertical: string): number {
  return CALL_DURATION_THRESHOLDS[vertical] ?? CALL_DURATION_THRESHOLDS.default
}
