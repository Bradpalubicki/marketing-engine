# Marketing Engine Bible — Parallel Audit v2 — Synthesis

**Date:** 2026-04-05
**Agent:** Synthesis Agent (Agent 9) — Ralph Overnight Loop
**Root Audit Page:** https://www.notion.so/339663704e4081f9ae6ee27edb13a6cd
**CC_SYNTHESIS_STATUS:** COMPLETE — 2026-04-05 — 8-section parallel audit synthesized; 5 live secrets exposed in plaintext (rotate immediately); 31 open decisions consolidated to 16; 44+ CC build items ready now

---

## CRITICAL — ROTATE IMMEDIATELY

Five live production credentials were found committed in plaintext to `docs/vendor-registry.md`:

| Credential | Vendor | Line |
|---|---|---|
| Auth Token | Twilio | 205 |
| API Key | Resend | 217 |
| Event Key | Inngest | 227 |
| Signing Key | Inngest | 228 |
| API Key (sk-ant prefix) | Anthropic | 237 |

**Required actions:** Rotate all 5. Run `git log --all -- docs/vendor-registry.md`. Run `gh repo view --json visibility`. Add `docs/vendor-registry.md` to `.gitignore`. Run `git rm --cached docs/vendor-registry.md`. Move all credentials to Doppler.

---

## TOP 10 CRITICAL GAPS

1. **[CRITICAL] Section 8** — 5 live production secrets committed in plaintext to docs/vendor-registry.md (GitHub)
2. **[CRITICAL] Section 6** — Phase 4.4 Meta Custom Audience uploads hashed PHI to Meta without BAA — HIPAA violation. CA and CC independently confirmed — auto-lock candidate.
3. **[CRITICAL] Section 3** — lib/hipaa.ts is unspecced. No function signatures, no test suite, no CI gate. Every outbound API call is unguarded.
4. **[CRITICAL] Section 6** — Budget formula double-counts spend: Google uses full budget/30, Meta uses budget × 0.4/30 simultaneously = 140% overspend when both phases active.
5. **[HIGH] Section 5** — MAXIMIZE_CONVERSIONS bidding on new Google Ads accounts with zero conversion history. Confirmed in campaign-factory.ts lines 183, 194.
6. **[HIGH] Section 2** — campaign_factory_status CHECK constraint MISSING in production migration 001_initial_schema.sql. Any string accepted silently.
7. **[HIGH] Section 2** — 14 missing indexes on leads table and 8 other high-query tables. Dashboard will timeout within 60 days of launch.
8. **[HIGH] Sections 1,2,4,5** — Square SDK in stack header directly contradicts CLAUDE.md locked decision (Stripe for Web SaaS). Confirmed by 3 independent audits — auto-lock candidate.
9. **[HIGH] Section 4** — Phase 2 "COMPLETE" status claim in Hub Spoke unverified against actual repo files.
10. **[HIGH] Section 7** — All 9 HVAC ad copy description examples in hvac-bible.md EXCEED the 90-character Google Ads limit by 5–30 chars. AI learns from examples, not rules.

---

## ALL OPEN DECISIONS (16)

**Decision #1: Payment Processor — Square vs. Stripe**
Blocks: Any billing module. Options: A) Stripe / B) Square. CC Recommends: A. CLAUDE.md mandates Stripe. Auto-lock. 72hr: CC removes Square.

**Decision #2: Clerk Role Names**
Blocks: All middleware, RLS policies, route protection. Options: A) Use spec roles / B) Verify dashboard first. CC Recommends: B. 72hr: CC proceeds with spec names, creates in Clerk.

**Decision #3: Freshpaint — include or remove**
Blocks: Env var finalization. Options: A) Include ($500-2,000/mo) / B) Defer — lib/hipaa.ts covers v1. CC Recommends: B. CA Pass 1 also said remove. 72hr: CC removes FRESHPAINT_SOURCE_TOKEN.

**Decision #4: clients vs. organizations — canonical client entity**
Blocks: Client intelligence UI, intake form, completeness score. Options: A) Separate clients table / B) Merge into organizations. CC Recommends: B. 72hr: CC proceeds with B.

**Decision #5: GBP OAuth refresh token storage**
Blocks: Phase 2.1. Options: A) Supabase Vault / B) App-level AES-256 in lib/gbp.ts. CC Recommends: A. 72hr: CC builds A.

**Decision #6: Drizzle vs. raw SQL migrations**
Blocks: New migration format consistency. Options: A) Adopt Drizzle / B) Formalize raw SQL. CC Recommends: B — 9 migrations already exist as raw SQL. 72hr: CC proceeds with B.

**Decision #7: Meta Phase 4.4 — remove for healthcare or vertical gate?**
Blocks: meta-audience-sync.ts. Options: A) Remove entirely / B) Vertical gate — healthcare excluded. CC Recommends: B. 72hr: CC builds B.

**Decision #8: special_ad_categories: [] — non-disclosure posture**
Blocks: First Meta campaign submission. Options: A) Keep [] / B) Declare ["HEALTH_AND_PHARMA"]. CC Recommends: A with LEGAL REVIEW REQUIRED comment. Brad must accept in writing.

**Decision #9: Meta Advantage+ Placements — full vs. feed only**
Blocks: 4.2 Step 2. Options: A) Full Advantage+ / B) Facebook + Instagram Feed only. CC Recommends: B. 72hr: CC builds B.

**Decision #10: Creative compliance review gate before Meta ads go live**
Blocks: 4.2 Step 3. Options: A) PAUSED + human approval / B) Auto-submit ACTIVE. CC Recommends: A. 72hr: CC builds A.

**Decision #11: Meta event name allowlist for lib/hipaa.ts enum**
Blocks: MetaEventName enum. Options: A) Lead, Contact, Schedule, ViewContent / B) Lead, Contact only. CC Recommends: A. 72hr: CC proceeds with A.

**Decision #12: Supabase BAA status for healthcare clients**
Blocks: Healthcare client onboarding. CC Recommends: N/A — factual question only Brad can answer. 72hr: CC adds PREREQS.md blocker.

**Decision #13: CallRail phase for HVAC vertical — Phase 1 or Phase 4?**
Blocks: HVAC call conversion tracking. Options: A) Phase 1 / B) Phase 4. CC Recommends: A — HVAC is primarily phone-call business. 72hr: CC defers to Phase 4 (conservative).

**Decision #14: HVAC CPA targets — use as defaults or require per-client override?**
Blocks: HVAC campaign factory launch. Options: A) Use Bible ranges as defaults / B) Require confirmed values. CC Recommends: B. 72hr: CC proceeds with A + warning banner.

**Decision #15: HVAC seasonal budget defaults**
Blocks: HVAC budget allocation logic. Options: A) Default 40/30/15/15 / B) Require client input. CC Recommends: A. 72hr: CC proceeds with A.

**Decision #16: GCLID capture method on landing page**
Blocks: Phase 1 landing page — entire attribution pipeline. Options: A) Client JS → cookie → form POST / B) Server Component reads searchParams.gclid → hidden field. CC Recommends: B — eliminates cookie dependency. 72hr: CC proceeds with B.

---

## CROSS-SECTION CONFLICTS (8)

1. **Budget math:** Sec 5 Google = full budget/30. Sec 6 Meta = budget × 0.4/30. Both active = 140% spend. Fix: Google × 0.6, Meta × 0.4.
2. **Payment processor:** Spec says Square. CLAUDE.md says Stripe for web SaaS. Stripe wins. Auto-lock.
3. **PHI/Meta:** Sec 3 says patient data never leaves Supabase. Sec 6 Phase 4.4 uploads hashed PHI to Meta. CLAUDE.md says CAPI only. Sec 3 + CLAUDE.md win. Vertical gate required.
4. **Freshpaint:** Spec lists as required env var. PREREQS says evaluate. CA Pass 1 says remove. CA Pass 1 wins.
5. **clients entity:** Migration 005 says clients = organizations. Migration 20260405 creates separate clients table. See Decision #4.
6. **CallRail phase:** Phase 1 checklist includes CallRail webhook. CA Pass 1 says defer to Phase 4. Recommendation: build Phase 1 (S-size).
7. **Phase 4 blocking:** Header says fully blocked on App Review. CAPI (4.3) does NOT require App Review. Split into 4-A (CAPI now) and 4-B (factory blocked).
8. **HVAC ad examples:** Section 3 labels descriptions as borderline. Section 7 presents same as finished examples. Examples override rules for AI. Fix all examples.

---

## CC BUILD QUEUE — READY NOW (44 items)

### P0 — Security (immediate):
1. Rotate 5 exposed credentials — S
2. Add docs/vendor-registry.md to .gitignore + git rm --cached — S
3. Migrate active credentials to Doppler — S
4. Rewrite vendor-registry.md with [Doppler: KEY_NAME] references — S

### Stack fixes:
5. Remove Square from spec (Decision #1 auto-lock 72hr) — S
6. Fix model ID "Claude claude-sonnet-4-6" → "claude-sonnet-4-6" — S
7. Add NEXT_PUBLIC_POSTHOG_HOST to Doppler + env var list — S
8. Verify jose package usage — remove if unused — S
9. Add .env.local.example to repo root — S
10. Add Doppler project setup to Section 1 — S
11. Add 6 missing locked-stack vendor rows to registry — S

### Schema Migration 009:
12. Fix campaign_factory_status CHECK constraint — S
13. Apply 14 missing indexes — S
14. Add deleted_at to leads, review_responses, nurture_events — S
15. Add CHECK constraints: ads.type, campaigns.type, ad_groups.status, attribution_records.platform — S
16. Add state length CHECK, avg_rating range CHECK, rating range CHECK — S
17. Replace uuid_generate_v4 with gen_random_uuid in migration 20260405 — S
18. Fix sem_platform_daily_snapshots NULL keyword UNIQUE constraint — S
19. Add updated_at triggers to campaigns, ads, leads — S
20. Add FEATURE_MICROSOFT_ADS=false to env + Doppler — S

### Campaign Factory (Section 5):
21. Fix MAXIMIZE_CONVERSIONS → MANUAL_CPC (auto-lock 72hr) — S
22. Fix event name: location.activated → location/activated in spec — S
23. Add campaign_factory_notes to schema or remove code reference — S
24. Fix conversion name: 'lead_booked' → 'Booked Appointment' — S
25. Move sitelinks/callouts to optional non-blocking step — S
26. Standardize budget denominator to 30.44 in both files — S
27. Fix Google budget formula: × 0.6 / 30 (cross-section conflict fix) — S
28. Add generateKeywords() to ad-copy-generator.ts — M
29. Add GAQL-based idempotency check before campaign creation — M
30. Add GOOGLE_ADS_DRY_RUN env flag + validateOnly — M

### Phase 1 fixes:
31. Replace Slack with Resend in lead nurture Step 4 — S
32. Add booking_url TEXT to locations schema — S
33. Add auto_publish_gbp_posts BOOLEAN DEFAULT FALSE to organizations — S

### HVAC Bible:
34. Fix all 9 description examples to 90-char max — S
35. Add [CONFIGURE PER CLIENT] labels to CPA targets — S
36. Add [INDUSTRY BENCHMARK] provenance labels — S
37. Add missing HVAC intake fields — S
38. Add climate zone modifier table for seasonal budgets — S
39. Add LSA section to HVAC Bible — S
40. Add Competitive Landscape section — S

### Meta Phase 4:
41. Add META_DRY_RUN env var + dry-run mode — M
42. Add event_id uuid deduplication to CAPI payload — S
43. Add OUTCOME_TRAFFIC → OUTCOME_AWARENESS fallback — M
44. Add [VerticalSlug] campaign naming token — S

### Blocked on decisions:
- Decisions #2, 4, 5, 7, 10, 11, 12, 13, 14 block specific build items
- lib/hipaa.ts function signatures (CA must deliver) blocks all HIPAA-gated builds

---

## REVISED TOTAL EFFORT ESTIMATE

| Phase | Spec Estimate | CC Estimate | Delta |
|---|---|---|---|
| Phase 1 Core + Lead Engine | 8-12 hrs | 14-20 hrs | +6-8 hrs |
| Phase 2 GBP Automation | 6-8 hrs | 10-14 hrs | +4-6 hrs |
| Phase 3 Google Ads Factory | 10-15 hrs | 14 hrs remaining (50% built) | N/A |
| Phase 4 Meta Ads Factory | 8-10 hrs | 21 hrs | +11-13 hrs |
| HIPAA layer (lib/hipaa.ts + tests + CAPI) | 1.5 days | 3 days | +1.5 days |
| Security + Schema fixes | 0 (not scoped) | 8 hrs | +8 hrs |
| HVAC Bible fixes | 0 (not scoped) | 11 hrs | +11 hrs |

**Total revised: 90-105 hrs CC / 22-26 days calendar. Spec was ~40-45 hrs — understated by ~2x.**

---

## BRAD ACTIONS REQUIRED

1. **URGENT: Rotate 5 exposed credentials immediately:** Twilio Auth Token (line 205), Resend API Key (line 217), Inngest Event Key (line 227), Inngest Signing Key (line 228), Anthropic API Key (line 237) — all in docs/vendor-registry.md committed to GitHub
2. Confirm Supabase plan has BAA for healthcare clients
3. Confirm Stripe replaces Square (CLAUDE.md already mandates Stripe — Brad confirms lock)
4. Confirm Clerk role names in dashboard
5. StackAdapt follow-up overdue 32 days — email partnerships@stackadapt.com by 2026-04-07
6. Meta Business Manager: Business Verification, System User creation, Advanced Access App Review submission, token generation (Phase 4 blocker — Brad only)
7. GBP OAuth token — confirm GCP project healthy-return-421401 is in Production publish status (not Testing — Testing = 7-day idle expiry)
8. CallRail HIPAA Healthcare plan activation (~$130/month) and BAA execution — Brad signs as NuStack LLC officer
9. Accept or override special_ad_categories: [] non-disclosure posture in writing before first Meta healthcare campaign submission

---

## Section Audit Pages

- Section 1 — Stack & Architecture: https://www.notion.so/339663704e40813599dcda34a985a0bd
- Section 2 — Database Schema: https://www.notion.so/339663704e40817f925ae9317ec6b598
- Section 3 — HIPAA Compliance: https://www.notion.so/339663704e40818e85f2c9a04dab6390
- Section 4 — Build Phases 1 & 2: https://www.notion.so/339663704e4081d5af7eca85deaf80a8
- Section 5 — Campaign Factory Google Ads: https://www.notion.so/339663704e40813d9fced6bfe2b60478
- Section 6 — Meta Ads Phase 4: https://www.notion.so/339663704e40810fbe9acc702ec294c1
- Section 7 — HVAC Vertical Bible: https://www.notion.so/339663704e4081edaf46dab758f09ef0
- Section 8 — Vendor Registry: https://www.notion.so/339663704e40812488bdcd155b415a8e
- Root Audit Page: https://www.notion.so/339663704e4081f9ae6ee27edb13a6cd
