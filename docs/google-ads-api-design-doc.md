# Google Ads API Standard Access Application
## Design Documentation

---

**Company:** NuStack Digital Ventures
**Application Type:** Google Ads API Standard Access
**MCC Customer ID:** 676-717-2347
**Live Platform URL:** https://marketing-engine-roan.vercel.app
**Date:** March 2026

---

## 1. Company Name

**NuStack Digital Ventures**

NuStack Digital Ventures, LLC is a software company headquartered in the United States that builds and operates industry-specific marketing automation platforms for small and mid-size businesses. Our flagship product, the **NuStack Marketing Engine**, is a managed advertising platform that provides programmatic Google Ads management for client businesses across healthcare, professional services, home services, and wellness verticals.

---

## 2. Business Model

NuStack Digital Ventures operates as a **managed service provider (MSP)** and **Google Ads agency** using an MCC (My Client Center) structure. We do not resell API access — we operate a closed SaaS platform that manages Google Ads campaigns entirely on behalf of our clients.

**MCC Account:** Customer ID 676-717-2347

**Revenue Model:**
- Clients pay a percentage of their monthly ad spend as a management fee
- NuStack manages all ad spend, campaign structure, and optimization
- Clients access performance reporting through our dashboard but do not directly modify campaigns

**Client Verticals Served:**
- Professional services (legal, accounting, consulting, financial)
- Home services (HVAC, plumbing, electrical, landscaping, pest control)
- Wellness and fitness (gyms, yoga studios, med spas, personal training)
- Healthcare (medical clinics, dental practices, specialty care)
- Retail and e-commerce (local retail, boutiques, online stores)
- Food and beverage (restaurants, cafes, catering)
- Automotive (dealerships, repair shops, detailing)
- Real estate (agencies, property management, mortgage brokers)
- Education (tutoring centers, trade schools, coaching)

**Scale:**
- Platform manages campaigns for multiple client organizations, each with one or more physical locations
- Each client location receives its own Google Ads sub-account linked under our MCC
- All campaign creation, budget management, and optimization is automated via the Google Ads API

**Compliance posture:** NuStack does not use remarketing lists, Customer Match, or audience targeting based on health conditions, diagnoses, or any sensitive health-related signals. Our platform does not build or upload remarketing audiences for healthcare clients. Offline conversion uploads use only GCLID values and abstracted event names (e.g., "Booked Appointment") — no patient names, diagnoses, or clinical data are included in any API payload. This applies across all verticals.

---

## 3. Tool Access / Use

### User Roles

The NuStack Marketing Engine has two distinct user groups:

**Internal Users — NuStack Staff (super_admin role)**
- Full platform access across all client organizations
- Manage MCC structure, campaign factory configuration, and API credentials
- Monitor pacing alerts, audit conversion upload logs, and troubleshoot campaign issues
- Access to raw GAQL query logs and system health dashboards

**External Users — Client Stakeholders (org_admin, location_manager roles)**
- Read-only access scoped to their own organization's data
- View campaign performance dashboards: spend, impressions, clicks, conversions
- View lead attribution reports: which leads had GCLIDs captured and which conversions were uploaded
- Cannot create, modify, pause, or delete campaigns — all campaign management is performed programmatically by the NuStack platform

### Access Control

- Authentication is handled by **Clerk** (role-based access control)
- All API routes enforce organization-scoped data access via Supabase Row Level Security (RLS)
- No client user can access another client's data

### Platform Accessibility

The tool is live and externally accessible at:

**https://marketing-engine-roan.vercel.app**

*Note: The platform URL will migrate to a custom domain (e.g., app.nustack.digital) as the product moves toward general availability. The underlying application, API usage, and functionality described in this document will remain unchanged.*

The platform is a Next.js 16 web application hosted on Vercel. The backend database is Supabase (PostgreSQL). Background jobs (campaign factory, reporting crons, conversion uploads, budget pacing) run on **Inngest** — a durable background job platform.

---

## 4. Tool Design

The NuStack Marketing Engine consists of five automated subsystems that interact with the Google Ads API:

---

### 4.1 Campaign Factory

**Trigger:** When a new client location record is created and its status is set to `active`, an Inngest background event fires the Campaign Factory workflow.

**Purpose:** Automatically provision a complete, production-ready Google Ads campaign structure for that location without manual intervention.

**Workflow steps:**

1. Retrieve location metadata: business name, address, latitude/longitude, monthly budget, target service area radius
2. Call `CustomerService` to create or link the client's Google Ads sub-account under MCC 676-717-2347
3. Call `KeywordPlanIdeaService` to generate seed keyword ideas based on business category and location
4. Call `CampaignBudgetService` to create a shared daily budget (monthly budget ÷ 30.4)
5. Call `CampaignService` to create a Search campaign with target CPA bidding and location-specific naming convention
6. Call `CampaignCriterionService` to apply geo-targeting: proximity radius (miles) centered on the clinic's lat/lng coordinates
7. Call `AdGroupService` to create structured ad groups organized by service category
8. Call `AdService` (ResponsiveSearchAdInfo) to create RSA ads with AI-generated headlines and descriptions tailored to the business vertical
9. Write all created resource names (campaign ID, ad group IDs, ad IDs) to the Supabase database for future management

**Result:** A fully operational Google Ads Search campaign is live and serving within minutes of a location being activated — no manual Google Ads UI work required.

---

### 4.2 Daily Reporting Pipeline

**Trigger:** Inngest cron job running daily at 2:00 AM UTC.

**Purpose:** Pull fresh performance metrics for every active campaign and store them in the platform database so dashboards always display up-to-date data.

**Workflow:**

1. Query the Supabase `locations` table to get all active client locations with their associated Google Ads customer IDs
2. For each customer account, execute a GAQL query via `GoogleAdsService` to retrieve:
   - `metrics.cost_micros` (converted to dollars)
   - `metrics.impressions`
   - `metrics.clicks`
   - `metrics.conversions`
   - `campaign.name`, `campaign.status`
   - Date range: previous day
3. Upsert results into the `ad_performance` table in Supabase
4. Calculate month-to-date aggregates and write to `location_monthly_summary`

**Dashboard reads:** The client-facing dashboard reads exclusively from Supabase — it never makes live Google Ads API calls at page load. This ensures fast page performance and isolates API call volume to the scheduled cron.

---

### 4.3 Offline Conversion Upload

**Trigger:** Inngest cron job running every 6 hours.

**Purpose:** Upload appointment booking and show events back to Google Ads as offline conversions so Google's bidding algorithms can optimize toward revenue-generating clicks.

**Workflow:**

1. Query the `leads` table for records where:
   - `gclid IS NOT NULL`
   - `conversion_uploaded = false`
   - `status IN ('booked', 'showed')`
2. Batch records into groups of up to 2,000 (API limit)
3. For each batch, call `ConversionUploadService` with:
   - `gclid`: the captured click ID
   - `conversion_name`: abstracted event name ("Booked Appointment" or "Showed Appointment")
   - `conversion_date_time`: ISO 8601 timestamp of the status change
   - `conversion_value`: optional revenue value if available
4. On successful upload, mark `conversion_uploaded = true` and store the Google-returned `status` in the database

**Compliance note:** No PHI is included in any payload. Patient identity, clinical notes, diagnosis codes, and insurance data are never transmitted to Google. Only the GCLID (an anonymous click identifier issued by Google) and a generic conversion event name are sent.

---

### 4.4 Budget Pacing Engine

**Trigger:** Inngest cron job running every 4 hours.

**Purpose:** Prevent clients from over-spending or significantly under-spending their monthly budget by dynamically adjusting daily budget caps.

**Workflow:**

1. For each active location, calculate:
   - **Expected spend to date** = (monthly budget / days in month) × days elapsed
   - **Actual spend to date** = sum of `ad_performance.cost` for current month
   - **Variance %** = (actual − expected) / expected × 100
2. If variance exceeds ±15%:
   - Calculate a corrected daily budget to bring the location back on pace
   - Call `CampaignBudgetService` to update the `amount_micros` field on the campaign's budget resource
   - Log the adjustment to the `budget_adjustments` table with before/after values
3. If variance is within ±15%, no API call is made (reduces unnecessary API traffic)

---

### 4.5 MCC Sub-Account Management

**Trigger:** Platform event when a new client organization is created by an internal NuStack admin.

**Purpose:** Create and link a new Google Ads customer account under the NuStack MCC so all client campaigns are centrally managed.

**Workflow:**

1. Internal admin creates a new `organizations` record in the platform
2. Platform calls `CustomerService` to create a new customer account under MCC 676-717-2347
3. The returned `customer_id` is stored on the `organizations` record
4. All subsequent Campaign Factory, reporting, and pacing calls for that org use this stored customer ID

---

## 5. API Services Called

The following Google Ads API services are used by the NuStack Marketing Engine:

| Service | Purpose | Called By |
|---|---|---|
| `CampaignService` | Create, update, and pause Search campaigns per client location | Campaign Factory, manual pause from NuStack admin UI |
| `CampaignBudgetService` | Create shared budgets and dynamically adjust daily caps | Campaign Factory, Budget Pacing Engine (every 4h) |
| `CampaignCriterionService` | Apply geo-targeting proximity radius (lat/lng + miles) to campaigns | Campaign Factory |
| `AdGroupService` | Create and manage ad groups within campaigns | Campaign Factory |
| `AdService` (ResponsiveSearchAdInfo) | Create RSA ads with AI-generated headlines and descriptions | Campaign Factory |
| `KeywordPlanIdeaService` | Generate keyword ideas during location onboarding | Campaign Factory (onboarding step) |
| `ConversionUploadService` | Upload GCLID-based offline conversions (booked/showed appointments) | Offline Conversion Upload job (every 6h) |
| `CustomerService` | Create and link Google Ads sub-accounts under MCC 676-717-2347 | MCC Sub-Account Management (org creation event) |
| `GoogleAdsService` (GAQL) | Execute reporting queries for spend, impressions, clicks, conversions | Daily Reporting Pipeline (2am cron) |

---

## 6. Tool Mockups

The following ASCII mockups represent the three primary screens of the NuStack Marketing Engine platform.

---

### 6.1 Campaign Performance Dashboard

Accessible at: `/dashboard/ads-performance`
Role access: `super_admin`, `org_admin`, `location_manager`

```
+------------------------------------------------------------------+
|  NuStack Marketing Engine                    [Org: AK Dental v]  |
+------------------------------------------------------------------+
|  Campaign Performance              March 2026      [Export CSV]  |
+------------------------------------------------------------------+
|  Location             | Status  | Daily Spend | Mo. Budget | Imp.  | Clicks | Conv. |
|-----------------------|---------|-------------|------------|-------|--------|-------|
|  AK Dental - Chicago  | ACTIVE  |   $48.20    |  $1,500    | 3,241 |   87   |   4   |
|  AK Dental - Naperville| ACTIVE |   $31.75    |  $1,000    | 2,108 |   54   |   2   |
|  MindStar - Oak Park  | PAUSED  |    $0.00    |    $800    |     0 |    0   |   0   |
|  Her Hormones - Elmhurst| ACTIVE|   $22.40    |    $750    | 1,674 |   41   |   1   |
|-----------------------|---------|-------------|------------|-------|--------|-------|
|  TOTAL                |         |  $102.35    |  $4,050    | 7,023 |  182   |   7   |
+------------------------------------------------------------------+
|  Month-to-Date Spend: $1,843.20 of $4,050.00 budget (45.5%)      |
|  Avg. CPC: $10.13   |   Avg. Conv. Rate: 3.8%   |   Pacing: ON  |
+------------------------------------------------------------------+
```

---

### 6.2 Location Onboarding — Campaign Factory Trigger

Accessible at: `/dashboard/locations/new`
Role access: `super_admin` only

```
+------------------------------------------------------------------+
|  NuStack Marketing Engine                    Add New Location     |
+------------------------------------------------------------------+
|                                                                   |
|  Location Details                                                 |
|  +---------------------------------------------------------+      |
|  | Location Name     [ AK Dental - Schaumburg            ] |      |
|  | Business Category [ Healthcare - Dental                ] |      |
|  | Street Address    [ 1450 E. Golf Rd, Schaumburg, IL    ] |      |
|  | Zip Code          [ 60173                              ] |      |
|  |                                                         |      |
|  | Google Ads Settings                                     |      |
|  | Monthly Budget    [ $1,200                             ] |      |
|  | Geo-Radius        [ 8 miles                            ] |      |
|  | Target CPA        [ $45.00                             ] |      |
|  |                                                         |      |
|  | Bidding Strategy  [ Target CPA           v             ] |      |
|  | Campaign Language [ English              v             ] |      |
|  +---------------------------------------------------------+      |
|                                                                   |
|  [ Cancel ]          [ Save Draft ]    [ ACTIVATE LOCATION  >  ] |
|                                                                   |
|  * Clicking "Activate Location" will immediately trigger the      |
|    Campaign Factory. A full Google Ads campaign structure will    |
|    be created within 2-3 minutes.                                 |
+------------------------------------------------------------------+
|  Campaign Factory Status: IDLE                                    |
|  Last run: 2026-03-03 14:22 UTC — AK Dental Naperville [SUCCESS] |
+------------------------------------------------------------------+
```

---

### 6.3 Lead Attribution Dashboard — Offline Conversion Tracking

Accessible at: `/dashboard/attribution`
Role access: `super_admin`, `org_admin`

```
+------------------------------------------------------------------+
|  NuStack Marketing Engine                 Lead Attribution        |
+------------------------------------------------------------------+
|  Showing: AK Dental — All Locations        March 2026  [Filter v]|
+------------------------------------------------------------------+
|  Lead ID | Source  | GCLID Captured | Conv. Uploaded | Status    | Revenue |
|----------|---------|----------------|----------------|-----------|---------|
|  #10041  | Google  | YES (Cq3XwR..) | YES (Mar 3)    | Showed    | $320    |
|  #10039  | Google  | YES (Pm8KaT..) | YES (Mar 2)    | Booked    | --      |
|  #10037  | Google  | YES (Xn2LpQ..) | PENDING        | Booked    | --      |
|  #10035  | Google  | YES (Rb7VsN..) | YES (Mar 1)    | Showed    | $180    |
|  #10033  | Google  | NO             | N/A            | New       | --      |
|  #10031  | Organic | NO             | N/A            | Booked    | --      |
|  #10029  | Google  | YES (Ht4UeM..) | YES (Feb 28)   | Showed    | $450    |
|  #10027  | Google  | YES (Jk9WcA..) | YES (Feb 27)   | Booked    | --      |
+------------------------------------------------------------------+
|  This Month: 6 GCLIDs captured | 5 conversions uploaded           |
|  Upload success rate: 100%     | Next upload run: 4h 12m          |
|  Note: PHI not stored. GCLID values are truncated in this view.  |
+------------------------------------------------------------------+
```

---

## 7. Data Privacy and Compliance Summary

| Area | NuStack Approach |
|---|---|
| PHI Handling | No PHI transmitted to Google Ads API. Conversion uploads use only GCLIDs and generic event names. |
| Remarketing | No remarketing lists or Customer Match audiences built or uploaded for healthcare clients. No health-condition-based audience targeting of any kind. |
| Data Scoping | All client data is scoped to organization via Supabase RLS. No cross-client data exposure. |
| API Credentials | Google Ads developer token, client ID, and client secret stored as encrypted environment variables. Never exposed to client users. |
| Conversion Data | GCLID + event name only. No names, contact details, diagnoses, or insurance data included. |
| User Access | Role-based access control via Clerk. Client users have read-only access to their own org data. |
| Audit Logging | All Campaign Factory runs, budget adjustments, and conversion upload results are logged to Supabase with timestamps. |

---

*This document was prepared for Google Ads API Standard Access review.*
*NuStack Digital Ventures — MCC Customer ID: 676-717-2347*
*Platform: https://marketing-engine-roan.vercel.app*
*Contact: Brad Palubicki, President — brad@nustack.digital*
