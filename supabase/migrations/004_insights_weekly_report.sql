-- Migration 004: AI Insights table + weekly report schedule

-- AI Insights table (replaces gbp_posts hack)
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  location_id UUID REFERENCES locations(id),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  insights_text TEXT NOT NULL,
  metrics JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_only" ON ai_insights
  USING (auth.role() = 'service_role');

-- Add weekly_report_enabled to locations
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS weekly_report_enabled BOOLEAN DEFAULT TRUE;

-- Add ab_variant to leads for A/B test tracking
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS ab_variant TEXT CHECK (ab_variant IN ('A', 'B', 'C'));

-- Index for insights queries
CREATE INDEX IF NOT EXISTS idx_ai_insights_location_week
  ON ai_insights(location_id, week_start DESC);
