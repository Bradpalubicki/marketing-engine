-- SUPERSEDED by 009_extend_organizations_client_intelligence.sql
-- Decision: organizations is canonical. This migration's tables (clients, client_intelligence,
-- completeness_scores, vertical_assignments) are dropped in migration 009.
-- Do NOT apply this migration to any environment. Kept for history only.
--
-- Client Intelligence Schema for Marketing Engine
-- Migration: 20260405000000_client_intelligence_schema
-- Created: 2026-04-05

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── CLIENTS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'onboarding' CHECK (status IN ('onboarding', 'active', 'paused', 'churned'))
);

-- ── CLIENT INTELLIGENCE ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_intelligence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  onboarding_complete_at TIMESTAMPTZ,

  -- Core business info
  business_name TEXT,
  industry_vertical TEXT,
  primary_location TEXT,
  service_area_radius_miles INTEGER,
  top_3_services TEXT[],

  -- Financial
  avg_ticket_value NUMERIC(10,2),
  monthly_ad_budget NUMERIC(10,2),
  target_cpa NUMERIC(10,2),

  -- Competitive
  primary_competitor_urls TEXT[],

  -- Digital presence
  gbp_url TEXT,
  website_url TEXT,
  phone_number TEXT,

  -- Landing page config
  domain_can_cname BOOLEAN DEFAULT FALSE,
  cname_subdomain TEXT,
  calendly_url TEXT,

  -- Brand assets
  headshot_url TEXT,
  bio_text TEXT
);

-- ── COMPLETENESS SCORES ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS completeness_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Total score (0-100)
  total_score INTEGER NOT NULL DEFAULT 0,

  -- Individual field scores
  score_business_name INTEGER NOT NULL DEFAULT 0,           -- max 5
  score_industry_vertical INTEGER NOT NULL DEFAULT 0,       -- max 10
  score_primary_location INTEGER NOT NULL DEFAULT 0,        -- max 10
  score_top_3_services INTEGER NOT NULL DEFAULT 0,          -- max 15
  score_avg_ticket_value INTEGER NOT NULL DEFAULT 0,        -- max 10
  score_monthly_ad_budget INTEGER NOT NULL DEFAULT 0,       -- max 15
  score_target_cpa INTEGER NOT NULL DEFAULT 0,              -- max 10
  score_competitor_urls INTEGER NOT NULL DEFAULT 0,         -- max 10
  score_gbp_url INTEGER NOT NULL DEFAULT 0,                 -- max 5
  score_website_url INTEGER NOT NULL DEFAULT 0,             -- max 5
  score_phone_number INTEGER NOT NULL DEFAULT 0,            -- max 5

  -- Derived
  can_launch_campaigns BOOLEAN GENERATED ALWAYS AS (total_score >= 60) STORED
);

-- ── VERTICAL ASSIGNMENTS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vertical_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  vertical_slug TEXT NOT NULL,
  bible_version TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by TEXT NOT NULL DEFAULT 'system',
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(client_id, vertical_slug)
);

-- ── TRIGGERS: updated_at ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_client_intelligence_updated_at
  BEFORE UPDATE ON client_intelligence
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── FUNCTION: recalculate completeness score ─────────────────────────────────
CREATE OR REPLACE FUNCTION recalculate_completeness_score(p_client_id UUID)
RETURNS VOID AS $$
DECLARE
  v_intel client_intelligence%ROWTYPE;
  v_total INTEGER := 0;
  v_business_name INTEGER := 0;
  v_industry_vertical INTEGER := 0;
  v_primary_location INTEGER := 0;
  v_top_3_services INTEGER := 0;
  v_avg_ticket_value INTEGER := 0;
  v_monthly_ad_budget INTEGER := 0;
  v_target_cpa INTEGER := 0;
  v_competitor_urls INTEGER := 0;
  v_gbp_url INTEGER := 0;
  v_website_url INTEGER := 0;
  v_phone_number INTEGER := 0;
BEGIN
  SELECT * INTO v_intel FROM client_intelligence WHERE client_id = p_client_id;

  IF v_intel.business_name IS NOT NULL AND trim(v_intel.business_name) != '' THEN
    v_business_name := 5; v_total := v_total + 5;
  END IF;
  IF v_intel.industry_vertical IS NOT NULL AND trim(v_intel.industry_vertical) != '' THEN
    v_industry_vertical := 10; v_total := v_total + 10;
  END IF;
  IF v_intel.primary_location IS NOT NULL AND trim(v_intel.primary_location) != '' THEN
    v_primary_location := 10; v_total := v_total + 10;
  END IF;
  IF v_intel.top_3_services IS NOT NULL AND array_length(v_intel.top_3_services, 1) > 0 THEN
    v_top_3_services := 15; v_total := v_total + 15;
  END IF;
  IF v_intel.avg_ticket_value IS NOT NULL AND v_intel.avg_ticket_value > 0 THEN
    v_avg_ticket_value := 10; v_total := v_total + 10;
  END IF;
  IF v_intel.monthly_ad_budget IS NOT NULL AND v_intel.monthly_ad_budget > 0 THEN
    v_monthly_ad_budget := 15; v_total := v_total + 15;
  END IF;
  IF v_intel.target_cpa IS NOT NULL AND v_intel.target_cpa > 0 THEN
    v_target_cpa := 10; v_total := v_total + 10;
  END IF;
  IF v_intel.primary_competitor_urls IS NOT NULL AND array_length(v_intel.primary_competitor_urls, 1) >= 1 THEN
    v_competitor_urls := 10; v_total := v_total + 10;
  END IF;
  IF v_intel.gbp_url IS NOT NULL AND trim(v_intel.gbp_url) != '' THEN
    v_gbp_url := 5; v_total := v_total + 5;
  END IF;
  IF v_intel.website_url IS NOT NULL AND trim(v_intel.website_url) != '' THEN
    v_website_url := 5; v_total := v_total + 5;
  END IF;
  IF v_intel.phone_number IS NOT NULL AND trim(v_intel.phone_number) != '' THEN
    v_phone_number := 5; v_total := v_total + 5;
  END IF;

  INSERT INTO completeness_scores (
    client_id, total_score,
    score_business_name, score_industry_vertical, score_primary_location,
    score_top_3_services, score_avg_ticket_value, score_monthly_ad_budget,
    score_target_cpa, score_competitor_urls, score_gbp_url,
    score_website_url, score_phone_number
  ) VALUES (
    p_client_id, v_total,
    v_business_name, v_industry_vertical, v_primary_location,
    v_top_3_services, v_avg_ticket_value, v_monthly_ad_budget,
    v_target_cpa, v_competitor_urls, v_gbp_url,
    v_website_url, v_phone_number
  )
  ON CONFLICT (client_id) DO UPDATE SET
    calculated_at = NOW(),
    total_score = EXCLUDED.total_score,
    score_business_name = EXCLUDED.score_business_name,
    score_industry_vertical = EXCLUDED.score_industry_vertical,
    score_primary_location = EXCLUDED.score_primary_location,
    score_top_3_services = EXCLUDED.score_top_3_services,
    score_avg_ticket_value = EXCLUDED.score_avg_ticket_value,
    score_monthly_ad_budget = EXCLUDED.score_monthly_ad_budget,
    score_target_cpa = EXCLUDED.score_target_cpa,
    score_competitor_urls = EXCLUDED.score_competitor_urls,
    score_gbp_url = EXCLUDED.score_gbp_url,
    score_website_url = EXCLUDED.score_website_url,
    score_phone_number = EXCLUDED.score_phone_number;
END;
$$ LANGUAGE plpgsql;

-- ── TRIGGER: auto-recalculate score on intel change ──────────────────────────
CREATE OR REPLACE FUNCTION trigger_recalculate_completeness()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM recalculate_completeness_score(COALESCE(NEW.client_id, OLD.client_id));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER recalculate_completeness_on_intel_change
  AFTER INSERT OR UPDATE ON client_intelligence
  FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_completeness();

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE completeness_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE vertical_assignments ENABLE ROW LEVEL SECURITY;

-- Service role bypass (for server-side API calls)
CREATE POLICY "service_role_clients" ON clients FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_client_intelligence" ON client_intelligence FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_completeness_scores" ON completeness_scores FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_vertical_assignments" ON vertical_assignments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── UNIQUE constraint for completeness_scores ─────────────────────────────────
-- Need unique constraint for upsert to work
ALTER TABLE completeness_scores ADD CONSTRAINT completeness_scores_client_id_unique UNIQUE (client_id);
