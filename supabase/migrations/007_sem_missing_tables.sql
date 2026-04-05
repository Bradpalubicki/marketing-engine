-- MP1: SEM Bible Gap Fixes — Missing Tables
-- Filed: 2026-04-04

-- sem_campaign_stage_log (Ch 21 / Ch 34)
CREATE TABLE IF NOT EXISTS sem_campaign_stage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL,
  org_id UUID REFERENCES organizations(id),
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  reason TEXT,
  operator_id TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sem_campaign_stage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view stage log"
  ON sem_campaign_stage_log FOR SELECT
  USING (
    org_id IN (
      SELECT id FROM organizations WHERE clerk_org_id = current_setting('request.jwt.claims', true)::json->>'org_id'
    )
  );

CREATE INDEX IF NOT EXISTS idx_sem_campaign_stage_log_org_created
  ON sem_campaign_stage_log(org_id, created_at);

-- sem_search_term_log (Ch 47 / Ch 50)
CREATE TABLE IF NOT EXISTS sem_search_term_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  campaign_id TEXT NOT NULL,
  search_term TEXT NOT NULL,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  cost DECIMAL(10,2) DEFAULT 0,
  ctr DECIMAL(5,4),
  action TEXT CHECK (action IN ('FLAGGED_POSITIVE', 'ADDED_KEYWORD', 'ADDED_NEGATIVE') OR action IS NULL),
  attribution_source TEXT CHECK (attribution_source IN ('callrail', 'form', 'gclid') OR attribution_source IS NULL),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sem_search_term_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view search term log"
  ON sem_search_term_log FOR SELECT
  USING (
    org_id IN (
      SELECT id FROM organizations WHERE clerk_org_id = current_setting('request.jwt.claims', true)::json->>'org_id'
    )
  );

CREATE INDEX IF NOT EXISTS idx_sem_search_term_log_org_created
  ON sem_search_term_log(org_id, created_at);

-- sem_seasonal_benchmarks (Ch 48)
-- PERMANENT retention per Ch 54 — no created_at purge
CREATE TABLE IF NOT EXISTS sem_seasonal_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical TEXT NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  metric TEXT NOT NULL CHECK (metric IN ('cpa', 'ctr', 'cvr', 'cpc')),
  benchmark_value DECIMAL(10,4) NOT NULL,
  sample_size INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sem_seasonal_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can view seasonal benchmarks"
  ON sem_seasonal_benchmarks FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE UNIQUE INDEX IF NOT EXISTS idx_sem_seasonal_benchmarks_vertical_month_metric
  ON sem_seasonal_benchmarks(vertical, month, metric);

-- sem_copy_performance_log (Ch 50)
CREATE TABLE IF NOT EXISTS sem_copy_performance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  campaign_id TEXT NOT NULL,
  copy_variant_id TEXT NOT NULL,
  headline TEXT,
  description TEXT,
  ctr DECIMAL(5,4),
  cvr DECIMAL(5,4),
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  test_result TEXT CHECK (test_result IN ('WINNER', 'LOSER', 'INCONCLUSIVE') OR test_result IS NULL),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sem_copy_performance_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view copy performance log"
  ON sem_copy_performance_log FOR SELECT
  USING (
    org_id IN (
      SELECT id FROM organizations WHERE clerk_org_id = current_setting('request.jwt.claims', true)::json->>'org_id'
    )
  );

CREATE INDEX IF NOT EXISTS idx_sem_copy_performance_log_org_created
  ON sem_copy_performance_log(org_id, created_at);

-- sem_competitive_snapshots (Ch 33)
CREATE TABLE IF NOT EXISTS sem_competitive_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  campaign_id TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  competitor_domain TEXT,
  impression_share DECIMAL(5,4),
  overlap_rate DECIMAL(5,4),
  position_above_rate DECIMAL(5,4),
  top_of_page_rate DECIMAL(5,4),
  abs_top_of_page_rate DECIMAL(5,4),
  outranking_share DECIMAL(5,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sem_competitive_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view competitive snapshots"
  ON sem_competitive_snapshots FOR SELECT
  USING (
    org_id IN (
      SELECT id FROM organizations WHERE clerk_org_id = current_setting('request.jwt.claims', true)::json->>'org_id'
    )
  );

CREATE INDEX IF NOT EXISTS idx_sem_competitive_snapshots_org_created
  ON sem_competitive_snapshots(org_id, created_at);

-- sem_platform_automated_actions (referenced in MP6, created here)
CREATE TABLE IF NOT EXISTS sem_platform_automated_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  campaign_id TEXT,
  action_type TEXT NOT NULL,
  action_level INTEGER DEFAULT 1 CHECK (action_level IN (1, 2, 3)),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'AUTO_APPLIED', 'APPROVED', 'REJECTED')),
  payload JSONB,
  operator_id TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sem_platform_automated_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view automated actions"
  ON sem_platform_automated_actions FOR SELECT
  USING (
    org_id IN (
      SELECT id FROM organizations WHERE clerk_org_id = current_setting('request.jwt.claims', true)::json->>'org_id'
    )
  );

CREATE INDEX IF NOT EXISTS idx_sem_platform_automated_actions_org_created
  ON sem_platform_automated_actions(org_id, created_at);
