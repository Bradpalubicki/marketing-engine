-- Migration 009: Drop orphaned clients tables, extend organizations with Ch 8 Client Intelligence fields
-- Supersedes: 20260405000000_client_intelligence_schema.sql
-- Decision: organizations is canonical. clients table was a parallel duplicate wired to nothing.

-- Drop the orphaned tables from the clients migration
DROP TABLE IF EXISTS vertical_assignments CASCADE;
DROP TABLE IF EXISTS completeness_scores CASCADE;
DROP TABLE IF EXISTS client_intelligence CASCADE;
DROP TABLE IF EXISTS clients CASCADE;

-- Extend organizations with the Ch 8 Client Intelligence fields
-- Only add columns that don't already exist
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS business_category TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS primary_services JSONB DEFAULT '[]';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS service_area_type TEXT; -- 'local' | 'regional' | 'national'
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS years_in_business INTEGER;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS unique_selling_propositions JSONB DEFAULT '[]';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS customer_age_range TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS customer_income_level TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS primary_customer_pain_points JSONB DEFAULT '[]';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_tone TEXT; -- 'professional' | 'friendly' | 'authoritative' | 'conversational'
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS prohibited_words JSONB DEFAULT '[]';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS pricing_model TEXT; -- 'flat_rate' | 'hourly' | 'project' | 'subscription'
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS vertical_tag TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS completeness_score INTEGER DEFAULT 0;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tcpa_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS launch_blocked BOOLEAN DEFAULT TRUE;

-- Index for vertical queries (cross-client intelligence prerequisite)
CREATE INDEX IF NOT EXISTS idx_organizations_vertical_tag ON organizations(vertical_tag);
CREATE INDEX IF NOT EXISTS idx_organizations_business_category ON organizations(business_category);

-- Add vertical_tag to sem_platform_daily_snapshots for cross-vertical analytics
ALTER TABLE sem_platform_daily_snapshots
  ADD COLUMN IF NOT EXISTS vertical_tag TEXT;

CREATE INDEX IF NOT EXISTS idx_sem_snapshots_vertical_tag
  ON sem_platform_daily_snapshots(vertical_tag);
