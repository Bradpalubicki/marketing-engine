export function validateInngestConfig(): void {
  const missing: string[] = []

  if (!process.env.INNGEST_EVENT_KEY || process.env.INNGEST_EVENT_KEY === 'placeholder') {
    missing.push('INNGEST_EVENT_KEY')
  }
  if (!process.env.INNGEST_SIGNING_KEY || process.env.INNGEST_SIGNING_KEY === 'placeholder') {
    missing.push('INNGEST_SIGNING_KEY')
  }

  if (missing.length > 0) {
    throw new Error(`Missing required Inngest env vars: ${missing.join(', ')}`)
  }
}
