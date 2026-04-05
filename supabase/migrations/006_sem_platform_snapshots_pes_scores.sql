-- Migration 006: sem_platform_daily_snapshots + sem_portfolio_efficiency_scores
-- Fixes: Monday weekly-report-email Inngest job blocked on missing sem_platform_daily_snapshots table
-- Schema deviation note: spec references 'client_id' FK → this codebase uses 'org_id' referencing organizations.
-- sem_platform_daily_snapshots references locations (location_id) as the granular entity.
-- sem_portfolio_efficiency_scores references organizations (org_id) as the rollup entity.

-- Table 1: sem_platform_daily_snapshots
-- Stores per-platform, per-day keyword/ad performance snapshots used by Monday report Inngest job.
CREATE TABLE IF NOT EXISTS sem_platform_daily_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id),

  snapshot_date DATE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('google', 'meta', 'tiktok', 'linkedin', 'microsoft')),

  -- Google Quality Score fields
  keyword TEXT,
  quality_score INTEGER CHECK (quality_score BETWEEN 1 AND 10),
  expected_ctr TEXT CHECK (expected_ctr IN ('above_average', 'average', 'below_average')),
  ad_relevance TEXT CHECK (ad_relevance IN ('above_average', 'average', 'below_average')),
  landing_page_experience TEXT CHECK (landing_page_experience IN ('above_average', 'average', 'below_average')),

  -- Universal metrics
  impressions INTEGER,
  clicks INTEGER,
  spend DECIMAL(10,2),
  conversions DECIMAL(8,2),
  impression_share DECIMAL(5,2),
  is_lost_budget DECIMAL(5,2),
  is_lost_rank DECIMAL(5,2),

  -- Meta-specific
  frequency DECIMAL(4,2),
  cpm DECIMAL(8,2),

  -- TikTok-specific
  hook_rate DECIMAL(5,2),
  video_completion_rate DECIMAL(5,2),

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(location_id, snapshot_date, platform, keyword)
);

ALTER TABLE sem_platform_daily_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sem_platform_snapshots_service_only" ON sem_platform_daily_snapshots
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_sem_snapshots_location_date
  ON sem_platform_daily_snapshots(location_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_sem_snapshots_qs
  ON sem_platform_daily_snapshots(location_id, quality_score, snapshot_date)
  WHERE quality_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sem_snapshots_platform_date
  ON sem_platform_daily_snapshots(platform, snapshot_date DESC);

-- Table 2: sem_portfolio_efficiency_scores
-- Stores weekly PES component scores per org, used for trend reporting and PES alert thresholds.
CREATE TABLE IF NOT EXISTS sem_portfolio_efficiency_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  week_date DATE NOT NULL,
  pes_score DECIMAL(5,2) NOT NULL,
  roas_score DECIMAL(5,2) NOT NULL,
  pacing_score DECIMAL(5,2) NOT NULL,
  qs_score DECIMAL(5,2) NOT NULL,
  creative_health_score DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(org_id, week_date)
);

ALTER TABLE sem_portfolio_efficiency_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sem_pes_scores_service_only" ON sem_portfolio_efficiency_scores
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_sem_pes_scores_org_week
  ON sem_portfolio_efficiency_scores(org_id, week_date DESC);
