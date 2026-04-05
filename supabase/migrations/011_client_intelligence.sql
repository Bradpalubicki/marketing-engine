-- Migration 011: Standalone client_intelligence table
-- Decision: organizations is canonical parent. client_intelligence is a 1:1 child table.
-- This is separate from the fields added to organizations in migration 009.
-- The organizations.completeness_score column added in 009 will be kept in sync by app layer.

CREATE TABLE IF NOT EXISTS client_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Stage 1 (required, not scored)
  business_name TEXT NOT NULL DEFAULT '',
  primary_service TEXT NOT NULL DEFAULT '',
  service_location_city TEXT NOT NULL DEFAULT '',

  -- Stage 2: Economics
  target_cpl INTEGER,
  avg_transaction_value INTEGER,
  monthly_budget INTEGER,
  close_rate_pct INTEGER CHECK (close_rate_pct BETWEEN 0 AND 100),

  -- Stage 3: Offer
  primary_offer TEXT,
  offer_urgency TEXT CHECK (offer_urgency IN ('evergreen','seasonal','limited')),
  proof_point TEXT,
  secondary_services TEXT[],
  price_position TEXT CHECK (price_position IN ('budget','mid-market','premium')),

  -- Stage 4: Market
  competitor_names TEXT[],
  competitor_urls TEXT[],
  geographic_radius_miles INTEGER,
  service_area_type TEXT CHECK (service_area_type IN ('single-location','multi-location','regional','national')),
  num_locations INTEGER DEFAULT 1,

  -- Stage 5: Assets
  website_url TEXT,
  existing_lp_url TEXT,
  phone_number TEXT,
  gbp_listing_url TEXT,

  -- System IDs
  ghl_contact_id TEXT,
  google_ads_customer_id TEXT,
  meta_ad_account_id TEXT,

  -- Compliance
  vertical_tag TEXT NOT NULL DEFAULT 'general',
  is_licensed BOOLEAN,
  license_number TEXT,
  hipaa_scope BOOLEAN GENERATED ALWAYS AS (vertical_tag LIKE 'healthcare_%') STORED,
  meta_special_ad_category TEXT CHECK (meta_special_ad_category IN ('none','housing','employment','credit','health')) DEFAULT 'none',

  -- HVAC extension
  is_24_7 BOOLEAN,
  offers_financing BOOLEAN,
  tune_up_price INTEGER,
  primary_equipment_brands TEXT[],
  climate_zone TEXT CHECK (climate_zone IN ('desert','humid','mixed','cold')),
  is_emergency_service BOOLEAN,

  -- Dental extension
  accepts_insurance BOOLEAN,
  insurance_networks TEXT[],
  primary_procedure_focus TEXT CHECK (primary_procedure_focus IN ('general','cosmetic','implants','orthodontics','emergency')),
  new_patient_offer TEXT,
  has_sedation BOOLEAN,

  -- Legal extension
  practice_areas TEXT[],
  bar_state TEXT,
  contingency_fee BOOLEAN,
  consultation_type TEXT CHECK (consultation_type IN ('free','paid','phone-only')),

  -- Completeness score (computed on write by application layer)
  completeness_score INTEGER DEFAULT 0 CHECK (completeness_score BETWEEN 0 AND 100),
  completeness_breakdown JSONB,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_intelligence_org ON client_intelligence(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_intelligence_vertical ON client_intelligence(vertical_tag);
CREATE INDEX IF NOT EXISTS idx_client_intelligence_score ON client_intelligence(completeness_score);

-- updated_at trigger
DROP TRIGGER IF EXISTS client_intelligence_updated_at ON client_intelligence;
CREATE TRIGGER client_intelligence_updated_at
  BEFORE UPDATE ON client_intelligence FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE client_intelligence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_client_intelligence" ON client_intelligence
  FOR ALL TO service_role USING (true) WITH CHECK (true);
