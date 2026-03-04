-- Organizations (clinic chains)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_org_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  google_ads_customer_id TEXT,
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
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  phone TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  lat DECIMAL(9,6),
  lng DECIMAL(9,6),
  gbp_location_id TEXT,
  callrail_tracker_id TEXT,
  callrail_phone TEXT,
  landing_page_url TEXT,
  monthly_ad_budget DECIMAL(10,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','active','paused','inactive')),
  campaign_factory_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id),
  platform TEXT NOT NULL CHECK (platform IN ('google','meta')),
  platform_campaign_id TEXT UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','removed')),
  daily_budget DECIMAL(8,2),
  monthly_budget DECIMAL(10,2),
  bidding_strategy TEXT,
  target_cpa DECIMAL(8,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ad Groups
CREATE TABLE ad_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  platform_ad_group_id TEXT,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Keywords
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
  type TEXT NOT NULL,
  headlines JSONB,
  descriptions JSONB,
  final_url TEXT,
  status TEXT DEFAULT 'ENABLED',
  performance_label TEXT,
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
  posthog_flag TEXT,
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
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  gclid TEXT,
  fbclid TEXT,
  fbp TEXT,
  landing_page_id UUID REFERENCES landing_pages(id),
  callrail_call_id TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new','contacted','booked','showed','no_showed','disqualified')),
  nurture_sequence_step INTEGER DEFAULT 0,
  nurture_paused BOOLEAN DEFAULT FALSE,
  appointment_id UUID,
  appointment_revenue DECIMAL(8,2),
  google_conversion_uploaded BOOLEAN DEFAULT FALSE,
  google_conversion_uploaded_at TIMESTAMPTZ,
  meta_conversion_uploaded BOOLEAN DEFAULT FALSE,
  meta_conversion_uploaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nurture Events
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

-- Attribution Records
CREATE TABLE attribution_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  location_id UUID REFERENCES locations(id),
  clicked_at TIMESTAMPTZ,
  platform TEXT,
  campaign_id UUID REFERENCES campaigns(id),
  lead_created_at TIMESTAMPTZ,
  contacted_at TIMESTAMPTZ,
  booked_at TIMESTAMPTZ,
  showed_at TIMESTAMPTZ,
  revenue DECIMAL(8,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget Allocations
CREATE TABLE budget_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id),
  platform TEXT NOT NULL,
  month DATE NOT NULL,
  monthly_budget DECIMAL(10,2),
  current_daily_budget DECIMAL(8,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_id, platform, month)
);

-- Spend Records
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

-- Review Responses
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

-- Offline Conversion Queue
CREATE TABLE offline_conversion_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  platform TEXT CHECK (platform IN ('google','meta')),
  conversion_name TEXT,
  conversion_time TIMESTAMPTZ,
  conversion_value DECIMAL(8,2),
  gclid TEXT,
  fbc TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','uploaded','failed')),
  attempt_count INTEGER DEFAULT 0,
  uploaded_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
