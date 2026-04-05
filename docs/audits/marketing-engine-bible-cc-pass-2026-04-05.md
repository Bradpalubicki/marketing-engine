# Marketing Engine Bible — CC Pass Audit (Full) — 2026-04-05

**Document audited:** Marketing Engine Master Blueprint (MARKETING-ENGINE-SPEC.md + CA Pass 1 Notion 338663704e408140acc4e0cafb4f1906 + Hub Spoke 339663704e408131bcb7d82fe0d4867b)
**Date:** 2026-04-05
**Audited by:** CC (Claude Code)
**Version used:** MARKETING-ENGINE-SPEC.md (most recent), CA Pass 1 Notion doc (2026-04-04)
**Audit framework:** Run Questions v4.3
**CC_PASS_STATUS:** COMPLETE — 2026-04-05 — 47 gaps found, 11 OPEN decisions, full build queue below
**Notion page:** https://www.notion.so/339663704e40815faf68e05ba963ab9d

---

## SECTIONS AUDITED

1. Stack & Architecture
2. Database Schema
3. HIPAA Compliance Architecture
4. Build Phases (Phase 1 & 2)
5. Campaign Factory (Phase 3 — Google Ads)
6. Meta Ads (Phase 4)
7. HVAC Vertical Bible
8. Vendor Registry

---

## MASTER FINDINGS SUMMARY

### Top 10 Critical Gaps (Ranked by Severity)

1. **CRITICAL — Live API keys in vendor-registry.md**: Twilio Auth Token, Anthropic key, Inngest keys, Resend key in plaintext. Run `git log --all -- docs/vendor-registry.md`. Rotate immediately if committed.
2. **CRITICAL — SQL bug in campaign_factory_status CHECK constraint**: `CHECK (status IN (...))` references `status` instead of `campaign_factory_status`. Migration will fail.
3. **CRITICAL — Phase 4.4 Meta retargeting sends hashed PHI without BAA**: HIPAA violation. Remove for healthcare clients.
4. **HIGH — Phase 1 effort estimate off by 4x**: Spec says 8–12 hrs CC. Actual scope ~48 hrs.
5. **HIGH — Missing RLS on 10 of 15 tables**: Multi-tenant data leak. Campaigns, spend, attribution all unprotected.
6. **HIGH — Square SDK in stack header for SaaS engine**: Should be Stripe per CLAUDE.md. No payment processor decided.
7. **HIGH — MAXIMIZE_CONVERSIONS bidding for new accounts**: Wrong strategy. Use Manual CPC → Target CPA.
8. **HIGH — Freshpaint still in env vars**: Remove. Contradicts Delta Item 1 and HIPAA architecture.
9. **HIGH — No soft-delete on any table**: HIPAA requires audit trail. Hard deletes violate retention.
10. **MED — Phase 1 Slack references**: Slack not in NuStack stack. Replace with Resend.

---

### All OPEN Decisions (CC cannot build these sections until resolved)

| # | Decision | Blocks | Options | CC Recommendation |
|---|---|---|---|---|
| 1 | Payment processor for billing module | Billing build | A: Stripe / B: Defer | A: Stripe (CLAUDE.md default) |
| 2 | GBP OAuth refresh token encryption | GBP Phase 2 | A: pgcrypto / B: App-level AES-256-GCM | B: App-level |
| 3 | vertical_compliance_profiles table schema | Delta Item 4 | A: JSONB / B: Normalized | B: Normalized |
| 4 | Booking link destination in SMS | Phase 1 nurture | A: Client URL / B: NuStack-hosted | A: Client URL |
| 5 | Service interest dropdown options | Phase 1 form | A: Generic / B: Vertical-specific | A: Generic v1 |
| 6 | Bidding strategy new campaigns | Phase 3 factory | A: Manual CPC then Target CPA / B: Maximize Conversions | A: Manual CPC |
| 7 | Meta retargeting for healthcare | Phase 4.4 | A: Remove / B: Proceed | A: Remove |
| 8 | CallRail HVAC phase | HVAC build | A: Phase 1 / B: Phase 4 | B: Phase 4 |
| 9 | Meta objective current policy | Phase 4 factory | A: OUTCOME_TRAFFIC / B: OUTCOME_AWARENESS | Needs policy check |
| 10 | PostHog on health LPs | Phase 1 LP | A: Server-side / B: Client-side masked | A: Server-side |
| 11 | vendor-registry.md in git history | Security | A: Check + rotate / B: Assume clean | A: Check immediately |

---

### CC Build Queue — Post-Audit (T-shirt sized, dependency-ordered)

#### Can Build Now
1. Schema migrations — all 15 tables + 5 missing — **M** (2 days)
2. RLS policies on all tables — **S** (4 hrs)
3. Fix SQL bug in campaign_factory_status CHECK — **S** (<1 hr)
4. Add msclkid to leads table — **S** (<1 hr)
5. Add soft-delete (deleted_at) to PHI tables — **S** (2 hrs)
6. Add indexes to leads, spend_records, campaigns — **S** (1 hr)
7. lib/hipaa.ts + automated PHI test — **S** (4 hrs)
8. lib/compliance.ts keyword checker — **S** (4 hrs)
9. Clerk auth + roles — **S** (3 hrs)
10. Landing page factory (/[city]/[slug]) — **M** (8 hrs)
11. Lead nurture Inngest sequence — **M** (10 hrs)
12. GBP OAuth + sync + review queue — **M** (10 hrs)
13. CallRail webhook endpoint — **S** (4 hrs)
14. Attribution dashboard Phase 1 — **M** (8 hrs)
15. Lead management dashboard — **S** (6 hrs)
16. Remove Freshpaint from env vars — **S** (<1 hr)
17. Fix Stack header: Square → Stripe — **S** (<1 hr)
18. Fix Slack → Resend in nurture — **S** (1 hr)

#### Blocked — Needs Decision
19. Billing module — Decision #1
20. GBP token encryption — Decision #2
21. vertical_compliance_profiles — Decision #3
22. SMS booking URL field — Decision #4
23. Service interest dropdown — Decision #5
24. Campaign factory bidding — Decision #6 (CC proceeds at 72hrs: Manual CPC)
25. Meta campaign objective — Decision #9 (needs policy check)
26. PostHog LP config — Decision #10 (CC proceeds at 72hrs: server-side)
27. vendor-registry.md security — Decision #11 (URGENT)

#### External Approval Blocked
28. Google Ads Campaign Factory — Standard developer token (2–6 weeks)
29. Meta Ads Campaign Factory — Meta App Review (2–4 weeks)

---

## SECTION DETAILS

### Section 1 — Stack & Architecture

**Q1 — Confirmed vs. Assumed**
- VERIFIED: Next.js 16, Supabase, Clerk, Twilio, Resend, Inngest, PostHog, Sentry, Anthropic — locked NuStack stack
- ASSUMED: Square SDK in stack header but never used in any build phase — copy-paste from POS engine
- ASSUMED: No Stripe despite billing module being added (Delta Item 3)
- ASSUMED: FRESHPAINT_SOURCE_TOKEN in env vars — contradicts Delta Item 1 removal

**Q2 — Most Important Thing**
HIPAA compliance architecture — the zero-PHI-to-ad-platforms rule. Every design decision flows from this.

**Q3 — Vague**
- Exact Inngest function chain for offline conversion not shown end-to-end
- Complete approved Meta event name allowlist not defined (only `Lead`, `Contact` mentioned)
- GBP refresh token encryption method unspecified
- PostHog flag names and variant count undefined

**Q4 — Over-Complicated**
- Square SDK unused — remove
- Phase 5 AI Insights (weekly Claude + one-click execution) is v3 disguised as v1
- Budget pacing cron simultaneous for all locations — stagger by location_id hash

**Q5 — Conflicts**
- Square vs Stripe: CLAUDE.md global says Stripe for SaaS. Fix stack header.
- CLAUDE.md: prefer Server Actions. Spec uses API routes for mutations. Acceptable for background jobs but client forms should use Server Actions.
- Freshpaint in env vars vs Delta Item 1 removal. Delta Item 1 wins.

**Q6 — Effort (revised)**
| Phase | Spec | CC Assessment | Delta |
|---|---|---|---|
| Phase 1 | 8–12 hrs | 14–18 hrs | +50% |
| Phase 2 | 6–8 hrs | 8–12 hrs | +40% |
| Phase 3 | 10–15 hrs | 18–25 hrs | +65% |
| Phase 4 | 8–10 hrs | 10–14 hrs | +30% |
| Phase 5 | 6–8 hrs | 10–14 hrs | +50% |
| Total | 38–53 hrs | 60–83 hrs | +57% avg |

**Q8 — Top Risks**
1. CRITICAL — PHI leaks to Google/Meta
2. HIGH — Google Ads suspension from keyword violation (static blocklist must run before Claude)
3. HIGH — Schema designed before vertical expansion (build compliance as data model, not hardcoded)

**Q9 — Unexplained**
- MAXIMIZE_CONVERSIONS: wrong for new accounts (see Section 5)
- Advantage+ Audience: policy-driven, not a preference — document reason
- PostHog on health LPs: may capture form PHI by default

**Q10 — Missing**
1. Disaster recovery plan for campaign factory + Inngest dead letter queue
2. Multi-region timezone handling for budget pacing
3. HIPAA data retention policy + soft-delete pattern

**Q11 — Open Decisions**
- Decision #1: Payment processor (Stripe vs defer)
- Decision #2: GBP token encryption method

**Q12 — Internal Contradictions**
- Square in stack, never used anywhere
- Phase 3 says "build skeleton" but lists full implementation checklist
- Phase 5 called "BUILD NOW (skeleton)" but is a full attribution + AI insights engine
- Campaign factory event `location.activated` vs locations.status = `'active'` — naming mismatch
- CHECK constraint SQL bug

**Q13 — Prior Document Conflicts**
- CLAUDE.md: Stripe for SaaS. Spec: Square. CLAUDE.md wins.
- Freshpaint in env vars vs Delta Item 1. Delta wins.
- Hub Spoke says Phase 2 COMPLETE. Spec checklist has unchecked items. Need one truth.

**Q14 — Build or Rent**
- CallRail: RENT — HIPAA BAA required, cannot build
- PostHog: RENT (free tier) — verify no PHI capture on health pages
- DataForSEO: RENT (Phase 4)
- Freshpaint: BUILD (server-side CAPI already designed, cheaper, smaller HIPAA surface)

**Q15 — CC Least Confident**
1. MEDIUM — PostHog client-side PHI capture on landing pages
2. MEDIUM — google-ads-api npm package v19 compatibility
3. LOW — Meta OUTCOME_TRAFFIC availability for health accounts April 2026

---

### Section 2 — Database Schema

**Q1 — Confirmed vs. Assumed**
- VERIFIED: All table names match file structure references
- ASSUMED: msclkid not in schema (Delta Item 10 — add it)
- ASSUMED: sem_campaign_factory_errors table missing
- ASSUMED: vertical_compliance_profiles table missing
- VERIFIED: offline_conversion_queue has correct GCLID upload structure
- VERIFIED: RLS on organizations and leads only (10 tables missing RLS)

**Q2 — Most Important**
RLS on EVERY user-data table. Missing: locations, campaigns, ad_groups, keywords, ads, landing_pages, attribution_records, budget_allocations, spend_records.

**Q3 — Vague**
- CHECK constraint bug: `CHECK (status IN (...))` should be `CHECK (campaign_factory_status IN (...))`
- landing_pages.views/conversions: increment mechanism not specified, race condition risk
- attribution_records.clicked_at: population mechanism not specified
- locations.lat/lng: geocoding provider not specified

**Q4 — Over-Complicated**
- attribution_records duplicates leads timeline fields (contacted_at, booked_at) — derive from leads status instead

**Q5 — Conflicts**
- No client_subscriptions table despite billing module (Delta Item 3)
- No stripe_customer_id on organizations

**Q8 — Top Risks**
1. HIGH — SQL bug causes migration failure
2. HIGH — Missing RLS on 10 tables — multi-tenant data leak
3. MED — No soft-delete — HIPAA audit trail violation

**Q10 — Missing**
1. Indexes on leads(location_id), leads(status), spend_records(spend_date), campaigns(location_id)
2. msclkid on leads
3. soft-delete (deleted_at) on all PHI tables
4. Tables: sem_campaign_factory_errors, vertical_compliance_profiles, client_subscriptions
5. stripe_customer_id on organizations

**Q11 — Open Decisions**
- Decision #3: vertical_compliance_profiles schema (JSONB vs normalized)

**Q12 — Contradictions**
- CHECK constraint column name bug
- attribution_records duplicates leads state

**Q15 — CC Least Confident**
1. MEDIUM — Clerk JWT template includes org_id claim. If not configured, all RLS silently fails.

---

### Section 3 — HIPAA Compliance Architecture

**Q1 — Confirmed vs. Assumed**
- VERIFIED: Server-side only, no pixel on health pages, LDU flag
- ASSUMED: PHI filter enforced by code — no automated test exists
- ASSUMED: lib/hipaa.ts referenced but not spec'd

**Q2 — Most Important**
lib/hipaa.ts must be the last line before any data leaves platform. PHI filter on every external API call.

**Q3 — Vague**
- Complete approved Meta event name list not defined
- GBP token encryption method not specified
- BAA signing process not documented (who signs, where stored)

**Q4 — Over-Complicated**
- Nightly HIPAA LP scan redundant if guard runs at activation. Remove nightly, add one-time deploy scan.

**Q8 — Top Risks**
1. CRITICAL — PHI in CAPI payload (email added for match rate)
2. HIGH — GBP review text logs linked to PHI records
3. MED — CallRail webhook unauthenticated — anyone can POST fake call data

**Q10 — Missing**
1. Automated HIPAA compliance test suite (lib/hipaa.test.ts)
2. BAA documentation process
3. 72-hour breach notification plan (HIPAA requirement)

**Q13 — Prior Document Conflicts**
- Freshpaint in env vars vs Delta Item 1. Remove.

**Q15 — CC Least Confident**
1. LOW — CallRail webhook signature verification not in spec. CC builds HMAC check regardless.

---

### Section 4 — Build Phases (Phase 1 & 2)

**Q1 — Confirmed vs. Assumed**
- VERIFIED: Phase 1 and 2 complete per Hub Spoke
- ASSUMED: "Phase 1: no blockers" — CallRail HIPAA plan IS a blocker for 1.5
- Service interest dropdown options not defined

**Q2 — Most Important**
60-second SMS guarantee. Must have dead letter queue + alert + delivery webhook.

**Q3 — Vague**
- Service interest dropdown options undefined
- Booking link destination undefined (client system vs NuStack scheduler)
- "Internal Slack alert" — Slack not in stack, use Resend
- PostHog flag key names undefined

**Q6 — Effort (CRITICAL)**
| Item | Spec | CC | Delta |
|---|---|---|---|
| Phase 1 total | 8–12 hrs | ~48 hrs | **4x off** |

**Q8 — Top Risks**
1. HIGH — 60s SMS fails silently, no delivery webhook
2. MED — GCLID cookie expires before form submission (use 30-day cookie + hidden field)
3. MED — PostHog client-side captures form PHI on health landing pages

**Q10 — Missing**
1. Billing module checklist items (Delta Item 3 added to scope but no tasks)
2. vertical_compliance_profiles checklist items
3. Runtime HIPAA guard checklist items
4. campaign_factory_errors table

**Q11 — Open Decisions**
- Decision #4: Booking URL destination
- Decision #5: Service interest dropdown options

**Q12 — Contradictions**
- Phase 1 "no blockers" vs CallRail requiring Brad activation
- Phase 1 8–12 hrs vs actual ~48 hrs scope

**Q13 — Prior Conflicts**
- Slack in spec vs Resend in NuStack stack

---

### Section 5 — Campaign Factory (Phase 3)

**Q1 — Confirmed vs. Assumed**
- ASSUMED: google-ads-api npm package — not in package.json
- VERIFIED: MCC 676-717-2347, feature flag FEATURE_GOOGLE_ADS=false
- ASSUMED: API version v19 current as of April 2026
- ASSUMED: MAXIMIZE_CONVERSIONS correct — it is not

**Q2 — Most Important**
Idempotency of campaign factory. Inngest retry must not create duplicate campaigns.

**Q3 — Vague**
- Keyword seed list per vertical not defined
- Compliance checker implementation (regex patterns, blocklist source) unspecified
- Campaign naming hardcodes "Men's Health" — breaks for HVAC vertical
- RSA `serve_in_rotation` field not mentioned

**Q6 — Effort**
Phase 3 total: **L (52 hrs)** vs spec 10–15 hrs. Off by 3.5x.

**Q8 — Top Risks**
1. CRITICAL — Duplicate campaigns from factory retry
2. HIGH — Compliance check failure swallowed, campaign submitted anyway
3. MED — Test developer token behavior differs from production

**Q9 — Unexplained**
MAXIMIZE_CONVERSIONS for new accounts: wrong. Use Enhanced CPC → Target CPA after 50 conversions.

**Q10 — Missing**
1. Dry-run/test mode
2. Idempotency implementation
3. Keyword seed list per vertical
4. Multi-vertical campaign naming convention
5. Bidding strategy graduation logic

**Q11 — Open Decisions**
- Decision #6: Bidding strategy (Manual CPC vs Maximize Conversions) — CC proceeds at 72hrs with Manual CPC

**Q12 — Contradictions**
- Campaign name hardcodes "Men's Health" vs multi-vertical Delta Item 4

**Q14 — Build or Rent**
- google-ads-api npm: RENT (open source, $0) — verify v19 support

**Q15 — CC Least Confident**
1. LOW — google-ads-api npm package v19 support. Run `npm info google-ads-api` before building.

---

### Section 6 — Meta Ads (Phase 4)

**Q1 — Confirmed vs. Assumed**
- VERIFIED: Feature flag, App ID, Business Manager ID
- ASSUMED: OUTCOME_TRAFFIC available for health accounts — policy may have changed
- ASSUMED: special_ad_categories: [] correct for health — unverified as of April 2026

**Q2 — Most Important**
CAPI user_data with zero PHI. No email/phone hash for health clients.

**Q3 — Vague**
- Creative format not specified (static image vs carousel)
- Phase 4.4 "non-PHI contact list" then uses "email hash + phone hash" — these ARE PHI

**Q4 — Over-Complicated**
Phase 4.4 retargeting with hashed PHI — legally blocked for healthcare. Remove.

**Q5 — Conflicts**
Phase 4.4 hashed PHI to Meta (no BAA) violates HIPAA architecture. Section 3 wins. Remove 4.4 for healthcare.

**Q6 — Effort**
Phase 4 total: **M (25 hrs)** vs spec 8–10 hrs. Off by 2.5x.

**Q8 — Top Risks**
1. HIGH — Meta policy change blocks OUTCOME_TRAFFIC
2. HIGH — Hashed PHI in Phase 4.4 (HIPAA violation)
3. MED — System User token revoked with no refresh mechanism

**Q10 — Missing**
1. Creative compliance review gate
2. Healthcare exclusion for Phase 4.4
3. Token monitoring/expiry alert

**Q11 — Open Decisions**
- Decision #7: Meta retargeting healthcare exclusion — CC removes at 72hrs
- Decision #9: Meta objective current policy — needs external check

**Q12 — Contradictions**
Phase 4.4 says "non-PHI" then uses hashed PHI. Internal contradiction.

**Q13 — Prior Conflicts**
HIPAA Section 3: zero PHI to platforms. Phase 4.4: sends hashed PHI. Conflict.

**Q15 — CC Least Confident**
1. LOW — Meta OUTCOME_TRAFFIC for health accounts April 2026. Most uncertain thing in entire document.

---

### Section 7 — HVAC Vertical Bible

**Q1 — Confirmed vs. Assumed**
- VERIFIED: Bible exists, 8 sections, written 2026-04-05
- ASSUMED: CPA targets, close rates — industry benchmarks, not NuStack data
- ASSUMED: Mobile bid +20% — rule of thumb

**Q2 — Most Important**
Negative keyword list. Missing negatives destroy HVAC campaigns faster than any other mistake.

**Q3 — Vague**
- Several description examples over 90-char limit, marked "(trim)" — will fail Google validation
- "Free Diagnostic" offer hardcoded — should be configurable variable
- CPA $80–180 range too wide to be useful as campaign setting

**Q5 — Conflicts**
CallRail in Bible vs CA Pass 1 locked decision (Phase 4 for non-healthcare). Bible doesn't address phase.

**Q6 — N/A** — strategy only

**Q8 — Top Risks**
1. HIGH — Over-limit ad copy examples used verbatim, fail Google validation
2. MED — Seasonal percentages not adjustable for climate variation
3. LOW — RLSA +30% too aggressive for new campaigns

**Q10 — Missing**
1. State contractor license advertising compliance notes
2. GBP post templates for HVAC
3. Completeness score field mapping for HVAC-specific intake fields

**Q11 — Open Decisions**
- Decision #8: CallRail phase for HVAC

**Q12 — Contradictions**
- Description examples over character limit in a style guide for ad copy

**Q15 — CC Least Confident**
1. LOW — CPA targets vary significantly by market. Recommend configurable fields, not hardcoded values.

---

### Section 8 — Vendor Registry

**Q1 — CRITICAL FLAGS**
- **docs/vendor-registry.md contains live credentials in plaintext:**
  - Twilio Auth Token
  - Anthropic API Key (sk-ant-api03-...)
  - Inngest Event Key (full)
  - Inngest Signing Key (full)
  - Resend API Key
- **ACTION REQUIRED:** `git log --all -- docs/vendor-registry.md`
- If committed: rotate all keys before any other action

**Q2 — Most Important**
Check git history for vendor-registry.md. Rotate if committed.

**Q8 — Top Risks**
1. CRITICAL — Live keys in plaintext file, possible git exposure
2. HIGH — GBP OAuth token may have been silently revoked since March 2026
3. MED — TikTok CAPTCHA still blocking agency account signup

**Q10 — Missing**
1. Doppler entry — all env vars must flow through Doppler per CLAUDE.md
2. Vercel, Clerk, Stripe entries missing
3. No Stripe account despite billing module

**Q11 — Open Decisions**
- Decision #11: Check vendor-registry.md git history (URGENT)

**Q13 — Prior Document Conflicts**
CLAUDE.md: Doppler is locked env var solution. Vendor registry has raw credentials with no Doppler mention.

**Q15 — CC Least Confident**
1. UNKNOWN — Whether vendor-registry.md is in git history. Highest urgency item in audit.

---

*Audit complete. Notion page: https://www.notion.so/339663704e40815faf68e05ba963ab9d*
*Filed 2026-04-05 by CC*
