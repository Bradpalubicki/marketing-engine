# NuStack Patient Acquisition Engine — CLAUDE.md
## Build Specification for Claude Code

**Project:** `marketing-engine`
**Owner:** Brad Palubicki, NuStack Digital Ventures
**Purpose:** Proprietary PPC + marketing automation platform for multi-location men's health / healthcare clinics. Auto-creates campaigns, manages GBP, generates landing pages, captures leads with 60-second SMS response, nurtures to booked appointment, and provides closed-loop attribution from ad spend to clinic revenue.

---

## STACK (Non-Negotiable)

- **Framework:** Next.js 16 (App Router) — Server Components default
- **Database:** Supabase (PostgreSQL + RLS)
- **Auth:** Clerk (multi-role: super_admin, org_admin, location_manager, viewer)
- **Payments:** Square SDK
- **SMS:** Twilio
- **Email:** Resend
- **Background Jobs:** Inngest
- **Hosting:** Vercel
- **Analytics:** PostHog (A/B testing on landing pages)
- **Errors:** Sentry
- **AI:** Claude claude-sonnet-4-6 (ad copy generation, review responses, nurture copy)
- **Language:** TypeScript strict — no `any` types
- **Forms:** react-hook-form + zod on ALL forms
- **Style:** Tailwind CSS + shadcn/ui

---

## LAYER 0 ANALYSIS SUMMARY

### Build-Readiness Verdict

**PARTIALLY READY. Start Phase 1 now. Phases 3–5 blocked on API approvals.**

| Phase | Status | Blocker |
|-------|--------|---------|
| Phase 1: Core Platform + Lead Engine | BUILD NOW | No blockers |
| Phase 2: GBP Automation | BUILD NOW | GBP API access is straightforward OAuth |
| Phase 3: Google Ads Campaign Factory | BLOCKED | Google Ads Standard developer token: 2–6 week approval |
| Phase 4: Meta Ads Automation | BLOCKED | Meta App Review for Advanced Access: 2–4 weeks + Business Verification |
| Phase 5: Closed-Loop Attribution | BUILD NOW (skeleton) | CallRail HIPAA plan: activate immediately. Attribution schema buildable now. |

**Action required from Brad before Phase 3/4 can ship:**
1. Create Google Ads Manager Account (MCC) → apply for Standard developer token TODAY
2. Create Meta Business Manager → submit Business Verification TODAY
3. Sign up for CallRail Healthcare plan → execute BAA
4. Evaluate Freshpaint (or equivalent healthcare CDP) for HIPAA-compliant pixel layer
5. Purchase a Google Ads Standard developer token takes 2–6 weeks — start immediately

---

## CRITICAL ARCHITECTURE DECISIONS

### HIPAA Compliance Layer (Non-Negotiable)
Neither Google nor Meta offer BAAs. No PHI can be transmitted to either platform.

**Required architecture:**
- All conversion tracking is **server-side only** via Inngest jobs
- Google: GCLID captured on landing page → stored in Supabase → offline conversion uploaded via Google Ads API (GCLID + abstracted event name, no PHI)
- Meta: Facebook Click ID (`fbc`) captured server-side → Conversions API with `action_source: "website"` → abstracted event names only (`Lead`, `Contact`) — never health-context event names
- CallRail: HIPAA plan + BAA → webhooks to our server only → we push offline conversion to Google (GCLID-based)
- **No Meta Pixel or Google Tag on health-context pages** — server-side only
- LDU flag on all Meta CAPI events: `"data_processing_options": ["LDU"]`
- Patient data NEVER leaves Supabase to any ad platform

### Campaign Factory Trigger
- Fires automatically via Inngest when a new `location` record is created with `status = 'active'`
- Creates campaigns in sequence: Google Search → Meta → GBP profile update
- Rate-limited: Inngest step delays handle Google's ~1 req/sec recommendation
- Idempotent: checks for existing campaigns before creating (prevents duplicates on retry)

### Multi-Account Structure
- Google: Single MCC → all client sub-accounts linked. One developer token covers all.
- Meta: Single Business Manager → client ad accounts granted as system user. System User token (non-expiring) — never user tokens.
- GBP: Agency Google account added as Manager on all client location groups. Single OAuth token.

### Budget Pacing
- Inngest cron: runs every 4 hours per location
- Calculates: (days elapsed / days in month) × monthly budget = expected spend
- If actual spend > expected × 1.15: reduce daily budget cap via Google Ads API
- If actual spend < expected × 0.85: increase daily budget cap
- Meta: ad set budget adjustments max 4×/hour — Inngest rate-limits accordingly
- Timezone-aware: all budget calculations use location's local timezone

### Google Ads Keyword Strategy (Healthcare Compliance)
**NEVER use these terms in keywords or ad copy:**
- Testosterone (as a prescription drug term)
- Any specific Rx drug names (testosterone cypionate, enanthate, etc.)
- "Prescription" combined with any drug term

**Safe terms:**
- "men's health clinic near me"
- "low testosterone doctor"
- "hormone optimization"
- "TRT clinic" (clinic term, not drug term)
- "men's primary care"
- "low energy treatment"
- "men's wellness center"

Claude generates all ad copy. System prompt enforces compliance rules before any copy is submitted to Google Ads API.

### Meta Special Ad Category
- All men's health / TRT clinic ad accounts: use `special_ad_categories: ["EMPLOYMENT"]`...
  NO — correct: `special_ad_categories: ["CREDIT", "EMPLOYMENT", "HOUSING"]` are the financial ones.
  For health: most accounts will be classified under HEALTH_AND_WELLNESS automatically.
- **Correct approach:** Do NOT proactively declare health category. Let Meta auto-classify.
- Use Advantage+ Audience (replaces detailed targeting that's blocked anyway)
- Optimize for Traffic/Landing Page Views (upper funnel) — NOT Lead/Purchase (blocked for health)
- Accept: conversion optimization is limited. Volume + CallRail GCLID attribution compensates.

---

## DATABASE SCHEMA (Supabase)

```sql
-- Organizations (clinic chains)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_org_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  google_ads_customer_id TEXT, -- their Google Ads account ID under our MCC
  meta_ad_account_id TEXT,
  monthly_ad_budget DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Locations (individual clinics)
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT(2) NOT NULL,
  zip TEXT NOT NULL,
  phone TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  lat DECIMAL(9,6),
  lng DECIMAL(9,6),
  gbp_location_id TEXT, -- Google Business Profile location resource name
  callrail_tracker_id TEXT,
  callrail_phone TEXT,
  landing_page_url TEXT,
  monthly_ad_budget DECIMAL(10,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','active','paused','inactive')),
  campaign_factory_status TEXT DEFAULT 'pending' CHECK (status IN ('pending','running','complete','failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id),
  platform TEXT NOT NULL CHECK (platform IN ('google','meta')),
  platform_campaign_id TEXT UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'search','pmax','advantage_plus','display'
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','removed')),
  daily_budget DECIMAL(8,2),
  monthly_budget DECIMAL(10,2),
  bidding_strategy TEXT,
  target_cpa DECIMAL(8,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ad Groups / Ad Sets
CREATE TABLE ad_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  platform_ad_group_id TEXT,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Keywords (Google only)
CREATE TABLE keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_group_id UUID REFERENCES ad_groups(id),
  platform_keyword_id TEXT,
  keyword_text TEXT NOT NULL,
  match_type TEXT CHECK (match_type IN ('EXACT','PHRASE','BROAD')),
  bid_micros BIGINT,
  status TEXT DEFAULT 'ENABLED',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ads
CREATE TABLE ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_group_id UUID REFERENCES ad_groups(id),
  platform_ad_id TEXT,
  type TEXT NOT NULL, -- 'RSA','responsive_display','image'
  headlines JSONB, -- array of up to 15
  descriptions JSONB, -- array of up to 4
  final_url TEXT,
  status TEXT DEFAULT 'ENABLED',
  performance_label TEXT, -- BEST,GOOD,LOW,LEARNING,UNRATED
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Landing Pages
CREATE TABLE landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  headline TEXT NOT NULL,
  subheadline TEXT,
  body_copy TEXT,
  cta_text TEXT DEFAULT 'Book Your Free Consultation',
  ab_variant TEXT CHECK (ab_variant IN ('A','B','C')),
  posthog_flag TEXT, -- PostHog feature flag key for A/B
  is_active BOOLEAN DEFAULT TRUE,
  views INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id),
  org_id UUID REFERENCES organizations(id),
  source TEXT NOT NULL CHECK (source IN ('form','call','chat')),
  -- Attribution (NO PHI sent to ad platforms)
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  gclid TEXT, -- Google Click ID
  fbclid TEXT, -- Facebook Click ID (fbc value)
  fbp TEXT,   -- Facebook Browser Pixel (NOT sent to Meta with PHI)
  landing_page_id UUID REFERENCES landing_pages(id),
  callrail_call_id TEXT,
  -- Contact (stays in Supabase, NEVER sent to ad platforms)
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  -- Lead status
  status TEXT DEFAULT 'new' CHECK (status IN ('new','contacted','booked','showed','no_showed','disqualified')),
  nurture_sequence_step INTEGER DEFAULT 0,
  nurture_paused BOOLEAN DEFAULT FALSE,
  -- Appointment linkage
  appointment_id UUID, -- from ops platform
  appointment_revenue DECIMAL(8,2),
  -- Offline conversion upload tracking
  google_conversion_uploaded BOOLEAN DEFAULT FALSE,
  google_conversion_uploaded_at TIMESTAMPTZ,
  meta_conversion_uploaded BOOLEAN DEFAULT FALSE,
  meta_conversion_uploaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead Nurture Events (sequence log)
CREATE TABLE nurture_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  step INTEGER NOT NULL,
  type TEXT CHECK (type IN ('sms','email','retargeting_audience','internal_alert')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','skipped')),
  content TEXT,
  sent_at TIMESTAMPTZ,
  inngest_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attribution Records (the closed loop)
CREATE TABLE attribution_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  location_id UUID REFERENCES locations(id),
  -- The full funnel
  clicked_at TIMESTAMPTZ,
  platform TEXT, -- google, meta, organic, direct
  campaign_id UUID REFERENCES campaigns(id),
  lead_created_at TIMESTAMPTZ,
  contacted_at TIMESTAMPTZ,
  booked_at TIMESTAMPTZ,
  showed_at TIMESTAMPTZ,
  revenue DECIMAL(8,2),
  -- Derived metrics (computed, not stored raw)
  -- cost_per_lead, cost_per_booked, cost_per_showed computed at query time
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget Allocations
CREATE TABLE budget_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id),
  platform TEXT NOT NULL,
  month DATE NOT NULL, -- first day of month
  monthly_budget DECIMAL(10,2),
  current_daily_budget DECIMAL(8,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_id, platform, month)
);

-- Spend Records (daily snapshot from API)
CREATE TABLE spend_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id),
  platform TEXT NOT NULL,
  campaign_id UUID REFERENCES campaigns(id),
  spend_date DATE NOT NULL,
  impressions INTEGER,
  clicks INTEGER,
  spend DECIMAL(10,2),
  conversions INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, spend_date)
);

-- GBP Profiles
CREATE TABLE gbp_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id),
  gbp_location_id TEXT UNIQUE,
  account_id TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  review_count INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GBP Posts
CREATE TABLE gbp_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gbp_profile_id UUID REFERENCES gbp_profiles(id),
  gbp_post_id TEXT,
  type TEXT CHECK (type IN ('STANDARD','EVENT','OFFER')),
  summary TEXT,
  call_to_action_type TEXT,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('draft','scheduled','published','failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GBP Review Responses
CREATE TABLE review_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gbp_profile_id UUID REFERENCES gbp_profiles(id),
  review_id TEXT NOT NULL,
  reviewer_name TEXT,
  rating INTEGER,
  review_text TEXT,
  ai_draft_response TEXT,
  final_response TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','published','skipped')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CallRail Trackers
CREATE TABLE callrail_trackers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id),
  callrail_tracker_id TEXT UNIQUE,
  tracking_number TEXT,
  destination_number TEXT,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Offline Conversion Queue (for batch upload to Google/Meta)
CREATE TABLE offline_conversion_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  platform TEXT CHECK (platform IN ('google','meta')),
  conversion_name TEXT,
  conversion_time TIMESTAMPTZ,
  conversion_value DECIMAL(8,2),
  gclid TEXT, -- google only
  fbc TEXT,   -- meta only
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','uploaded','failed')),
  attempt_count INTEGER DEFAULT 0,
  uploaded_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS Policies
```sql
-- Organizations: users see only their org
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON organizations
  USING (clerk_org_id = auth.jwt()->>'org_id');

-- Apply similar policies to all tables using org_id or location_id chain
-- Leads: extra protection — no direct client access to raw PII
-- Only service role can read leads table directly
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_only" ON leads
  USING (auth.role() = 'service_role');
```

---

## EXTERNAL API CREDENTIALS (Required Env Vars)

```env
# Google Ads API
GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_REFRESH_TOKEN=
GOOGLE_ADS_MCC_CUSTOMER_ID=

# Meta Marketing API
META_APP_ID=
META_APP_SECRET=
META_SYSTEM_USER_TOKEN=  # non-expiring system user token
META_BUSINESS_MANAGER_ID=

# Google Business Profile API
GBP_CLIENT_ID=
GBP_CLIENT_SECRET=
GBP_REFRESH_TOKEN=
GBP_AGENCY_ACCOUNT_EMAIL=

# CallRail
CALLRAIL_API_KEY=
CALLRAIL_ACCOUNT_ID=

# Freshpaint (HIPAA CDP)
FRESHPAINT_SOURCE_TOKEN=

# Existing NuStack stack
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
RESEND_API_KEY=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
ANTHROPIC_API_KEY=
NEXT_PUBLIC_POSTHOG_KEY=
SENTRY_DSN=
```

---

## BUILD PHASES

### PHASE 1: Core Platform + Lead Engine (Build Now — No Blockers)
**Delivers value immediately. No external API approvals needed.**

#### 1.1 — Database + Auth
- [ ] Run all migrations (schema above)
- [ ] Clerk: roles = `super_admin`, `org_admin`, `location_manager`, `viewer`
- [ ] RLS policies on all tables

#### 1.2 — Organization + Location Management
- [ ] `/dashboard` — org overview: all locations, budget summary, lead summary
- [ ] `/dashboard/locations` — location list with status, budget, performance summary
- [ ] `/dashboard/locations/new` — add location form (triggers campaign factory when status → active)
- [ ] `/dashboard/locations/[id]` — location detail: metrics, campaigns, leads, GBP status

#### 1.3 — Location Landing Pages (auto-generated)
- [ ] `app/(marketing)/[city]/[slug]/page.tsx` — dynamic location landing page
- [ ] Server Component: pulls location data from Supabase
- [ ] GCLID + fbclid capture on page load (URL params → server-side → stored in cookie for form submission)
- [ ] UTM parameter capture and storage
- [ ] Conversion form: first name, phone, service interest, zip code (NO health questions on form)
- [ ] react-hook-form + zod validation
- [ ] On submit: Server Action → creates lead record → fires Inngest `lead.created` event
- [ ] PostHog A/B testing on headline/CTA variants
- [ ] Mobile-optimized, fast (Core Web Vitals green)
- [ ] Schema markup: LocalBusiness, MedicalClinic
- [ ] NO Meta Pixel on these pages — server-side CAPI only

#### 1.4 — Lead Capture + Speed-to-Lead (60-second SMS)
- [ ] Inngest function: `lead.created` trigger
  - Step 1: Send Twilio SMS within 60 seconds — "Hi [first_name], thanks for reaching out to [clinic name]. Click here to book your consultation: [booking link]"
  - Step 2 (2 hours): If `lead.status` still `new` → send Resend email
  - Step 3 (24 hours): If still `new` → fire `lead.retarget` event (future: Meta CAPI retargeting audience add)
  - Step 4 (72 hours): If still `new` → internal Slack/email alert to clinic manager
  - Step 5 (7 days): If still `new` → final re-engagement SMS
- [ ] SMS opt-out handling (STOP keyword → set `nurture_paused = true`)
- [ ] All nurture events logged to `nurture_events` table

#### 1.5 — CallRail Integration
- [ ] CallRail webhook endpoint: `POST /api/webhooks/callrail`
- [ ] Parses inbound call: tracker_id → maps to location → creates lead record with `source = 'call'`
- [ ] Fires same `lead.created` Inngest event (different nurture: no SMS back to caller, internal alert + email)
- [ ] CallRail HIPAA plan must be active (Brad action item)

#### 1.6 — Attribution Dashboard
- [ ] `/dashboard/analytics` — multi-location attribution view
- [ ] Metrics: leads by source, CPL (if ad spend entered manually for now), booked %, showed %, revenue attributed
- [ ] Location comparison table
- [ ] Date range picker
- [ ] Export to CSV
- [ ] Note: full closed-loop attribution populates once Phase 3 (Google API) is live

#### 1.7 — Lead Management
- [ ] `/dashboard/leads` — lead table with filters (location, source, status, date)
- [ ] Lead detail modal: timeline of nurture events, attribution data, update status
- [ ] Status update triggers attribution record update and offline conversion queue

---

### PHASE 2: Google Business Profile Automation (Build Now)
**GBP API requires OAuth but no approval process.**

#### 2.1 — GBP OAuth Connection
- [ ] `/dashboard/settings/gbp` — connect Google account (OAuth flow)
- [ ] Store refresh token in Supabase (encrypted)
- [ ] List client location groups accessible via this account

#### 2.2 — GBP Profile Sync
- [ ] Inngest cron (daily): sync all GBP profiles → update `gbp_profiles` table
- [ ] Sync: rating, review count, hours, categories, attributes

#### 2.3 — Review Management
- [ ] Inngest cron (every 4 hours): fetch new reviews → store in `review_responses`
- [ ] For each new review without response: queue `review.ai_draft` Inngest event
- [ ] Claude generates response: professional, HIPAA-safe (never acknowledge patient relationship), brand-voice compliant
- [ ] Response goes to `status = 'pending'` for human approval
- [ ] `/dashboard/reviews` — review queue: AI draft shown, approve/edit/skip
- [ ] On approve: GBP API publishes response

#### 2.4 — GBP Post Automation
- [ ] Inngest cron (weekly): generate GBP posts for each active location
- [ ] Claude generates 4 post variants per location: seasonal, service highlight, educational, promotional
- [ ] Posts queued in `gbp_posts` for approval or auto-publish (org setting)
- [ ] GBP API: posts published via `mybusinessbusinessinformation` posts endpoint
- [ ] Rate limiting: 10 edits/minute/location enforced via Inngest step delays

#### 2.5 — Hours + Info Management
- [ ] Location form includes: hours, holiday hours, categories, attributes
- [ ] On location update: sync to GBP via API automatically

---

### PHASE 3: Google Ads Campaign Factory (Blocked — needs Standard developer token)
**Start Google Ads MCC + token application immediately. Build skeleton now, activate when token approved.**

#### 3.1 — Google Ads API Client (lib/google-ads.ts)
- [ ] Google Ads API client using `google-ads-api` npm package or raw gRPC
- [ ] MCC customer ID from env
- [ ] OAuth refresh token management
- [ ] Rate limiting wrapper: 1 req/sec per account, exponential backoff on RESOURCE_EXHAUSTED

#### 3.2 — Campaign Factory (Inngest function)
Trigger: `location.activated` event

- [ ] Step 1: Create Search campaign
  - Name: `[LocationSlug] - Men's Health - Search`
  - Bidding: `MAXIMIZE_CONVERSIONS` with target CPA
  - Budget: location monthly_ad_budget × 0.6 / 30 (daily)
  - Location targeting: 15-mile radius around clinic lat/lng
  - Language: English
- [ ] Step 2: Create ad groups
  - "Men's Health General" — broad men's health intent terms
  - "TRT Clinic" — TRT-specific (non-drug terms)
  - "Low T Symptoms" — symptom-based
  - "Hormone Optimization" — optimization framing
  - "Men's Primary Care" — primary care intent
- [ ] Step 3: Generate keywords per ad group
  - Claude generates 15–20 keywords per group from approved term list
  - All keywords compliance-checked against blocked terms list before submission
- [ ] Step 4: Generate RSA ads
  - Claude generates 15 headlines + 4 descriptions per ad group
  - Location name, city, and specific service injected
  - Compliance check: no Rx drug names, no prescription terms
  - 2 RSA variants per ad group for rotation testing
- [ ] Step 5: Create conversion action
  - `ConversionActionService`: create "Booked Appointment" conversion (for offline import)
- [ ] Step 6: Update `campaigns` table with platform_campaign_id
- [ ] Step 7: Update `location.campaign_factory_status = 'complete'`

#### 3.3 — Offline Conversion Upload (Inngest cron — every 6 hours)
- [ ] Query `offline_conversion_queue` where `status = 'pending'` and `platform = 'google'`
- [ ] Group by customer account
- [ ] Upload via `ConversionUploadService.UploadClickConversions`
- [ ] Match key: `gclid` (preferred) or hashed email/phone via Enhanced Conversions for Leads
- [ ] Conversion event name: "Booked Appointment" (not "TRT Appointment" — abstracted)
- [ ] Mark `status = 'uploaded'` on success
- [ ] Smart Bidding now optimizes for showed appointments, not form fills

#### 3.4 — Spend Reporting (Inngest cron — daily at 2am)
- [ ] Pull yesterday's spend, clicks, impressions, conversions via GAQL
- [ ] Store in `spend_records`
- [ ] Feed budget pacing engine

#### 3.5 — Budget Pacing Engine (Inngest cron — every 4 hours)
- [ ] For each active location + campaign:
  - Expected spend = (days_elapsed / days_in_month) × monthly_budget
  - If actual > expected × 1.15: reduce daily budget by 10%
  - If actual < expected × 0.85: increase daily budget by 10%
  - Cap: never below $5/day, never above 110% of (monthly_budget / 28)
- [ ] Update via `CampaignBudgetService`

---

### PHASE 4: Meta Ads Campaign Factory (Blocked — needs Meta App Review)
**Build after Meta Advanced Access approved.**

#### 4.1 — Meta API Client (lib/meta-ads.ts)
- [ ] System User token from env (non-expiring)
- [ ] Rate limit tracking: X-Business-Use-Case-Usage header monitoring
- [ ] Exponential backoff on 429

#### 4.2 — Meta Campaign Factory
Trigger: Same `location.activated` event (after Google factory completes)

- [ ] Step 1: Create campaign
  - Objective: `OUTCOME_TRAFFIC` (NOT leads/conversions — blocked for health)
  - `special_ad_categories: []` (do not proactively declare — let Meta classify)
  - Name: `[LocationSlug] - Men's Health - Traffic`
- [ ] Step 2: Create ad set
  - Advantage+ Audience (replaces detailed targeting)
  - Geo: 20-mile radius around clinic
  - Budget: location monthly_ad_budget × 0.4 / 30 (daily)
  - Placement: Advantage+ Placements
- [ ] Step 3: Create ads
  - Claude generates primary text, headline, description
  - 3 creative variants (A/B/C)
  - Destination: location landing page URL
- [ ] Step 4: CAPI event setup (server-side only)

#### 4.3 — Meta CAPI Events (Inngest function)
Trigger: `lead.created` where `fbclid` is present

- [ ] Send `Lead` event to Meta CAPI
- [ ] Payload: `event_name: "Lead"`, `action_source: "website"`, `user_data: { fbc, fbp, client_ip_address, client_user_agent }` — NO email, NO phone, NO name (HIPAA)
- [ ] LDU flag: `"data_processing_options": ["LDU"]`
- [ ] No PHI in any field

#### 4.4 — Meta Retargeting Audiences
- [ ] Build custom audience from non-PHI contact list (email hash + phone hash of consented patients)
- [ ] Upload via Customer List audience type
- [ ] List segmentation: by service interest only (NOT by condition/diagnosis)

---

### PHASE 5: Advanced Attribution + Reporting

#### 5.1 — Full Attribution Dashboard
- [ ] Connect spend_records + attribution_records
- [ ] Metrics per location per campaign:
  - Ad spend
  - Clicks / Impressions / CTR
  - CPL (cost per lead)
  - Cost per booked appointment
  - Cost per showed appointment
  - ROAS (revenue / spend)
  - Patient LTV (from ops platform webhook)
- [ ] Time series charts (Recharts)
- [ ] Campaign comparison: which campaign, ad group, keyword drives the best showed-appointment rate

#### 5.2 — AI Insights Engine
- [ ] Inngest cron (weekly): Claude analyzes performance data
- [ ] Generates: "Location X has 40% higher CPL than network average — top keyword by spend is [X] with 2% conversion rate vs network avg 5.8%"
- [ ] Recommendations pushed to dashboard as notifications
- [ ] Actionable: "Pause [keyword], increase budget on [ad group]" — one-click to execute

#### 5.3 — Client-Facing Reporting
- [ ] `/dashboard/reports` — white-labeled report view for clinic managers
- [ ] Show: what they care about (new patients, cost per new patient, calls, booked appointments)
- [ ] Hide: technical metrics (ROAS, CTR, impressions) for non-marketers
- [ ] Exportable PDF/email weekly digest

---

## INTEGRATION COMPLEXITY RATINGS

| Integration | Complexity | Notes |
|---|---|---|
| Twilio SMS | Simple | Already in NuStack stack |
| Resend Email | Simple | Already in NuStack stack |
| Inngest nurture sequences | Medium | Logic complexity, not API complexity |
| CallRail webhooks | Simple | REST webhook, straightforward |
| CallRail number provisioning | Simple | REST POST |
| PostHog A/B on landing pages | Simple | Flag-based, already in stack |
| GBP API — profile sync | Medium | OAuth setup, rate limiting |
| GBP API — review responses | Medium | Claude integration + approval flow |
| Google Ads API — campaign factory | Complex | Multi-step, rate limits, compliance rules |
| Google Ads offline conversions | Medium | Upload format, GCLID management |
| Meta Marketing API — campaigns | Complex | Health restrictions, system user setup |
| Meta CAPI — server-side events | Medium | Server-side, HIPAA rules |
| Claude ad copy generation | Medium | Compliance rules, prompt engineering |
| Budget pacing engine | Medium | Math + API calls, timezone logic |
| Full attribution dashboard | Complex | Data model joins, visualization |

---

## RISK REGISTER

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| Google Ads Standard token delayed 6+ weeks | High | Medium | Apply immediately. Build Phase 1+2 while waiting. Platform is valuable without ads. |
| Meta classifies account as HEALTH — blocks lower funnel | High | High | Architect for upper-funnel from day one. CallRail GCLID attribution compensates. |
| TRT keyword triggers Google account suspension | Critical | Medium | Claude compliance checker on all copy. Never submit without automated review. Maintain backup account structure. |
| Google/Meta policy change breaks ad automation | Medium | Low | Abstraction layer in `lib/google-ads.ts` and `lib/meta-ads.ts` — policy changes isolated. |
| CallRail HIPAA plan not activated before launch | Critical | Low | Brad action item — document in PREREQS |
| GBP verification required for new client locations | Medium | High | Manual step per location — document in onboarding. Bulk verification for 10+ same-brand locations. |
| Meta App Review rejected | High | Low | Appeal process. Ensure privacy policy + ToS are healthcare-compliant before submission. |
| HIPAA violation from pixel on health page | Critical | Low if built correctly | Server-side only. No pixel HTML on any health-context page. Freshpaint evaluation. |
| Inngest job failure during campaign factory | Medium | Low | Idempotency keys. Dead letter queue. Alert on failure. |
| Budget pacing over-reduces spend | Medium | Low | 10% adjustment cap. Never below $5/day floor. Alert on anomalous pacing. |

---

## PREREQS (Brad Action Items — Start TODAY)

- [ ] **Google Ads MCC**: Create at ads.google.com/home/tools/manager-accounts. Apply for Standard developer token from API Center. This takes 2–6 weeks. START IMMEDIATELY.
- [ ] **Meta Business Manager**: Create at business.facebook.com. Submit Business Verification documents. Create System User. Request Advanced Access for `ads_management`. 2–4 week process.
- [ ] **CallRail**: Sign up for Healthcare plan. Request HIPAA setup. Execute BAA. ~$130+/month.
- [ ] **Freshpaint** (or evaluate): hipaa-compliant CDP layer. Free tier available. Evaluate as HIPAA filtering layer. freshpaint.io
- [ ] **Google Cloud Project**: Create project, enable Google Ads API, Google Business Profile API. Create OAuth 2.0 credentials.
- [ ] **GBP Agency Account**: Create a dedicated Google account for NuStack agency GBP management. Have all clients add this account as a location Manager.

---

## FILE STRUCTURE

```
marketing-engine/
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   ├── page.tsx                    # Overview: all orgs/locations
│   │   │   ├── locations/
│   │   │   │   ├── page.tsx                # Location list
│   │   │   │   ├── new/page.tsx            # Add location → triggers factory
│   │   │   │   └── [id]/page.tsx           # Location detail
│   │   │   ├── leads/
│   │   │   │   ├── page.tsx                # Lead table
│   │   │   │   └── [id]/page.tsx           # Lead detail + timeline
│   │   │   ├── analytics/page.tsx          # Attribution dashboard
│   │   │   ├── campaigns/page.tsx          # Campaign performance
│   │   │   ├── reviews/page.tsx            # GBP review queue
│   │   │   ├── reports/page.tsx            # Client-facing reports
│   │   │   └── settings/
│   │   │       ├── gbp/page.tsx            # Connect GBP
│   │   │       └── integrations/page.tsx   # API connections status
│   ├── (marketing)/
│   │   └── [city]/[slug]/page.tsx          # Location landing pages
│   └── api/
│       ├── webhooks/
│       │   ├── callrail/route.ts           # CallRail webhook
│       │   └── appointments/route.ts       # Ops platform → lead status update
│       └── inngest/route.ts                # Inngest handler
├── inngest/
│   ├── client.ts
│   ├── functions/
│   │   ├── lead-nurture.ts                 # 60s SMS + full sequence
│   │   ├── campaign-factory.ts             # Auto-create campaigns on location activate
│   │   ├── gbp-sync.ts                     # Daily GBP sync
│   │   ├── gbp-reviews.ts                  # Review fetch + AI draft
│   │   ├── gbp-posts.ts                    # Weekly post generation
│   │   ├── spend-reporting.ts              # Daily spend pull from Google/Meta
│   │   ├── budget-pacing.ts                # 4-hour pacing cron
│   │   ├── offline-conversions.ts          # Google + Meta conversion upload queue
│   │   └── ai-insights.ts                  # Weekly Claude performance analysis
├── lib/
│   ├── google-ads.ts                       # Google Ads API client + helpers
│   ├── meta-ads.ts                         # Meta Marketing API client
│   ├── gbp.ts                              # GBP API client
│   ├── callrail.ts                         # CallRail API client
│   ├── compliance.ts                       # Keyword + copy compliance checker
│   ├── attribution.ts                      # Attribution calculation helpers
│   ├── ad-copy-generator.ts               # Claude ad copy generation
│   └── hipaa.ts                           # PHI filtering, hashing utilities
├── components/
│   ├── dashboard/
│   │   ├── LocationCard.tsx
│   │   ├── MetricCard.tsx
│   │   ├── LeadTable.tsx
│   │   ├── AttributionChart.tsx
│   │   ├── CampaignTable.tsx
│   │   └── ReviewQueue.tsx
│   └── landing/
│       ├── LocationHero.tsx
│       ├── LeadForm.tsx
│       └── SocialProof.tsx
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       └── 002_rls_policies.sql
└── types/
    └── index.ts
```

---

## WHAT CLAUDE CODE BUILDS AUTONOMOUSLY vs. HUMAN DECISIONS NEEDED

### Claude Code builds autonomously:
- Entire Next.js application structure
- All Supabase migrations and RLS policies
- All Inngest functions (nurture, GBP, budget pacing, reporting)
- GBP API integration (OAuth is straightforward)
- CallRail webhook + number provisioning
- Location landing page factory
- Lead capture + attribution recording
- Review queue UI + Claude response generation
- All dashboard pages
- Attribution reporting dashboard

### Requires human decisions / pre-work:
- Google Ads Standard developer token (Brad applies, waits for Google approval)
- Meta App Review approval (Brad applies)
- CallRail HIPAA plan + BAA (Brad activates)
- Client onboarding: GBP verification (manual per location)
- Compliance review of generated ad copy before first submission to Google
- Freshpaint evaluation and integration decision

---

## MVP DEFINITION (What to Demo to Robert Sek)

The MVP that proves the concept and can be shown to a clinic operator **without waiting for Google/Meta approval:**

1. **Location landing page** — auto-generated, conversion-optimized, A/B tested, with GCLID capture
2. **60-second SMS response** — lead fills form → Twilio SMS in under 60 seconds
3. **Lead nurture sequence** — full 7-day sequence shown in dashboard timeline
4. **Attribution dashboard** — even with manual ad spend entry, shows CPL, booked %, showed %
5. **GBP review queue** — AI-generated review responses waiting for approval
6. **GBP auto-posts** — weekly posts scheduled and published automatically
7. **Multi-location ops view** — all locations on one screen with real-time lead counts

**Demo line:** *"We haven't touched your Google Ads account yet. This is just the platform running in the background. We already responded to 3 Google reviews with AI, published 4 GBP posts, and sent 6 leads their appointment confirmation within 60 seconds. When we connect your ad accounts, this is where the spend starts flowing back."*

---

## ESTIMATED BUILD TIME

| Phase | Claude Code Hours | Human Review Hours | Total Calendar Time |
|---|---|---|---|
| Phase 1: Core + Lead Engine | 8–12 hrs | 2 hrs | 3–4 days |
| Phase 2: GBP Automation | 6–8 hrs | 1 hr | 2–3 days |
| Phase 3: Google Ads Factory | 10–15 hrs | 3 hrs | 4–5 days (after token) |
| Phase 4: Meta Ads | 8–10 hrs | 2 hrs | 3–4 days (after approval) |
| Phase 5: Advanced Attribution | 6–8 hrs | 1 hr | 2–3 days |
| **Total MVP (Phase 1+2)** | **14–20 hrs** | **3 hrs** | **~1 week** |
| **Full Platform** | **38–53 hrs** | **9 hrs** | **4–6 weeks** |

---

## START COMMAND

```bash
npx create-next-app@latest marketing-engine --typescript --tailwind --app --src-dir
cd marketing-engine
npx shadcn@latest init
npm install @supabase/supabase-js @clerk/nextjs inngest twilio resend @anthropic-ai/sdk posthog-js @sentry/nextjs react-hook-form zod recharts
```

---

*This spec is complete for Phase 1 + Phase 2. Claude Code can begin building immediately.*
*Phase 3 + 4 API credential acquisition must run in parallel.*
*Estimated Phase 1+2 MVP: 5–7 days of Claude Code execution.*
