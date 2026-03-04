# Google Ads Deep Dive — 2026
## For NuStack Marketing Engine: Healthcare / Men's Health Clinic PPC

---

## 1. Campaign Types 2026 — When to Use Each for Healthcare

### Search Campaigns
The gold standard for healthcare. Captures high-intent users actively searching for a solution. For men's health and TRT clinics, Search campaigns target queries like "men's health clinic near me," "low testosterone doctor," or "hormone optimization Chicago." These users have indicated need — conversion rates are highest here. Always start here. Budget priority: 60% of total ad spend.

**Healthcare-specific advantage:** Search ads appear only when someone actively queries. This is more defensible under healthcare policy than broad targeting — you're not reaching people who never expressed interest in your service.

### Performance Max (PMax)
An AI-driven campaign type that serves across all Google inventory — Search, Display, YouTube, Gmail, Discover, and Maps — using machine learning to optimize placement and bidding. In 2026, PMax has expanded search theme limits to 50 per asset group (doubled from 25).

**For healthcare:** Use with caution. The AI will mix assets in ways you cannot fully control, which creates compliance risk if your headlines or images are combined inappropriately. However, for awareness-stage campaigns with tightly-themed asset groups, PMax can extend reach cost-effectively. Never use PMax as your primary campaign — supplement Search after you have conversion data. Ensure each asset group is tightly themed around one service (e.g., "Low T Symptoms" as its own group, not mixed with "Men's Primary Care").

### Display Campaigns
Visual banner ads across millions of websites in the Google Display Network. Useful for retargeting (showing ads to prior site visitors) and awareness. For healthcare, Display has heavy restrictions — no "sensitive interest" remarketing allowed for health conditions.

**Healthcare use case:** Generic men's wellness messaging to broad audiences. Cannot retarget based on health condition signals. Effective for brand awareness during an area launch.

### Video Campaigns (YouTube)
Powerful for explaining services, showcasing testimonials, and building trust before a conversion. Video generates the highest brand recall. For men's health, a 30-second "What is Low T?" explainer or a patient journey story works well.

**Compliance note:** Avoid any language implying prescription drug outcomes. Focus on lifestyle, energy, confidence — not clinical outcomes or drug names.

### Demand Gen Campaigns
Google's successor to Discovery campaigns, serving on YouTube, Gmail, and Discover. Designed for mid-funnel audience building. Less policy-constrained than direct healthcare Search ads. Useful for building awareness with lookalike audiences.

### Shopping Campaigns
Not applicable for healthcare service businesses. Skip.

---

## 2. Smart Bidding Strategies — Mechanics, Healthcare Use Cases, Minimum Data Thresholds

### Target CPA (Cost Per Acquisition)
**Mechanic:** Google's AI automatically sets bids to achieve conversions at your specified cost target. It uses signals including device, location, time of day, search query, and browser to predict conversion probability per auction.

**Healthcare use case:** Ideal once you have enough conversion volume. Set target CPA = your maximum acceptable cost per booked consultation. Start slightly higher than your actual goal — give the algorithm room to learn.

**Minimum threshold:** 15 conversions in the last 30 days (technical minimum). Google recommends 30+ per month for stable performance. Below 15, the algorithm is guessing more than learning — you'll see high volatility.

**Healthcare caveat:** HIPAA requires server-side offline conversion tracking. Client-side conversion tags on confirmation pages risk capturing PHI in the URL. Use Google's offline conversion import (GCLID-based) as the sole conversion signal. This means your conversion data is always delayed by import frequency (minimum every 6 hours), so Smart Bidding will have less real-time signal than a direct tag.

### Target ROAS (Return on Ad Spend)
**Mechanic:** Bids to maximize conversion value relative to your specified return target. Requires conversion value data (revenue) to be uploaded.

**Healthcare use case:** Once you're uploading appointment revenue via offline conversions, ROAS bidding becomes viable. Set target ROAS based on your actual revenue per showed patient versus ad spend.

**Minimum threshold:** 50 conversions per month recommended. At fewer conversions, Target ROAS underperforms Target CPA because revenue optimization needs more data variance.

**For multi-location clinics:** If a location is generating 50+ showed appointments per month, switch from Target CPA to Target ROAS with revenue values from your practice management system. This is the end-state optimization goal.

### Maximize Conversions
**Mechanic:** Spends your budget to get the maximum number of conversions regardless of CPA. Has an optional Target CPA constraint.

**Healthcare use case:** Use this during the learning phase (first 30 days of a new campaign). Allows Google to explore conversion opportunities without a CPA constraint. Transition to Target CPA once you have 30 conversions.

**Risk:** Can overspend on low-quality conversions if your conversion definition is too broad (e.g., "contact page view" rather than "consultation booked"). Ensure conversion quality before running Maximize Conversions unconstrained.

### Maximize Conversion Value
**Mechanic:** Optimizes for total revenue rather than conversion count. Requires revenue values.

**Healthcare use case:** End-state bidding once you have revenue data flowing. Prioritizes leads that become high-revenue patients.

### Manual CPC
**When to use:** New campaigns, locations with very low volume, or when Smart Bidding data thresholds are not met. More predictable but misses auction-level optimization.

**2026 context:** Google is gradually reducing Manual CPC support. Plan to migrate to Smart Bidding as soon as data allows.

---

## 3. Google Ads API — Current Version and Full Capabilities

**Important:** Google Ads API v19 sunset on February 11, 2026. As of March 2026, the current version is v23 (released January 28, 2026). All new development must target v23 or later.

### v23 Key Changes
- Channel-level reporting for Performance Max campaigns — breakdown by Search, YouTube, Display, Gmail, Maps, Discover via API for the first time
- ConversionUploadService: `debug_enabled` mode removed — no longer distinguishes CLICK_NOT_FOUND from SUCCESS for enhanced conversion lead imports
- PMax brand guidelines field via `EnablePMaxBrandGuidelines` method

### Core Services (v23)

**CampaignService:** Create, update, retrieve, and remove campaigns. Set bidding strategy, budget, geo-targeting, language targeting, and status. For location radius targeting, use `CampaignCriterionService` with `LocationCriterion` + `DistanceInfo`.

**AdGroupService:** Create and manage ad groups within campaigns. Set ad group-level bid, status, and type (SEARCH_STANDARD, DISPLAY_STANDARD, etc.).

**AdService:** Manage ads within ad groups. For RSA (Responsive Search Ads), use `ResponsiveSearchAdInfo` with headlines and descriptions arrays.

**KeywordPlanService:** Research keyword ideas, volume estimates, and competition data without creating live campaigns. Use for pre-launch keyword research per location.

**ConversionUploadService:** Upload click conversions (GCLID-based) and enhanced conversions for leads. Primary service for our offline conversion pipeline.

**CampaignBudgetService:** Create and update campaign budgets. For shared budgets across locations, one budget object can be linked to multiple campaigns.

**BiddingStrategyService:** Create portfolio bidding strategies (shared across campaigns). Use for Target CPA and Target ROAS strategies shared across a location's campaigns.

**CustomerService:** Manage customer accounts under MCC. List accessible accounts, get account metadata.

**ReachPlanService:** Forecast reach, impressions, and CPM for video and display campaigns by target audience and budget.

### GAQL (Google Ads Query Language)

GAQL is SQL-like. Resources are the primary entity, with fields selected using dot notation.

**Example — query conversion actions:**
```sql
SELECT customer.id, conversion_action.id, conversion_action.name,
       conversion_action.type, conversion_action.resource_name
FROM conversion_action
WHERE conversion_action.type = 'UPLOAD_CLICKS'
  AND conversion_action.status = 'ENABLED'
```

**Example — query campaign spend:**
```sql
SELECT campaign.id, campaign.name, metrics.cost_micros,
       metrics.clicks, metrics.impressions, metrics.conversions
FROM campaign
WHERE segments.date DURING LAST_7_DAYS
  AND campaign.status = 'ENABLED'
```

**Key GAQL rules:**
- `segments.date` and `segments.date_range` for time filtering
- `metrics` fields only available with a date segment or date range
- Cannot mix resource-level and segment-level fields arbitrarily — some field combinations are incompatible
- v23 Developer Assistant v2.0 added improved GAQL validation for date segment edge cases

---

## 4. Offline Conversion Import — Step-by-Step, Best Practices

### GCLID-Based Offline Conversion Flow

**Step 1 — Enable auto-tagging**
Google Ads auto-appends `?gclid=XXXX` to all ad click destination URLs. Confirm auto-tagging is enabled in account settings.

**Step 2 — Capture GCLID on landing page**
On landing page load, parse `gclid` from URL params and store in a first-party cookie (90-day expiry) and in the lead form hidden field. On form submit, save gclid to Supabase `leads.gclid` column.

**Step 3 — Create conversion action via API**
Use `ConversionActionService.MutateConversionActions` to create a "Booked Appointment" conversion action with:
- `type = UPLOAD_CLICKS`
- `counting_type = ONE_PER_CLICK`
- `conversion_window_days = 90` (recommended for healthcare — appointment booking can lag 30+ days)

**Step 4 — Upload via ConversionUploadService**
When a lead is booked or showed, the Inngest `offline-conversions` function uploads:
```json
{
  "customer_id": "GOOGLE_ADS_CUSTOMER_ID",
  "conversions": [{
    "gclid": "EAIaIQobChMI...",
    "conversion_action": "customers/CUSTOMER_ID/conversionActions/ACTION_ID",
    "conversion_date_time": "2026-03-04 14:30:00+00:00",
    "conversion_value": 350.00,
    "currency_code": "USD"
  }]
}
```

**Step 5 — Upload frequency**
Minimum every 6 hours (our Inngest cron schedule). Google recommends daily or twice-daily for most advertisers. Faster upload = faster Smart Bidding signal. For healthcare with low volumes, daily upload is sufficient.

### Enhanced Conversions for Leads (EC4L)
Advertisers who used first-party data (email + phone) alongside GCLIDs saw a median 10% conversion increase. EC4L uses SHA-256 hashed PII to match across devices when GCLID is missing (e.g., returning users).

**HIPAA consideration:** SHA-256 hashed email and phone are not PHI in hashed form and can be transmitted to Google. Do NOT transmit name, address, DOB, or health condition data.

### Conversion Window Settings
For healthcare service businesses, use 90-day windows. Patients research, consider, and book across weeks or months. The default 30-day window misses delayed conversions. Set separately per conversion action.

### 2026 API Changes
- February 2026: Stricter conversion data requirements added. `operating_customer_id` is now required in upload requests when the upload is made from an MCC-level account.

---

## 5. Healthcare/Medical Advertising Policies 2026

### What's Allowed
- Men's health clinic advertising (non-drug, clinic-level)
- Hormone optimization services (clinic-level, not drug-specific)
- "Low testosterone doctor" keywords
- "TRT clinic near me" keywords — clinic term, not drug term
- Primary care men's health
- Lifestyle and wellness framing

### What Triggers Suspension
- Specific Rx drug names in ad copy or keywords: testosterone cypionate, enanthate, anastrozole
- "Prescription testosterone" combined claims
- Before/after claims with specific health outcomes
- "Guaranteed" results language
- Ads linking to pages with telehealth Rx purchase flows (FDA off-label restrictions)
- Off-label drug promotion

### 2026 Policy Update — Healthcare Professional (HCP) Targeting
Google reintroduced limited HCP targeting for eligible B2B health advertisers. This allows medical device manufacturers and professional service providers to target licensed HCPs directly — not applicable to direct-to-consumer men's health clinic advertising, but relevant if NuStack ever offers B2B marketing to clinic operators.

### Appeals Process
Google Ads suspends accounts for policy violations without prior warning. Appeals:
1. Navigate to Appeal form in Google Ads dashboard
2. Provide detailed written explanation of why the violation was unintentional or how it has been corrected
3. Google reviews in 2-3 business days (can take up to 7)
4. Only reinstated in "compelling circumstances" — be thorough and honest
5. Build a backup MCC sub-account structure per client for faster recovery

### Compliance Architecture for Marketing Engine
- All ad copy generated by Claude must pass `lib/compliance.ts` keyword check before API submission
- Never use drug names in headlines, descriptions, display URLs, or sitelinks
- Landing pages must not contain telehealth Rx ordering flows
- Compliance check runs synchronously in campaign factory — fails the step if violations found

---

## 6. Performance Max for Healthcare

### Asset Group Structure
Recommended structure for a men's health clinic:
- **Asset Group 1:** "Men's Health General" — broad men's wellness imagery, lifestyle headlines, general benefit descriptions
- **Asset Group 2:** "Low T Symptoms" — symptom-focused copy (energy, libido, mood — no clinical language), treatment-journey imagery
- **Asset Group 3:** "TRT Clinic" — clinic-specific copy, doctor imagery, appointment-focused CTAs
- **Asset Group 4:** "Hormone Optimization" — optimization and performance framing, active lifestyle imagery

Each asset group: 15 headlines, 5 descriptions, 20 images (mix of landscape, square, portrait), 5 videos (15s and 30s variants).

### Search Themes (v23 expanded to 50 per asset group)
Each asset group gets up to 50 search themes — phrases that direct the PMax algorithm to prioritize. Treat these like broad match keywords without explicit bidding. Example themes for "Low T Symptoms" group:
- "low energy men"
- "low testosterone symptoms"
- "men's health clinic"
- "hormone imbalance men"
- "fatigue weight gain men"

### Audience Signals
Attach one primary audience concept per asset group:
- **In-Market:** "Healthcare Services" (within allowed health categories)
- **Custom Intent:** built from URL list of competitor sites + health search terms
- **Customer Match:** existing contact list (hash PII) — for upsell/retention if BAA covers
- **Remarketing:** site visitors (caution — health-context pages create sensitive audience lists under Google policy)

**Critical:** Audience signals are directional hints, not hard restrictions. Google will bid to your signals but may expand beyond them for conversions.

### Budget Allocation
PMax is greedy — it will consume budget. For healthcare, allocate no more than 30% of campaign budget to PMax until ROAS is proven. Always run a Search campaign alongside PMax so Search terms are protected.

---

## 7. RSA (Responsive Search Ad) Best Practices

### Structure
- **Headlines:** Provide all 15. Google requires variety — avoid duplicating themes across too many headlines.
- **Descriptions:** Use all 4. Each description should be self-contained — Google mixes them unpredictably.
- **Character limits:** Headlines = 30 characters, Descriptions = 90 characters.

### Ad Strength Algorithm
Google's Ad Strength metric reflects headline/description diversity and relevance. Aim for "Good" or "Excellent." Below "Average" = leave impressions on the table. Ad Strength does not directly measure conversion performance — use it as a quality guardrail, not the primary optimization metric.

### Headline Pinning Strategy
Pin position 1 and/or 2 headlines for compliance-required messaging (e.g., clinic name for brand consistency, or a required disclaimer). Avoid pinning more than 2 positions — reduces Google's ability to test combinations.

**Healthcare pinning use case:** Pin position 1 = "[Clinic Name] Men's Health Clinic" to ensure brand is always present and prevents AI from showing compliance-risky combinations without brand context.

### Copy Best Practices for Healthcare
- Headline 1: Brand + service type
- Headlines 2-4: Symptom/concern framing ("Feeling Tired? Low Energy?")
- Headlines 5-8: Benefit claims ("Feel Like Yourself Again", "Expert Men's Health Care")
- Headlines 9-12: Location and availability ("Chicago & Naperville Locations", "Book in 60 Seconds")
- Headlines 13-15: Social proof / credibility ("Board-Certified Physicians", "Free Consultation")
- All headlines compliance-checked against drug term blocklist before API submission

---

## 8. Budget Pacing

### Google's Native Daily Budget Algorithm
Google's native pacing can spend up to 2x your daily budget on high-traffic days, constrained to 30.4x daily budget per month (the monthly cap). This allows Google to capture peak opportunity days while averaging to your target.

**March 1, 2026 change:** Google updated pacing for ad-scheduled campaigns — the system now proactively spends up to the full monthly cap regardless of ad schedule. Example: if a campaign runs Mon-Fri only, Google will now pack 30.4x daily budget into those ~22 days, resulting in ~38% higher actual daily spend during run days. This is a critical change — campaigns with tight ad schedules will overspend their original daily expectation.

### When Manual Pacing Beats Native
- Ad-scheduled campaigns where predictable spend per active day matters
- Month-end budget tight with specific ROI target
- New campaign learning phase where spend predictability is preferred over AI optimization

### NuStack Budget Pacing Engine Design
Our Inngest cron (every 4 hours) does:
```
expected = (days_elapsed / days_in_month) * monthly_budget
if actual > expected * 1.15: reduce daily_budget by 10% (floor: $5/day)
if actual < expected * 0.85: increase daily_budget by 10% (cap: monthly_budget/28 * 1.1)
```
This prevents both overspend (which wastes budget late in month) and underspend (which misses patient acquisition opportunities).

**Post March 2026 update:** If a location uses ad scheduling, recalculate expected spend using active days, not calendar days.

---

## 9. Multi-Location Campaign Structure

### Option A: Single Campaign + Location Extensions
One campaign serves all locations. Location assets (formerly location extensions) are linked from Google Business Profile, showing the nearest clinic address in the ad. Geo-targeting set to overlap of all clinic radius areas.

**Pros:** Simpler management, consolidated conversion data for Smart Bidding, faster learning phase.
**Cons:** Cannot allocate different budgets per location, cannot customize messaging per city, cannot isolate performance by location as cleanly.

**Use when:** All locations share the same budget, messaging, and competitive situation.

### Option B: Location-Segmented Campaigns
One campaign per location. Each campaign has city-specific headlines, location-radius targeting, and its own budget.

**Pros:** Full budget control per location, city-specific ad copy ("Chicago Men's Health Clinic"), precise performance attribution, ability to pause underperforming locations without affecting others.

**Cons:** Fragments conversion data — each campaign learns independently. Locations with <15 conversions/month will struggle with Smart Bidding.

**Use when:** Locations have meaningfully different budgets, competitive environments, or service mixes. Preferred approach for NuStack multi-location engine.

### Recommended: Hybrid Approach
One campaign per location at the Search level, with shared PMax campaign across all locations using asset groups per city. This gives location-level budget control on Search while pooling PMax conversion data for faster AI learning.

---

## 10. Automated Rules vs Scripts vs API — Decision Matrix

| Use Case | Automated Rules | Scripts | API |
|---|---|---|---|
| Pause campaigns if cost > $X | Yes | Yes | Yes |
| Weekly budget pacing adjustment | Possible | Better | Best |
| Auto-generate ad copy | No | Limited | Yes (full) |
| Multi-location campaign creation | No | Possible | Yes (preferred) |
| Offline conversion upload | No | No | Yes (required) |
| Bid adjustments at scale | Limited | Yes | Yes |
| Complex conditional logic | No | Yes | Yes |

**For NuStack Marketing Engine:** API is the only viable path. Automated rules are too limited; Scripts require Google Ads UI access and don't support external data. The Inngest + Google Ads API v23 architecture is correct.

---

## 11. Audience Targeting

### Customer Match
Allows uploading hashed first-party data (email, phone) to target existing contacts or build lookalike audiences.

**Healthcare restriction (2026):** Customer Match cannot be used for "sensitive interest" product/service promotion. Men's health clinic advertising falls in the "moderately restricted" healthcare category. In practice: Customer Match for brand awareness and general wellness messaging is permitted. Customer Match for re-targeting users who previously visited health-condition-specific pages may trigger policy review.

**2026 update:** Customer Match IS allowed for licensed healthcare professionals targeting other professionals (HCP-to-HCP). Irrelevant for consumer-facing clinic marketing.

**Safe use:** Upload hashed patient contact list for general men's wellness campaigns (not condition-specific). Exclude from ad groups that have health-condition framing.

### In-Market Audiences for Healthcare
Google's In-Market audiences for healthcare are available but limited:
- "Healthcare Services" — broad
- "Physicians & Surgeons" — for HCP targeting
- "Men's Health" may not exist as a discrete segment — use "Healthcare Services" + "Sports Nutrition" for men's health adjacent signals

Layer In-Market audiences as observation (not targeting) to gather bid modifier data without restricting reach.

---

## 12. Location Extensions / Local Campaigns

### Location Assets (formerly Location Extensions)
Created by linking Google Business Profile to Google Ads. Automatically pulls address, phone, hours, and photos. Shows address beneath ad text, enabling "directions" and "call" buttons on mobile.

**Setup:** Link GBP to Google Ads account in "Linked accounts" settings. Location assets propagate automatically from GBP data. For multi-location, create a location group per region.

**Critical for NuStack:** Our `locations.gbp_location_id` field maps directly to the GBP location. When a location is activated, the campaign factory should also ensure the GBP is linked to the Google Ads account for automatic location asset creation.

### Call-Only Ads
Ad type that shows only a phone number — clicking calls the clinic directly. No website visit. High intent, lower-funnel. Cannot track GCLID for call-only (no URL click). Use CallRail tracking numbers as the call-only destination — CallRail captures the inbound call and fires a webhook to create a lead record.

### Lead Form Extensions (2026)
Lead form assets allow users to submit contact info directly within the Google Ads ad unit without visiting the landing page. For healthcare: can collect first name, phone — but NOT health condition information.

**NuStack use:** Wire lead form submissions to the same `POST /api/leads/create` endpoint as the landing page form. Include `source: 'google_lead_form'` in the lead record for attribution tracking.

---

## Sources

- [Healthcare PPC & Google Ads Marketing Trends 2026 | Cardinal Digital Marketing](https://www.cardinaldigitalmarketing.com/healthcare-resources/blog/healthcare-ppc-google-ads-trends-2026/)
- [2026 Search Advertising Rules for Health Brands | Accelerated Digital Media](https://www.accelerateddigitalmedia.com/insights/health-policies-and-restrictions-guide-for-google-ads-microsoft-ads-2026/)
- [Google Ads API v23 Complete Guide | ALM Corp](https://almcorp.com/blog/google-ads-api-v23-complete-guide-2026/)
- [Announcing v23 of the Google Ads API | Google Developer Blog](https://ads-developers.googleblog.com/2026/01/announcing-v23-of-the-google-ads-api.html)
- [About Smart Bidding | Google Ads Help](https://support.google.com/google-ads/answer/7065882?hl=en)
- [Manage offline conversions | Google Ads API Developer Docs](https://developers.google.com/google-ads/api/docs/conversions/upload-offline)
- [Google Ads Performance Max 2026 Strategy Guide | ALM Corp](https://almcorp.com/blog/google-ads-performance-max-2026-strategy-guide/)
- [Mastering Google Ads Budget Pacing 2026 | Sarah Stemen](https://www.thesarahstemen.com/blog/budget-pacing-strategies)
- [Google Ads Budget Pacing for Ad Scheduling Updated | Search Engine Land](https://searchengineland.com/google-to-change-budget-pacing-for-campaigns-using-ad-scheduling-470214)
- [Customer Match Policy | Advertising Policies Help](https://support.google.com/adspolicy/answer/6299717?hl=en)
- [Healthcare and Medicines Advertising Policies | Google](https://support.google.com/adspolicy/answer/176031?hl=en)
- [Responsive Search Ads 2026 Guide | Growth Minded Marketing](https://growthmindedmarketing.com/blog/responsive-search-ads/)
- [Google Ads Location Extensions | Store Growers](https://www.storegrowers.com/location-extensions/)
- [Multi-Location PPC Guide | SEOplus+](https://seoplus.com/paid-ads/the-ultimate-guide-to-multi-location-ppc-advertising-on-google-ads/)
