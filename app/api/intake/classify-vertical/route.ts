import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const inputSchema = z.object({
  answer: z.string().min(1).max(2000),
})

export interface VerticalClassification {
  vertical: 'hvac' | 'dental' | 'healthcare' | 'legal' | 'fitness' | 'real_estate' | 'ecommerce' | 'restaurant' | 'other'
  is_regulated: boolean
  confidence: 'high' | 'medium' | 'low'
  compliance_profile_required: boolean
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = inputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { answer } = parsed.data

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `You are a vertical classifier for a digital marketing platform.

Given a business description, return a JSON object with:
- vertical: one of ["hvac", "dental", "healthcare", "legal", "fitness", "real_estate", "ecommerce", "restaurant", "other"]
- is_regulated: boolean — true if vertical is healthcare, dental, legal, financial, or real_estate
- confidence: "high" | "medium" | "low"
- compliance_profile_required: boolean — same as is_regulated

Return JSON only. No preamble.

Business description: "${answer.replace(/"/g, '\\"')}"`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Classifier returned no text' }, { status: 500 })
    }

    let classification: VerticalClassification
    try {
      // Strip any accidental markdown code fences
      const cleaned = content.text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '')
      classification = JSON.parse(cleaned) as VerticalClassification
    } catch {
      return NextResponse.json({ error: 'Classifier returned invalid JSON', raw: content.text }, { status: 500 })
    }

    // Validate the parsed result has required fields
    const validVerticals = ['hvac', 'dental', 'healthcare', 'legal', 'fitness', 'real_estate', 'ecommerce', 'restaurant', 'other']
    if (!validVerticals.includes(classification.vertical)) {
      classification.vertical = 'other'
    }

    return NextResponse.json(classification)
  } catch (err) {
    console.error('[classify-vertical] Claude API error:', err)
    return NextResponse.json({ error: 'Classification failed' }, { status: 500 })
  }
}
