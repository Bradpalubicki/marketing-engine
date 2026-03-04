-- Migration 003: v2 Attribution — msclkid, Microsoft Ads platform, campaign factory notes

-- Add msclkid to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS msclkid TEXT;
CREATE INDEX IF NOT EXISTS idx_leads_msclkid ON leads(msclkid) WHERE msclkid IS NOT NULL;

-- Extend spend_records platform check to include microsoft
ALTER TABLE spend_records DROP CONSTRAINT IF EXISTS spend_records_platform_check;
ALTER TABLE spend_records ADD CONSTRAINT spend_records_platform_check
  CHECK (platform IN ('google', 'meta', 'microsoft'));

-- Add campaign_factory_notes to locations for failure logging
ALTER TABLE locations ADD COLUMN IF NOT EXISTS campaign_factory_notes TEXT;
