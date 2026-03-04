# Automated Campaign System Spec — v2.0
## NuStack Marketing Engine: Technical Architecture for Cross-Platform PPC Automation

---

## Overview

This spec defines the next-generation architecture for the Marketing Engine's campaign automation, bid management, attribution, and reporting systems. It is informed by the Google Ads deep dive, Bing Ads deep dive, and competitor analysis research. Version 1 is what shipped in Phase 1+2. This spec defines v2.

---

## 1. Campaign Factory v2 Design

### 1.1 Trigger Architecture

The Campaign Factory fires on `location/activated` Inngest event. V2 extends this to a parallel dual-platform creation pipeline.

```typescript
// Event payload
interface LocationActivatedEvent {
  name: 'location/activated'
  data: {
    locationId: string
    orgId: string
    platforms: ('google' | 'microsoft')[] // defaults to both
    adBudgetOverride?: {
      google?: number    // monthly $ override
      microsoft?: number // monthly $ override
    }
  }
}
```

### 1.2 Dual-Platform Creation Flow

**Step 1 — Pre-flight compliance check**
Before any API call, run all generated copy through `lib/compliance.ts`. Block terms: all Rx drug names (testosterone cypionate, enanthate, anastrozole), "prescription" + drug term combinations, FDA-unapproved claim patterns. Fail the campaign factory step if violations found — log to `locations.campaign_factory_status = 'failed'`, fire alert event.

**Step 2 — Google Ads campaign creation (current v1, enhance for v2)**
- Use Google Ads API v23 (sunset v19 on Feb 11, 2026 — never use v19)
- CampaignService: create Search campaign with location radius targeting
- Budget split: 60% of total monthly budget → Google (divide by 30 for daily cap)
- BiddingStrategy: start with `MAXIMIZE_CONVERSIONS`, switch to `TARGET_CPA` after 30 conversions
- Ad group structure:
  - "Men's Health General" — broad intent
  - "TRT Clinic" — TRT-specific (clinic terms only, zero drug terms)
  - "Low T Symptoms" — symptom framing (energy, fatigue, mood — no clinical diagnosis language)
  - "Hormone Optimization" — optimization/performance framing
  - "Men's Primary Care" — primary care intent

**Step 3 — Microsoft Advertising campaign creation (NEW in v2)**
- Run in parallel as separate Inngest step (not blocking Google creation)
- Use Microsoft Advertising API v13 via `bingads-sdk` npm package
- Budget split: 40% of total monthly budget → Microsoft (divide by 30 for daily cap)
- Start with Enhanced CPC until 30 offline conversions received
- Same ad group structure as Google (import pattern — adjust bids down 40%)
- Enable MSCLKID auto-tagging via account settings API call
- Account structure: create as sub-account under NuStack MCC manager account

**Step 4 — Asset generation pipeline (enhanced for v2)**
Current: Claude generates 15 headlines + 4 descriptions per ad group.
V2 additions:
- **Sitelink assets:** 4 per campaign (Book Now, Our Locations, Meet Our Doctors, Patient Reviews)
- **Callout assets:** 8 callouts (Board-Certified Physicians, HIPAA-Compliant Care, Same-Day Appointments, No Referral Required, etc.)
- **Call assets:** clinic phone number (from `locations.phone`)
- **Location assets:** auto-populated from GBP link (requires GBP → Google Ads account link)
- **Image assets:** 3 landscape + 2 square per asset group (from Unsplash API or client-provided)

All assets must pass compliance check before submission.

**Step 5 — Performance Max campaign (NEW in v2, Google only initially)**
After Search campaign is created and running 14+ days:
- Create PMax campaign with 30% of Google budget
- Reduce Search campaign budget to 70% of Google allocation
- 4 asset groups matching the 4 Search ad groups (same themes)
- Search themes: 50 per group (v23 limit)
- Audience signals: In-Market "Healthcare Services" + Custom Intent from competitor URL list

**Step 6 — Conversion action creation**
Create conversion actions in both platforms:
- Google: ConversionActionService → "Booked Consultation" + "Patient Showed"
- Microsoft: CampaignManagementService → equivalent conversion goals

Store conversion action IDs in `campaigns` table for reference during offline upload.

**Step 7 — Status update**
Set `locations.campaign_factory_status = 'complete'`. Fire `campaign/created` event with platform IDs for monitoring.

### 1.3 Idempotency Strategy

Campaign factory must handle retries without creating duplicate campaigns.

```typescript
// Before creating any campaign, check for existing
const { data: existing } = await supabaseAdmin
  .from('campaigns')
  .select('id, platform_campaign_id')
  .eq('location_id', locationId)
  .eq('platform', 'google')
  .eq('status', 'active')

if (existing?.length > 0 && existing[0].platform_campaign_id) {
  // Campaign already exists — skip creation, update status only
  return { skipped: true, existingId: existing[0].platform_campaign_id }
}
```

For Google API: use `mutateOperations` with `allowPartialFailure: false`. If campaign with identical name exists in the Google Ads account, the API returns CAMPAIGN_NAME_ALREADY_EXISTS error — catch this and update the existing campaign ID in Supabase rather than creating a new one.

For Microsoft: check BulkService for existing campaigns by name before CampaignManagementService.AddCampaigns call.

---

## 2. Bid Management Automation Design

### 2.1 When to Override Smart Bidding

Smart Bidding should NOT be overridden during its standard operation. However, override scenarios:

| Scenario | Action | Implementation |
|---|---|---|
| Monthly budget on track to overspend by >15% | Reduce daily budget (not bid strategy) | Inngest cron: `budget-pacing` |
| Monthly budget underspending by >15% | Increase daily budget | Same cron |
| Zero conversions in 14+ days | Alert + pause campaign | `ai-insights` function |
| Cost per conversion >3x target CPA | Alert + optional manual review | `spend-reporting` function |
| Ad disapproved (compliance) | Pause ad, alert | Webhook from Google |
| Smart Bidding in "Learning" status >30 days | Switch to Manual CPC temporarily | Manual trigger |

**Critical:** Never touch Target CPA or Target ROAS values via API automation without human review. These changes reset the learning algorithm and can cause dramatic performance drops. Only budget adjustments are automated.

### 2.2 Budget Pacing Improvements for v2

**Day-of-Week Seasonality (NEW)**
Healthcare clinics see predictable day-of-week patterns:
- Monday: +20% above average (post-weekend decision making)
- Tuesday-Wednesday: average
- Thursday: +15% above average
- Friday-Sunday: -20-30% (lower conversion intent)

V2 pacing adjusts the "expected spend" formula to account for day-of-week weights:
```typescript
const dayWeights = {
  0: 0.8,  // Sunday
  1: 1.2,  // Monday
  2: 1.0,  // Tuesday
  3: 1.0,  // Wednesday
  4: 1.15, // Thursday
  5: 0.9,  // Friday
  6: 0.75, // Saturday
}

// Adjusted expected spend = sum of (daily_budget * day_weight) for elapsed days
const expectedSpend = elapsedDays.reduce((sum, day) => {
  return sum + (dailyBudget * dayWeights[new Date(day).getDay()])
}, 0)
```

**Holiday Detection (NEW)**
US public holidays (New Year's, Memorial Day, July 4th, Labor Day, Thanksgiving, Christmas) see 40-60% lower healthcare search volume. Detect holidays in pacing engine:
```typescript
import { isHoliday } from '@/lib/holidays' // maintain a simple US holiday calendar

if (isHoliday(today)) {
  // Reduce expected spend by 50% for holiday dates
  expectedSpend *= 0.5
}
```

**March 2026 Pacing Change (CRITICAL)**
Google changed pacing for ad-scheduled campaigns on March 1, 2026. If a campaign runs on an ad schedule (not 24/7), Google will now spend the full monthly cap across active days only. Our pacing engine must account for this:
```typescript
const activeHoursPerWeek = location.ad_schedule_hours ?? 168 // 24*7 default = always on
const monthlyActiveHours = (activeHoursPerWeek / 168) * monthlyHours
const adjustedDailyBudget = monthlyBudget / (monthlyActiveHours / 24)
```

**Bing-Specific Adjustments (NEW in v2)**
Bing does not have the same ±20% daily budget flexibility as Google (Bing is more literal about daily budget). Set Bing daily budget slightly lower than Google equivalent to avoid daily cap exhaustion during high-traffic days:
- Bing daily budget = (monthly × 0.40) / 28 (conservative 28-day divisor vs Google's 30.4)

### 2.3 Automated Pause Conditions

Campaigns auto-pause (via Inngest alert, not automatic API call — requires human confirmation for pause):
- Spend >110% of monthly budget before month-end
- Conversion rate drops >60% from previous 7-day average (anomaly)
- Compliance violation detected in active ads
- Google/Microsoft returns ACCOUNT_SUSPENDED error

Locations auto-pause immediately (no human confirmation needed):
- `location.status` set to `paused` or `inactive` (handled by Location Status Toggle — Item 5)

---

## 3. Cross-Platform Attribution Model Design

### 3.1 Unified Click ID Model

Currently: `leads` table captures `gclid` (Google) and `fbclid` (Meta). V2 adds `msclkid` for Microsoft Advertising.

**Schema migration required:**
```sql
ALTER TABLE leads ADD COLUMN msclkid TEXT;
CREATE INDEX idx_leads_msclkid ON leads(msclkid) WHERE msclkid IS NOT NULL;
```

**Landing page capture (update `app/(marketing)/[city]/[slug]/page.tsx`):**
```typescript
// Capture all three click IDs from URL params
const gclid = searchParams.get('gclid') ?? getCookie('_gclid')
const msclkid = searchParams.get('msclkid') ?? getCookie('_msclkid')
const fbclid = searchParams.get('fbclid') ?? getCookie('_fbc')

// Store in cookies for multi-page sessions
setCookie('_gclid', gclid, { maxAge: 90 * 24 * 60 * 60 })
setCookie('_msclkid', msclkid, { maxAge: 90 * 24 * 60 * 60 })
```

**Lead creation (update server action):**
```typescript
await supabaseAdmin.from('leads').insert({
  ...leadData,
  gclid,
  msclkid, // NEW
  fbclid,
  utm_source: searchParams.get('utm_source'),
  utm_medium: searchParams.get('utm_medium'),
  utm_campaign: searchParams.get('utm_campaign'),
})
```

### 3.2 Offline Conversion Upload Schedule Per Platform

| Platform | Upload Service | Frequency | Format | Delay Requirement |
|---|---|---|---|---|
| Google | ConversionUploadService (v23) | Every 6 hours | GCLID + conversion_time + value | None (immediate) |
| Microsoft | CampaignManagementService.ApplyOfflineConversions | Every 6 hours | MSCLKID + ConversionTime + value | Wait 2 hours after click before upload |
| Meta | Conversions API (CAPI) | On lead creation (real-time) | FBC + event_name + no PHI | None |

**Inngest function structure (extend `offline-conversions.ts`):**
```typescript
// Run Google and Microsoft uploads in parallel steps
const [googleResult, microsoftResult] = await Promise.all([
  step.run('upload-google', () => uploadGoogleConversions(pendingGoogle)),
  step.run('upload-microsoft', () => uploadMicrosoftConversions(pendingMicrosoft)),
])
```

### 3.3 Attribution Credit Model for Healthcare

**The problem:** A patient may click a Google Search ad, then a Bing ad, then visit organically before booking. Which source gets credit?

**Recommended model: Last Non-Direct Click with 90-day window**

Rationale:
- Healthcare has long consideration cycles (2-6 weeks average)
- The click that immediately precedes conversion is most actionable for PPC optimization
- Last-click attribution is what Google and Microsoft use natively for Smart Bidding signals
- Consistency with platform attribution models prevents optimization conflicts

**Implementation:**
```typescript
// Attribution priority (checked in order):
// 1. GCLID present → Google
// 2. MSCLKID present → Microsoft
// 3. FBCLID present → Meta
// 4. UTM source/medium → Other paid (CallRail, etc.)
// 5. Organic / Direct

function determineLeadSource(lead: Lead): string {
  if (lead.gclid) return 'google'
  if (lead.msclkid) return 'microsoft'
  if (lead.fbclid) return 'meta'
  if (lead.utm_source) return lead.utm_source
  return 'organic'
}
```

**Future v3 consideration:** Multi-touch attribution (linear or time-decay) becomes viable once volume exceeds 100 conversions/month per location. At lower volumes, data is too sparse for multi-touch models to be statistically meaningful.

### 3.4 Attribution Record Updates for v2

Extend `attribution_records` table:
```sql
ALTER TABLE attribution_records
  ADD COLUMN microsoft_conversion_uploaded BOOLEAN DEFAULT FALSE,
  ADD COLUMN microsoft_conversion_uploaded_at TIMESTAMPTZ,
  ADD COLUMN msclkid TEXT,
  ADD COLUMN source TEXT; -- 'google','microsoft','meta','organic','direct'
```

---

## 4. Reporting Automation Design

### 4.1 Cross-Platform Spend Data Model Extension for Microsoft

**Current `spend_records` schema** stores `platform TEXT CHECK (platform IN ('google','meta'))`.

**V2 update:**
```sql
ALTER TABLE spend_records DROP CONSTRAINT spend_records_platform_check;
ALTER TABLE spend_records ADD CONSTRAINT spend_records_platform_check
  CHECK (platform IN ('google','meta','microsoft'));
```

**Microsoft spend pull (extend `spend-reporting.ts` Inngest function):**
- Use ReportingService → CampaignPerformanceReport
- Pull: campaign_id, spend, clicks, impressions, conversions, conversion_value
- Schedule: daily at 3am (1 hour after Google pull at 2am)
- Store in `spend_records` with `platform = 'microsoft'`

**Data model for unified dashboard query:**
```sql
-- Total spend across platforms per location per day
SELECT
  location_id,
  spend_date,
  SUM(CASE WHEN platform = 'google' THEN spend ELSE 0 END) AS google_spend,
  SUM(CASE WHEN platform = 'microsoft' THEN spend ELSE 0 END) AS bing_spend,
  SUM(spend) AS total_spend,
  SUM(clicks) AS total_clicks,
  SUM(conversions) AS total_conversions
FROM spend_records
WHERE spend_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY location_id, spend_date
ORDER BY location_id, spend_date;
```

### 4.2 Automated Weekly Client Report Content

**Delivery:** Every Monday 7am local time (location timezone). Sent via Resend to `org_admin` role contacts.

**Report contents (what clinic operators care about):**
1. **New patients acquired this week** — leads that reached `status = 'showed'`
2. **Consultations booked** — leads that reached `status = 'booked'`
3. **Cost per new patient** — total ad spend / showed patients this week
4. **New leads this week** — total by source (Google, Bing, Organic)
5. **Total phone calls** — CallRail tracker count
6. **Your Google Business Profile** — review count, average rating, posts published
7. **Week-over-week trend** — are leads going up or down vs same week last month

**What NOT to include in client reports:** CPM, CTR, impressions, Quality Score, ROAS, conversion rate by ad group, keyword-level data. These are operator metrics. Clinicians want patient outcomes, not advertising jargon.

### 4.3 AI-Generated Narrative Format

The `ai-insights` Inngest function (currently weekly) generates the narrative text for weekly reports.

**Prompt structure (v2):**
```typescript
const prompt = `
You are analyzing marketing performance for a men's health clinic: ${locationName} in ${city}.

Performance data:
- This week's new leads: ${weeklyLeads}
- This week's showed appointments: ${weeklyShowed}
- This week's ad spend: $${weeklySpend}
- Google cost per lead: $${googleCPL}
- Bing cost per lead: $${bingCPL}
- Previous week showed appointments: ${prevWeekShowed}
- GBP average rating: ${gbpRating} (${reviewCount} reviews)

Write a 3-paragraph executive summary for the clinic owner:
1. What happened this week (plain language, no jargon)
2. What is working and what needs attention
3. One specific recommendation they can act on

Requirements:
- Never use: CPM, CTR, ROAS, CPC, impressions, quality score, ad rank
- Always use: "new patients", "consultations", "calls", "reviews"
- Positive, professional tone
- Under 250 words total
`
```

### 4.4 Email Delivery via Resend

**Template structure:**
```typescript
// app/api/cron/weekly-report/route.ts (Vercel cron at Monday 7am UTC)
await resend.emails.send({
  from: 'Marketing Engine <reports@nustack.digital>',
  to: orgAdmin.email,
  subject: `Your Weekly Marketing Summary — ${locationName} — Week of ${weekStart}`,
  react: WeeklyReportEmail({ metrics, aiNarrative, locationName }),
})
```

**WeeklyReportEmail component** (create in `components/emails/WeeklyReport.tsx`):
- Top section: 4 metric cards (New Patients, Consultations Booked, Total Calls, Average Rating)
- Middle: AI narrative text (3 paragraphs)
- Chart: Simple week-over-week bar chart (leads and showed appointments)
- Bottom: Link to full dashboard + "Need to talk?" CTA

**Resend tracking:** Enable open and click tracking to know which clinic owners are reading reports. Add `email_opens` field to organizations table for engagement tracking.

**Multi-location report:** Orgs with 2+ locations get one summary email with a table showing all locations side-by-side, plus individual location detail sections.

---

## Implementation Priority Order (v2 Build Queue)

1. **Schema migrations:** Add `msclkid` to `leads`, update `spend_records` platform constraint, add Microsoft attribution fields to `attribution_records`
2. **Landing page MSCLKID capture:** Update `app/(marketing)/[city]/[slug]/page.tsx` and form submission
3. **Microsoft Advertising API client:** Create `lib/microsoft-ads.ts` using `bingads-sdk`
4. **Campaign factory v2:** Extend `inngest/functions/campaign-factory.ts` with Microsoft parallel step
5. **Offline conversions v2:** Extend `inngest/functions/offline-conversions.ts` with Microsoft upload
6. **Spend reporting v2:** Extend `inngest/functions/spend-reporting.ts` with Microsoft ReportingService pull
7. **Budget pacing v2:** Add day-of-week seasonality and holiday detection
8. **Weekly report email:** Create Resend email template + Vercel cron trigger
9. **Performance Max:** Add as optional step in campaign factory after 14 days of Search data

---

## Required New Environment Variables (v2)

```env
# Microsoft Advertising
MICROSOFT_ADS_CLIENT_ID=
MICROSOFT_ADS_CLIENT_SECRET=
MICROSOFT_ADS_REFRESH_TOKEN=
MICROSOFT_ADS_DEVELOPER_TOKEN=
MICROSOFT_ADS_MCC_CUSTOMER_ID=

# Resend (already wired)
RESEND_API_KEY= # already exists

# Google Ads (already wired)
GOOGLE_ADS_DEVELOPER_TOKEN= # already exists
```

---

## Sources

- [Google Ads API v23 Complete Guide 2026 | ALM Corp](https://almcorp.com/blog/google-ads-api-v23-complete-guide-2026/)
- [Microsoft Advertising API v13 | Microsoft Learn](https://learn.microsoft.com/en-us/advertising/)
- [Offline Conversion API | Microsoft Advertising](https://learn.microsoft.com/en-us/advertising/campaign-management-service/offlineconversion?view=bingads-13)
- [Manage Offline Conversions | Google Ads API Developer Docs](https://developers.google.com/google-ads/api/docs/conversions/upload-offline)
- [Google Ads Budget Pacing Update March 2026 | Search Engine Land](https://searchengineland.com/google-to-change-budget-pacing-for-campaigns-using-ad-scheduling-470214)
- [Smart Bidding Guide | Sarah Stemen](https://www.thesarahstemen.com/blog/google-ads-smart-bidding-guide)
- [Target CPA Bidding 2026 | Store Growers](https://www.storegrowers.com/target-cpa/)
- [Healthcare PPC Attribution Best Practices | Cardinal Digital Marketing](https://www.cardinaldigitalmarketing.com/healthcare-resources/blog/healthcare-ppc-google-ads-trends-2026/)
- [Microsoft Performance Max 2026 | ALM Corp](https://almcorp.com/blog/microsoft-performance-max-customer-acquisition-2026-guide/)
- [Budget Pacing Ultimate Guide | Improvado](https://improvado.io/blog/budget-pacing)
