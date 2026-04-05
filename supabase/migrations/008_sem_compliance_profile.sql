-- MP2: SEM Compliance Profile + Client Completeness Fixes
-- Filed: 2026-04-04

-- sem_client_compliance_profiles
CREATE TABLE IF NOT EXISTS sem_client_compliance_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID UNIQUE REFERENCES organizations(id),
  vertical TEXT NOT NULL DEFAULT 'healthcare',
  completeness_score INTEGER DEFAULT 0 CHECK (completeness_score BETWEEN 0 AND 100),
  launch_blocked BOOLEAN DEFAULT TRUE,
  tcpa_confirmed BOOLEAN DEFAULT FALSE,
  hipaa_pixel_guard_enabled BOOLEAN DEFAULT FALSE,
  pmax_daily_budget DECIMAL(8,2) DEFAULT 0,
  vertical_compliance_passed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sem_client_compliance_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view compliance profile"
  ON sem_client_compliance_profiles FOR SELECT
  USING (
    org_id IN (
      SELECT id FROM organizations WHERE clerk_org_id = current_setting('request.jwt.claims', true)::json->>'org_id'
    )
  );

CREATE POLICY "service role can manage compliance profiles"
  ON sem_client_compliance_profiles FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_sem_client_compliance_profiles_org
  ON sem_client_compliance_profiles(org_id);
