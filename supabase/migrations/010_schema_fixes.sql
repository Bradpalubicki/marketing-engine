-- Migration 010: Schema Fixes
-- Fixes: CHECK constraints, missing indexes, soft-delete columns, updated_at triggers
-- Filed: 2026-04-05

-- ── 1. Fix campaign_factory_status CHECK constraint (CRITICAL BUG) ──────────
-- Column exists in migration 001 without a CHECK constraint
ALTER TABLE locations ADD CONSTRAINT locations_campaign_factory_status_check
  CHECK (campaign_factory_status IN ('pending','running','complete','failed'));

-- ── 2. Add 14 missing indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_location_id ON leads(location_id);
CREATE INDEX IF NOT EXISTS idx_leads_org_id ON leads(org_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_gclid ON leads(gclid) WHERE gclid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_fbclid ON leads(fbclid) WHERE fbclid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaigns_location_id ON campaigns(location_id);
CREATE INDEX IF NOT EXISTS idx_spend_records_date ON spend_records(spend_date DESC);
CREATE INDEX IF NOT EXISTS idx_spend_records_location_id ON spend_records(location_id);
CREATE INDEX IF NOT EXISTS idx_attribution_lead_id ON attribution_records(lead_id);
CREATE INDEX IF NOT EXISTS idx_ocq_status ON offline_conversion_queue(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_nurture_events_lead_id ON nurture_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_gbp_posts_status ON gbp_posts(status) WHERE status IN ('scheduled','draft');
CREATE INDEX IF NOT EXISTS idx_review_responses_status ON review_responses(status) WHERE status = 'pending';

-- ── 3. Add deleted_at to PHI tables ──────────────────────────────────────────
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE review_responses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE nurture_events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ── 4. Add missing CHECK constraints ─────────────────────────────────────────
-- ads.type: column exists in migration 001 as TEXT NOT NULL (no CHECK)
ALTER TABLE ads ADD CONSTRAINT ads_type_check
  CHECK (type IN ('RSA','responsive_display','image'));

-- campaigns.type: column exists in migration 001 as TEXT NOT NULL (no CHECK)
-- NOTE: live data contains 'lead_gen' type (5 rows) — included in constraint
ALTER TABLE campaigns ADD CONSTRAINT campaigns_type_check
  CHECK (type IN ('search','pmax','advantage_plus','display','lead_gen'));

-- ad_groups.status: column exists in migration 001 with DEFAULT 'active' (no CHECK)
ALTER TABLE ad_groups ADD CONSTRAINT ad_groups_status_check
  CHECK (status IN ('active','paused','removed'));

-- attribution_records.platform: column exists in migration 001 as TEXT (no CHECK)
ALTER TABLE attribution_records ADD CONSTRAINT attribution_records_platform_check
  CHECK (platform IN ('google','meta','microsoft','organic','direct'));

-- ── 5. Add state length CHECK, avg_rating range, rating range ────────────────
ALTER TABLE locations ADD CONSTRAINT locations_state_length
  CHECK (char_length(state) = 2);

ALTER TABLE gbp_profiles ADD CONSTRAINT gbp_profiles_avg_rating_range
  CHECK (avg_rating BETWEEN 1.00 AND 5.00);

ALTER TABLE review_responses ADD CONSTRAINT review_responses_rating_range
  CHECK (rating BETWEEN 1 AND 5);

-- ── 6. gen_random_uuid() fix ──────────────────────────────────────────────────
-- clients table was dropped in migration 009 (009_extend_organizations_client_intelligence.sql)
-- No action needed — organizations already uses gen_random_uuid() from migration 001

-- ── 7. Fix sem_platform_daily_snapshots NULL keyword UNIQUE constraint ────────
-- Original UNIQUE(location_id, snapshot_date, platform, keyword) in migration 006
-- In PostgreSQL, NULLs are not equal in UNIQUE constraints, so multiple rows with
-- keyword IS NULL + same (location_id, snapshot_date, platform) bypass the constraint.
-- Replace with two partial unique indexes.
ALTER TABLE sem_platform_daily_snapshots
  DROP CONSTRAINT IF EXISTS sem_platform_daily_snapshots_location_id_snapshot_date_platf_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sem_snapshots_unique_with_keyword
  ON sem_platform_daily_snapshots(location_id, snapshot_date, platform, keyword)
  WHERE keyword IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sem_snapshots_unique_no_keyword
  ON sem_platform_daily_snapshots(location_id, snapshot_date, platform)
  WHERE keyword IS NULL;

-- ── 8. Add updated_at triggers to campaigns, ads, leads ──────────────────────
-- update_updated_at_column() may already exist from the superseded migration
-- (20260405000000_client_intelligence_schema.sql was marked as superseded and
-- migration 009 drops those tables, but the function may still exist in DB).
-- Use CREATE OR REPLACE to be safe.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ads_updated_at ON ads;
CREATE TRIGGER update_ads_updated_at
  BEFORE UPDATE ON ads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
