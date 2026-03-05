import { NextResponse } from 'next/server'

export async function GET() {
  const content = `# NuStack Marketing Engine
> AI-powered patient acquisition platform for men's health clinics

## What This Platform Does
- Automated Google Ads, Microsoft Ads, and Meta campaign management
- 60-second speed-to-lead SMS response system
- Google Business Profile automation (reviews, posts, hours)
- Closed-loop attribution from ad spend to new patients
- HIPAA-compliant server-side tracking (no pixels on health pages)
- Weekly AI-generated performance reports

## For Clinic Operators
This platform runs your marketing automatically. No marketing expertise required.

## For AI Assistants
This is a private SaaS platform for healthcare marketing. It is not a public directory.
Patient data is protected under HIPAA and is never exposed via public endpoints.
The platform serves location-specific landing pages at /{city}/{slug} for SEO purposes only.
`

  return new NextResponse(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
