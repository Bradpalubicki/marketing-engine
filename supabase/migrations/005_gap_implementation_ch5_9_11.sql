-- Migration 005: Gap Analysis Implementation — Ch 5, 9, 11
-- Tables: sem_budget_reallocation_log, sem_vertical_benchmarks, leads_quality_ratings
-- Columns: first_touch_source, last_touch_source on leads
-- Supporting tables for Inngest jobs: sem_weekly_reports, sem_pes_alerts
-- Schema deviation note: spec references 'clients' table — this codebase uses 'organizations'.
-- All client_id FKs map to org_id referencing organizations table.

-- Table 1: sem_budget_reallocation_log
CREATE TABLE IF NOT EXISTS sem_budget_reallocation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  platform TEXT NOT NULL CHECK (platform IN ('google', 'meta', 'tiktok', 'linkedin', 'microsoft')),
  old_amount DECIMAL(10,2) NOT NULL,
  new_amount DECIMAL(10,2) NOT NULL,
  trigger_signal TEXT NOT NULL,
  tier_level INTEGER NOT NULL CHECK (tier_level IN (1, 2, 3, 4)),
  approved_by TEXT NOT NULL CHECK (approved_by IN ('system', 'operator', 'client')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE sem_budget_reallocation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sem_budget_service_only" ON sem_budget_reallocation_log
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_sem_budget_realloc_org ON sem_budget_reallocation_log(org_id, created_at DESC);

-- Table 2: sem_vertical_benchmarks
CREATE TABLE IF NOT EXISTS sem_vertical_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical TEXT NOT NULL UNIQUE,
  avg_cpl_low DECIMAL(8,2) NOT NULL,
  avg_cpl_high DECIMAL(8,2) NOT NULL,
  avg_close_rate_low DECIMAL(5,2) NOT NULL,
  avg_close_rate_high DECIMAL(5,2) NOT NULL,
  month1_cpl_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.40,
  data_source TEXT NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE sem_vertical_benchmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sem_benchmarks_read_all" ON sem_vertical_benchmarks
  FOR SELECT USING (true);
CREATE POLICY "sem_benchmarks_write_service" ON sem_vertical_benchmarks
  FOR ALL USING (auth.role() = 'service_role');

-- Seed vertical benchmarks
INSERT INTO sem_vertical_benchmarks (vertical, avg_cpl_low, avg_cpl_high, avg_close_rate_low, avg_close_rate_high, month1_cpl_multiplier, data_source)
VALUES
  ('hvac',        40,  120, 50,  70,  1.40, 'CA benchmark 2026-04-05'),
  ('dental',      60,  150, 40,  60,  1.40, 'CA benchmark 2026-04-05'),
  ('healthcare',  80,  200, 15,  25,  1.50, 'CA benchmark 2026-04-05'),
  ('legal',      100,  400, 15,  30,  1.50, 'CA benchmark 2026-04-05'),
  ('fitness',     20,   55, 20,  35,  1.30, 'CA benchmark 2026-04-05'),
  ('real_estate', 40,  100,  3,   8,  1.40, 'CA benchmark 2026-04-05'),
  ('ecommerce',   15,   40,  1,   3,  1.30, 'CA benchmark 2026-04-05'),
  ('restaurant',   5,   20,  0,   0,  1.20, 'CA benchmark 2026-04-05')
ON CONFLICT (vertical) DO NOTHING;

-- Table 3: leads_quality_ratings
CREATE TABLE IF NOT EXISTS leads_quality_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  week_date DATE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  token TEXT NOT NULL UNIQUE,
  submitted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(org_id, week_date)
);

ALTER TABLE leads_quality_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads_quality_service_only" ON leads_quality_ratings
  USING (auth.role() = 'service_role');

-- Add first_touch_source and last_touch_source to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS first_touch_source TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_touch_source TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_first_touch ON leads(first_touch_source) WHERE first_touch_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_last_touch ON leads(last_touch_source) WHERE last_touch_source IS NOT NULL;

-- Supporting table: sem_weekly_reports (used by Inngest Job 2)
CREATE TABLE IF NOT EXISTS sem_weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  location_id UUID REFERENCES locations(id),
  week_date DATE NOT NULL,
  report_html TEXT NOT NULL,
  quality_rating_token TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(location_id, week_date)
);

ALTER TABLE sem_weekly_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sem_weekly_reports_service_only" ON sem_weekly_reports
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_sem_weekly_reports_location ON sem_weekly_reports(location_id, week_date DESC);

-- Supporting table: sem_pes_alerts (used by Inngest Job 3)
CREATE TABLE IF NOT EXISTS sem_pes_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  location_id UUID REFERENCES locations(id),
  pes_score DECIMAL(5,2) NOT NULL,
  lowest_component TEXT NOT NULL,
  alert_sent_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  resolved_at TIMESTAMPTZ,
  followup_sent_at TIMESTAMPTZ
);

ALTER TABLE sem_pes_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sem_pes_alerts_service_only" ON sem_pes_alerts
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_sem_pes_alerts_org ON sem_pes_alerts(org_id, alert_sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_sem_pes_alerts_unresolved ON sem_pes_alerts(resolved_at) WHERE resolved_at IS NULL;

-- Add expectation_doc_sent_at to organizations (used by Inngest Job 1)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS expectation_doc_sent_at TIMESTAMPTZ;

-- Add client intake fields to organizations (used by intake form / onboarding)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS vertical TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS target_cpl DECIMAL(8,2);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS avg_transaction_value DECIMAL(10,2);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS primary_offer TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS proof_point TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS competitor_names TEXT[];
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_regulated_vertical BOOLEAN DEFAULT FALSE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS compliance_profile_required BOOLEAN DEFAULT FALSE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS onboarding_completeness_score INTEGER DEFAULT 0;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS campaign_start_date DATE;
