import { NextResponse } from 'next/server'

const REGISTERED_FUNCTION_IDS = [
  'lead-nurture',
  'campaign-factory',
  'gbp-sync',
  'gbp-reviews',
  'gbp-posts',
  'spend-reporting',
  'budget-pacing',
  'offline-conversions',
  'ai-insights',
]

export async function GET() {
  const inngestEventKey = process.env.INNGEST_EVENT_KEY
  const inngestSigningKey = process.env.INNGEST_SIGNING_KEY

  const missingKeys: string[] = []
  if (!inngestEventKey || inngestEventKey === 'placeholder') missingKeys.push('INNGEST_EVENT_KEY')
  if (!inngestSigningKey || inngestSigningKey === 'placeholder') missingKeys.push('INNGEST_SIGNING_KEY')

  return NextResponse.json({
    status: missingKeys.length === 0 ? 'ok' : 'degraded',
    registeredFunctions: REGISTERED_FUNCTION_IDS,
    count: REGISTERED_FUNCTION_IDS.length,
    missingEnvVars: missingKeys,
    timestamp: new Date().toISOString(),
  })
}
