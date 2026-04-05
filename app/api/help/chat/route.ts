import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { join } from 'path'

const client = new Anthropic()

export async function POST(req: Request) {
  const { messages } = await req.json() as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  }

  if (!messages || !Array.isArray(messages)) {
    return Response.json({ error: 'messages array required' }, { status: 400 })
  }

  // Read the operating manual at runtime — fresh on every request
  const manualPath = join(process.cwd(), 'public/help/operating-manual.html')
  let manualText = ''
  try {
    const manualHtml = readFileSync(manualPath, 'utf-8')
    // Strip HTML tags and normalize whitespace
    manualText = manualHtml
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  } catch {
    manualText = 'Operating manual not found.'
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `You are the NuStack Marketing Engine Help Agent.
You have access to the complete Marketing Engine Operating Manual below.
Answer any question Brad asks about how to use the platform.
Be specific. Reference the exact section when relevant (e.g., "Section 11 — What Runs Automatically").
If the answer is not in the manual, say so directly — do not guess or make up features.
Keep answers concise. Brad is an expert — skip preamble, go straight to the answer.
If Brad asks about something that should exist but doesn't appear in the manual, flag it as a possible gap.

--- OPERATING MANUAL ---
${manualText}
--- END MANUAL ---`,
    messages,
  })

  const content = response.content[0]
  return Response.json({
    content: content.type === 'text' ? content.text : '',
  })
}
