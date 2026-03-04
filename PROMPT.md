# OVERNIGHT TASK: Marketing Engine — Remaining Build + PPC Research

## Objective
Complete the remaining 7 build items on the marketing-engine platform AND conduct comprehensive deep-dive research into Google Ads, Microsoft Advertising, healthcare PPC competitors, and automated campaign system design.

## Context
- **Project:** `C:\Users\bradp\dev\marketing-engine`
- **Live at:** https://marketing-engine-roan.vercel.app
- **Repo:** Bradpalubicki/marketing-engine
- **Supabase:** ftuneexcrtpagrfntbkk
- **Current state:** Phase 1+2 fully complete (27 routes building clean, all env vars wired)
- **Do NOT rebuild:** Lead capture, SMS nurture (5-step), GBP OAuth+sync+reviews+posts, Twilio opt-out webhook, lead status actions, GBP link UI per location, attribution + offline conversion queue

## Stack (Non-Negotiable)
- Next.js 16 App Router, Server Components default
- Supabase (supabaseAdmin from `@/lib/supabase`)
- Clerk auth (`auth()` from `@clerk/nextjs/server`)
- Inngest for background jobs
- TypeScript strict — no `any`
- Tailwind CSS + shadcn/ui
- react-hook-form + zod on ALL forms

---

## WORKSTREAM 1: Marketing Engine — Build Items

### Items to Build (in order)

#### 1. Inngest Production Health Check
- Add `/api/inngest/health` GET route that returns a JSON list of all registered function IDs
- Verify all 9 Inngest functions are imported in `/api/inngest/route.ts` (serve call)
- The 9 functions: lead-nurture, campaign-factory, gbp-sync, gbp-reviews, gbp-posts, spend-reporting, budget-pacing, offline-conversions, ai-insights
- If any function is not registered in the serve() call, add it
- Add startup validation in `/lib/inngest-validate.ts` that throws if INNGEST_EVENT_KEY or INNGEST_SIGNING_KEY are missing

#### 2. PATCH /api/leads/[id] — External Status Update
- Create `app/api/leads/[id]/route.ts` with PATCH handler
- Auth: requires `x-webhook-secret` header matching `process.env.APPOINTMENTS_WEBHOOK_SECRET`
- Body schema (zod): `{ status: enum['new','contacted','booked','showed','no_showed','disqualified'], revenue?: number }`
- On success: update leads table, call `updateAttributionRecord`, queue offline conversion if booked/showed (same logic as existing `updateLeadStatus` server action)
- Return `{ success: true, lead: { id, status } }`
- Return 401 if secret missing/wrong, 404 if lead not found, 400 if validation fails

#### 3. GBP Post Publishing — Wire Inngest to GBP API
- Read `inngest/functions/gbp-posts.ts` — it generates posts to DB but does NOT call GBP API
- After inserting into `gbp_posts` table, add a step that calls the GBP API to publish
- Use `replyToPost` or the posts endpoint in `lib/gbp.ts` — check what exists, add `createPost(locationId, post)` if missing
- GBP Posts API endpoint: `POST https://mybusiness.googleapis.com/v4/{parent}/localPosts`
- Mark `status = 'published'` and set `published_at` on success
- Mark `status = 'failed'` with error on failure (don't throw — log and continue)
- Rate limit: Inngest `step.sleep('rate-limit', '6s')` between posts

#### 4. /dashboard/posts Page
- Create `app/(dashboard)/dashboard/posts/page.tsx`
- Server Component, `export const dynamic = 'force-dynamic'`
- Fetch all `gbp_posts` joined with `gbp_profiles` joined with `locations` — show location name
- Display: location name, post type, summary (truncated 100 chars), status badge, scheduled_at, published_at
- Status badge colors: scheduled=warning, published=success, failed=destructive, draft=secondary
- Add "Publish Now" button per row — server action that calls GBP API immediately and updates status
- Add to dashboard nav (check `components/layout/` or `app/(dashboard)/layout.tsx` for nav)

#### 5. Location Status Toggle
- Read `app/(dashboard)/dashboard/locations/[id]/page.tsx`
- Add a "Location Status" card with buttons: Activate / Pause / Deactivate
- Current status shown with badge
- Activate: sets `status = 'active'`, fires Inngest `location/activated` event → triggers campaign-factory
- Pause: sets `status = 'paused'`
- Deactivate: sets `status = 'inactive'`
- Server action in `app/(dashboard)/dashboard/locations/actions.ts`
- Revalidate path after update

#### 6. Seed Demo Data Script
- Create `scripts/seed-demo.ts`
- Uses `supabaseAdmin` directly (import from `@/lib/supabase` or create direct client with service role key from `.env.local`)
- Inserts:
  - 1 organization: `{ name: 'NuStack Demo Clinic', slug: 'nustack-demo', clerk_org_id: 'demo_org_001' }`
  - 2 locations: Chicago (`city: 'Chicago', state: 'IL', zip: '60601', status: 'active'`) + Naperville (`city: 'Naperville', state: 'IL', zip: '60540', status: 'pending'`)
  - 5 demo leads with statuses: new, contacted, booked, showed, disqualified
  - 2 nurture event sequences (3 events each, statuses: sent/sent/pending)
  - 1 GBP profile per location (use placeholder gbp_location_id)
  - 1 landing page per location
- Run with: `npx ts-node -r tsconfig-paths/register scripts/seed-demo.ts`
- Check if `ts-node` and `tsconfig-paths` are in devDependencies — add if missing
- Add `"seed": "npx ts-node -r tsconfig-paths/register scripts/seed-demo.ts"` to package.json scripts
- Script should be idempotent: check if demo org already exists before inserting

#### 7. Error Boundaries + Loading States
- Add `error.tsx` to:
  - `app/(dashboard)/dashboard/`
  - `app/(dashboard)/dashboard/leads/`
  - `app/(dashboard)/dashboard/locations/`
  - `app/(dashboard)/dashboard/reviews/`
  - `app/(dashboard)/dashboard/posts/` (new page from item 4)
- Each `error.tsx`: `'use client'` directive, renders a Card with red border, shows error.message, has "Try Again" button calling `reset()`
- Add `loading.tsx` to same 5 directories
- Each `loading.tsx`: renders skeleton cards (use shadcn Skeleton component) matching the page layout
- Wrap the main data-fetch section of each page in `<Suspense fallback={<LoadingSkeleton />}>` where appropriate

---

### After All Build Items Complete
```bash
cd C:\Users\bradp\dev\marketing-engine
npm run build
npm run lint
# Fix ALL errors before committing
git add -A
git commit -m "feat: complete remaining build — inngest health, leads api, gbp posts, location toggle, seed, error boundaries"
git push origin main
```

---

## WORKSTREAM 2: PPC Deep Research

**Use WebSearch extensively. Research current 2026 best practices.**
**Save ALL findings to the files below — treat as internal knowledge base.**

### Output Files
- `C:\Users\bradp\dev\marketing-engine\research\google-ads-deep-dive.md`
- `C:\Users\bradp\dev\marketing-engine\research\bing-ads-deep-dive.md`
- `C:\Users\bradp\dev\marketing-engine\research\competitor-analysis.md`
- `C:\Users\bradp\dev\marketing-engine\research\automated-campaign-system-spec.md`

Create the `research/` directory if it doesn't exist.

---

### A. Google Ads Deep Dive → `research/google-ads-deep-dive.md`

Cover ALL of the following. Use WebSearch on each topic.

1. **Campaign types (2026):** Search, Performance Max, Display, Video, Demand Gen, Shopping — when to use each for healthcare/service businesses
2. **Smart Bidding strategies:** Target CPA, Target ROAS, Maximize Conversions, Maximize Conversion Value — mechanics of each, healthcare use cases, minimum data thresholds before switching from manual
3. **Google Ads API v19 full capabilities:**
   - CampaignService, AdGroupService, AdService
   - KeywordPlanService (keyword research via API)
   - ConversionUploadService (offline GCLID-based conversions)
   - CampaignBudgetService, BiddingStrategyService
   - CustomerService (MCC sub-account management)
   - GAQL query language — syntax, examples for spend/performance reporting
4. **Offline conversion import:** GCLID-based step-by-step, Enhanced Conversions for Leads (hashed email/phone), conversion window settings, upload frequency best practices
5. **Healthcare/medical advertising policies 2026:** What's allowed, what triggers suspension, specific restricted medical terms, how to appeal, "Limited Ad Serving" vs full suspension
6. **Performance Max for healthcare:** Asset group structure, search themes, audience signals, budget allocation, when PMax beats Search
7. **RSA best practices:** Headline pinning (when/why), Ad Strength algorithm, optimal headline/description count, character limits, DKI alternatives
8. **Budget pacing:** Google's native daily budget algorithm (how it works, ±20% policy), when manual pacing beats native, monthly budget caps via shared budgets
9. **Multi-location campaign structure:** Single campaign + location extensions vs location-segmented campaigns, ad customizers for city/service, performance max for multi-location
10. **Automated rules vs Scripts vs API:** Decision matrix — use cases for each, execution frequency, error handling differences
11. **Audience targeting:** Customer Match requirements (1000 minimum, 90-day list), Similar Audiences (sunset status 2024), In-Market for healthcare, Affinity, how to use with health restrictions
12. **Local campaigns / location extensions:** Business Profile linking, local inventory ads, call-only ads, lead form extensions for healthcare

**Also search:** "Google Ads API v19 healthcare restrictions 2026", "Google Ads offline conversion upload best practices 2026", "Performance Max healthcare 2026"

---

### B. Microsoft Advertising (Bing) Deep Dive → `research/bing-ads-deep-dive.md`

Cover ALL of the following:

1. **Campaign types:** Search, Shopping, Audience Network, Performance Max equivalent (Smart campaigns) — current state 2026
2. **Microsoft Advertising API v13:** Full capability comparison vs Google Ads API — what's available, what's missing, SDK options (Python, .NET, Java)
3. **Import from Google Ads:** Step-by-step import process, known limitations (what doesn't import cleanly), gotchas (bid strategy mapping, keyword match type changes), recommended import frequency
4. **Smart bidding:** Enhanced CPC, Target CPA, Target ROAS, Maximize Conversions — how they differ from Google's implementation, warm-up period requirements
5. **Microsoft Audience Network:** LinkedIn profile targeting capabilities, professional demographics (job title, industry, company), how it differs from Meta targeting, CPM vs CPC bidding
6. **Healthcare advertising policies on Bing 2026:** How they differ from Google, restricted terms, what's easier/harder to advertise, healthcare exemption process
7. **Bing market share by demographic:** Age skew (older demo = more relevant for TRT), income skew, education level, why Bing matters specifically for healthcare/men's health vertical — cite actual 2024/2025 data
8. **Cost differences vs Google:** Typical CPCs in healthcare vertical on Bing vs Google (cite ranges), competition level differences, volume tradeoffs
9. **Unique Bing features:** LinkedIn audience integration step-by-step setup, auto-bidding behavior, in-market audience library for healthcare, Similar Audiences availability
10. **Auto-bidding and budget management via API:** Rate limits, budget update frequency, bid landscape data availability

**Search:** "Microsoft Advertising API v13 2026", "Bing Ads healthcare advertising 2026", "Bing Ads LinkedIn targeting 2026", "Microsoft Advertising vs Google Ads healthcare CPC 2026"

---

### C. Competitor Analysis → `research/competitor-analysis.md`

**For each competitor below, research and document:**
- Pricing (monthly fee, setup fee, % of ad spend, tier structure)
- What's included in base price vs add-ons
- Google Ads + Bing management: yes/no, level of automation
- Reporting capabilities and dashboard quality
- Key differentiators / positioning statement
- Weaknesses and gaps NuStack can exploit
- G2/Capterra review summary (avg rating, what customers love, what they hate)
- Target customer (solo practice, small group, large group, health system)

**Competitors to research:**
1. **PatientPop / Tebra** (merged — formerly separate) — practice marketing platform
2. **Solutionreach / Weave** — patient communication + marketing automation
3. **NexHealth** — healthcare digital marketing + scheduling
4. **Cardinal Digital Marketing** — healthcare PPC agency (not software)
5. **Intrepy Healthcare Marketing** — specialty healthcare PPC agency
6. **BrightLocal** (if relevant to multi-location GBP management)
7. **Podium** — reviews + messaging for local businesses
8. Search for: "healthcare marketing automation platform 2026" to find 1-2 more

**Search sources:** G2.com, Capterra.com, competitor websites, pricing pages, SoftwareAdvice, GetApp
**For agencies (Cardinal, Intrepy):** Look for blog posts, case studies, pricing transparency, client types

---

### D. Automated Campaign System Spec → `research/automated-campaign-system-spec.md`

Based on all research above, write the complete technical spec for:

#### 1. Campaign Factory v2 Design
- Google Ads: full creation flow using GAQL + CampaignService + AdGroupService + AdService + KeywordPlanService
- Microsoft Advertising: parallel campaign creation via API — what maps 1:1, what needs custom handling
- Asset generation pipeline: RSA headlines/descriptions, sitelinks, callout extensions, call extensions, structured snippets
- Healthcare compliance layer: automated keyword + copy check before submission (expand on existing `lib/compliance.ts` approach)
- Idempotency strategy: how to detect existing campaigns and skip/update vs create

#### 2. Bid Management Automation Design
- Decision tree: when to override Smart Bidding with manual CPC
- Budget pacing algorithm improvements over current 4-hour cron (add: day-of-week seasonality, holiday detection, conversion value optimization)
- Bing-specific bid adjustment factors
- Automated pause conditions: CTR below threshold, CPC above threshold, impression share too low

#### 3. Cross-Platform Attribution Model Design
- GCLID (Google) + MSCLKID (Microsoft/Bing) + fbclid (Meta) unified in one attribution model
- How to store all 3 click IDs in Supabase leads table (already has gclid, fbclid — add msclkid)
- Offline conversion upload schedule for each platform (Google: every 6h, Meta: every 12h, Bing: daily)
- Attribution credit model: last-click vs linear vs time-decay — recommendation for healthcare
- Revenue attribution when appointments are completed in external EHR

#### 4. Reporting Automation Design
- Cross-platform spend/performance data model (already have spend_records — extend for Bing)
- Automated weekly client report: what to show clinic operators vs what to hide
- AI-generated narrative: "This week your best campaign was X because Y. Action: Z."
- Email delivery via Resend with branded HTML template

---

## Success Criteria (ALL must be TRUE to complete)

### WORKSTREAM 1 — Build
- [ ] `/api/inngest/health` returns 200 with list of registered function IDs
- [ ] PATCH `/api/leads/[id]` returns 200 with valid secret, 401 without
- [ ] GBP posts Inngest function calls GBP API after DB insert (check code, not runtime)
- [ ] `/dashboard/posts` page renders without build errors
- [ ] Location detail page has Activate/Pause/Deactivate buttons wired to server action
- [ ] `scripts/seed-demo.ts` exists and is idempotent
- [ ] `error.tsx` exists in all 5 dashboard segments
- [ ] `loading.tsx` exists in all 5 dashboard segments
- [ ] `npm run build` exits 0 with no errors

### WORKSTREAM 2 — Research
- [ ] `research/google-ads-deep-dive.md` exists, >2000 words, covers all 12 topics
- [ ] `research/bing-ads-deep-dive.md` exists, >1500 words, covers all 10 topics
- [ ] `research/competitor-analysis.md` exists, covers all 8 competitors
- [ ] `research/automated-campaign-system-spec.md` exists, covers all 4 spec sections

---

## Verification Commands
```bash
cd C:\Users\bradp\dev\marketing-engine
npm run build    # Exit 0 required
npm run lint     # Exit 0 required
```

---

## Execution Rules

### MUST
- Work through Workstream 1 items in order (1→7) before starting Workstream 2
- Commit after each working build item (do not batch all 7 into one commit)
- Read existing files before modifying (never overwrite what's already built)
- Check `lib/gbp.ts` before adding GBP API calls — use existing helpers
- Use WebSearch for ALL research in Workstream 2 — don't rely on training data for 2026 facts
- Save research files with proper markdown headings, subheadings, bullet points

### MUST NOT
- Modify `.env.local` or `.env` files
- Rebuild anything already listed as "already built"
- Add Google Ads or Meta Ads implementation (FEATURE flags are false — leave them off)
- Push to remote until `npm run build` passes cleanly
- Spend >3 iterations on a single blocker — document in NOTES.md and move on

---

## If Stuck

### If stuck 3+ times on same error:
1. Write to `NOTES.md`: error message, what was tried, suspected cause
2. Skip to next item
3. Return if time permits

### If build fails after all items added:
1. Check TypeScript errors first (`npx tsc --noEmit`)
2. Fix type errors before touching anything else
3. Run build again — fix lint errors second

### If GBP API structure unclear:
- Read `lib/gbp.ts` in full
- Read existing `inngest/functions/gbp-posts.ts` for the current flow
- Adapt to what's already there — don't rewrite, extend

---

## Progress Tracking

Update after each completed item:
- [ ] 1. Inngest health check: status
- [ ] 2. PATCH /api/leads/[id]: status
- [ ] 3. GBP post publishing wired: status
- [ ] 4. /dashboard/posts page: status
- [ ] 5. Location status toggle: status
- [ ] 6. Seed demo script: status
- [ ] 7. Error boundaries + loading states: status
- [ ] 8. npm run build passes: status
- [ ] 9. All research files written: status

---

## Completion

When ALL success criteria verified with passing build:

<promise>DONE</promise>

If unable to complete all criteria, document remaining items in NOTES.md with specific blockers.
