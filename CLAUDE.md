## REPO IDENTITY
ENGINE_NAME=marketing-engine
DOPPLER_PROJECT=marketing-engine
GLOBAL_HUB_PAGE_ID=338663704e40814aaa92fd7293923e4f
LAST_UPDATED=2026-04-16
RUN_QUESTIONS_VERSION=v4.3

## SESSION START PROTOCOL
1. Read this file top to bottom.
2. Extract GLOBAL_HUB_PAGE_ID from REPO IDENTITY block above.
3. Fetch that Notion page in one API call. Read it. Internalize it. Do not summarize aloud.
4. You now have full fleet context. Begin work.
5. Check Agent Inbox (32f663704e4081f3ac93e81a3782412a). Read open tasks. Begin the top task.
6. Do not ask Brad what the system state is. The hub tells you.


## Global Living System

Read this before every session: https://www.notion.so/32f663704e4081afb964eddeab7b40e1
Agent Inbox: https://www.notion.so/32f663704e408181f3ac93e81a3782412a
Day 1 Instructions: https://www.notion.so/32f663704e40819191f8fa501a14b0bf

**Before every build session, run the 10-line Briefing Card check (Global Living System Section 8).**

---

# Marketing Engine — CLAUDE.md

## Project
NuStack Patient Acquisition Engine. PPC + GBP automation for multi-location men's health clinics.
Full Layer 0 spec: `MARKETING-ENGINE-SPEC.md` in this repo root — read before any build work.

## Stack
Next.js 16, Supabase, Clerk (super_admin/org_admin/location_manager/viewer), Stripe, Twilio, Resend, Inngest, PostHog, Sentry, claude-sonnet-4-6, TypeScript strict, react-hook-form + zod, Tailwind + shadcn/ui

## Build Phases
- **Phase 1** (build now): Core platform + lead engine + 60s SMS nurture + CallRail + attribution dashboard
- **Phase 2** (build now): GBP automation — OAuth, AI review responses, weekly auto-posts
- **Phase 3** (COMPLETE 2026-04-06): Client Intelligence layer — routes + intake UI shipped
- **Phase 4** (BLOCKED): Meta Ads — needs Meta App Review Advanced Access (2–4 weeks)
- **Phase 5**: Advanced attribution + AI insights engine

## Phase 3 — Client Intelligence (COMPLETE 2026-04-06)
- `lib/completeness.ts` — completeness score function (field weights CA-locked, do NOT change without approval)
- `app/api/clients/[id]/intelligence/route.ts` — GET + PATCH (Clerk auth, zod validation, score recalc on save)
- `app/api/clients/[id]/intelligence/score/route.ts` — GET lightweight score endpoint
- `components/intelligence/CompletenessScore.tsx` — score widget with progress bar, status badge, follow-up queue
- `app/(dashboard)/clients/[id]/intelligence/page.tsx` — 5-stage progressive intake form (auto-save on blur)
- **Completeness launch gate:** 60 points. Smart bidding gate: 80 points + target_cpl set.
- **Route param:** `[id]` = organization_id from organizations table
- **CA-LOCKED:** Do NOT change field weights in lib/completeness.ts without CA approval

## Critical Architecture Rules
- **HIPAA**: NO Meta Pixel or Google Tag on health pages. Server-side conversion tracking ONLY via Inngest
- **Google**: GCLID captured server-side → stored in Supabase → offline conversion upload (no PHI)
- **Meta**: CAPI only. LDU flag on all events. No email/phone/name in payload
- **Keywords**: NEVER use Rx drug names or "prescription" + drug term. Safe: "men's health clinic", "TRT clinic", "hormone optimization"
- **Leads table**: service_role only — no direct client access to raw PII

## Brad Action Items (BLOCKERS — start immediately)
1. ~~Google Ads MCC → apply for Standard developer token~~ — RESOLVED 2026-04-05, all creds live
2. Meta Business Manager → Business Verification → System User → Advanced Access for ads_management
3. CallRail Healthcare plan + BAA (~$130/mo)
4. Google Cloud project → enable Google Ads API + GBP API + OAuth credentials
5. GBP Agency Google account → have clients add as Manager

## Env Vars Needed
`GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CLIENT_ID/SECRET/REFRESH_TOKEN`, `GOOGLE_ADS_MCC_CUSTOMER_ID`,
`META_APP_ID/SECRET`, `META_SYSTEM_USER_TOKEN`, `META_BUSINESS_MANAGER_ID`,
`GBP_CLIENT_ID/SECRET/REFRESH_TOKEN`, `CALLRAIL_API_KEY/ACCOUNT_ID`,
plus standard NuStack stack vars (Clerk, Supabase, Twilio, Resend, Inngest, Anthropic, PostHog, Sentry)

## Key Files
- `lib/compliance.ts` — keyword + copy compliance checker (runs before any ad submission to Google)
- `lib/hipaa.ts` — PHI filtering + hashing utilities
- `lib/google-ads.ts` — Google Ads API client, 1 req/sec rate limit, exponential backoff
- `lib/meta-ads.ts` — Meta Marketing API client
- `inngest/functions/campaign-factory.ts` — fires on location.activated event
- `inngest/functions/lead-nurture.ts` — 60s SMS + 7-day sequence
- `app/(marketing)/[city]/[slug]/page.tsx` — auto-generated location landing pages

## Demo Line (for Robert Sek)
"We haven't touched your Google Ads account yet. We already responded to 3 Google reviews with AI, published 4 GBP posts, and sent 6 leads their appointment confirmation within 60 seconds."

## Brad Visibility Rules
Brad Visibility Rules: https://www.notion.so/33a663704e408157bfc5e85d034895cb
Before writing any NEEDS BRAD item:
  - Tier 1 (system handles it): do NOT surface to Brad. Log in CLAUDE.md only.
  - Tier 2 (action card needed): file to /api/credential-actions. Do NOT put in chat.
  - Tier 3 (production affected): fire Twilio SMS via agency-engine. Then log.
  - Tier 4 (genuine decision): surface to Brad in chat as A vs B with CA recommendation.
Default: if you're unsure which tier, it's Tier 2. File a card, not a chat message.