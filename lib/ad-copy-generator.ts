import Anthropic from '@anthropic-ai/sdk'
import { checkCompliance, sanitizeCopy } from './compliance'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM_PROMPT = `You are generating compliant healthcare advertising copy.
Never use: testosterone cypionate, enanthate, propionate, or any specific Rx drug names.
Never use 'prescription' with drug names.
Focus on: men's health, wellness, optimization, energy, vitality.
Keep all copy professional, compliant, and focused on patient outcomes.
Never make specific medical claims or guarantees.`

interface RSACopy {
  headlines: string[]
  descriptions: string[]
}

interface MetaCopy {
  primaryText: string
  headline: string
  description: string
}

interface GBPPost {
  summary: string
  callToActionType: string
  type: 'STANDARD' | 'EVENT' | 'OFFER'
}

interface ReviewResponse {
  response: string
}

function ensureCompliance(text: string): string {
  const result = checkCompliance(text)
  if (!result.passed) {
    return sanitizeCopy(text)
  }
  return text
}

export async function generateRSACopy(locationName: string, serviceType: string): Promise<RSACopy> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Generate Google Responsive Search Ad copy for ${locationName}, a ${serviceType} clinic.

Return exactly this JSON format:
{
  "headlines": ["headline1", "headline2", ...] (15 headlines, max 30 chars each),
  "descriptions": ["desc1", "desc2", "desc3", "desc4"] (4 descriptions, max 90 chars each)
}

Focus on: men's health, hormone optimization, energy, vitality, wellness. No Rx drug names.`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON in response')

  const parsed = JSON.parse(jsonMatch[0]) as RSACopy

  return {
    headlines: parsed.headlines.map(h => ensureCompliance(h)),
    descriptions: parsed.descriptions.map(d => ensureCompliance(d)),
  }
}

export async function generateMetaCopy(locationName: string, serviceType: string): Promise<MetaCopy> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Generate Meta ad copy for ${locationName}, a ${serviceType} clinic.

Return exactly this JSON:
{
  "primaryText": "...(max 125 chars)",
  "headline": "...(max 40 chars)",
  "description": "...(max 30 chars)"
}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON in response')

  const parsed = JSON.parse(jsonMatch[0]) as MetaCopy

  return {
    primaryText: ensureCompliance(parsed.primaryText),
    headline: ensureCompliance(parsed.headline),
    description: ensureCompliance(parsed.description),
  }
}

export async function generateGBPPosts(locationName: string, city: string): Promise<GBPPost[]> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Generate 4 Google Business Profile posts for ${locationName} in ${city}.

Return exactly this JSON array:
[
  {"summary": "...", "callToActionType": "BOOK", "type": "STANDARD"},
  {"summary": "...", "callToActionType": "LEARN_MORE", "type": "STANDARD"},
  {"summary": "...", "callToActionType": "BOOK", "type": "OFFER"},
  {"summary": "...", "callToActionType": "LEARN_MORE", "type": "STANDARD"}
]

Types: seasonal update, service highlight, educational, promotional. Each summary max 1500 chars.`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  const jsonMatch = content.text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('No JSON array in response')

  const parsed = JSON.parse(jsonMatch[0]) as GBPPost[]
  return parsed.map(p => ({ ...p, summary: ensureCompliance(p.summary) }))
}

export async function generateReviewResponse(
  reviewerName: string,
  rating: number,
  reviewText: string
): Promise<ReviewResponse> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    system: `${SYSTEM_PROMPT}
CRITICAL: Never acknowledge a patient relationship. Never reference specific medical conditions or treatments mentioned in the review. Be professional, warm, and HIPAA-compliant.`,
    messages: [
      {
        role: 'user',
        content: `Write a HIPAA-safe response to this ${rating}-star review from ${reviewerName}:
"${reviewText}"

Rules:
- Do NOT acknowledge they are a patient
- Do NOT reference specific treatments mentioned
- Thank them for feedback
- Invite them to contact the office directly for specific concerns
- Keep under 150 words
- Sound human, not corporate

Return JSON: {"response": "..."}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON in response')

  return JSON.parse(jsonMatch[0]) as ReviewResponse
}

export async function generatePerformanceInsights(
  locationData: Record<string, unknown>[]
): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: 'You are a digital marketing analyst for healthcare clinics. Provide actionable insights.',
    messages: [
      {
        role: 'user',
        content: `Analyze this weekly performance data across clinic locations and provide 3-5 actionable insights:

${JSON.stringify(locationData, null, 2)}

Focus on: lead volume trends, cost efficiency, conversion rates, budget optimization opportunities.
Format as a concise bulleted report.`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') return 'Unable to generate insights.'
  return content.text
}
