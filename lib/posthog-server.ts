export type ABVariant = 'A' | 'B' | 'C'

// Deterministic hash-based A/B variant assignment
function hashVariant(distinctId: string): ABVariant {
  let hash = 0
  for (let i = 0; i < distinctId.length; i++) {
    const char = distinctId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  const bucket = Math.abs(hash) % 3
  if (bucket === 0) return 'A'
  if (bucket === 1) return 'B'
  return 'C'
}

export async function getLandingPageVariant(distinctId: string): Promise<ABVariant> {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY

  // Try PostHog decide API if key is configured
  if (posthogKey && posthogKey !== 'placeholder' && posthogKey.length > 10) {
    try {
      const res = await fetch('https://us.i.posthog.com/decide?v=3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: posthogKey,
          distinct_id: distinctId,
        }),
        // No cache — always fresh for A/B
        cache: 'no-store',
      })

      if (res.ok) {
        const data = (await res.json()) as {
          featureFlags?: Record<string, string | boolean>
        }
        const flag = data.featureFlags?.['landing-page-variant']
        if (flag === 'B') return 'B'
        if (flag === 'C') return 'C'
        if (flag === 'A' || flag === true) return 'A'
      }
    } catch {
      // fall through to deterministic
    }
  }

  // Deterministic fallback — evenly distributes across A/B/C without external call
  return hashVariant(distinctId)
}
