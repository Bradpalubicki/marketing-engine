-- Organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON organizations
  USING (clerk_org_id = auth.jwt()->>'org_id');

-- Locations
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "location_org_isolation" ON locations
  USING (org_id IN (SELECT id FROM organizations WHERE clerk_org_id = auth.jwt()->>'org_id'));

-- Campaigns
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaign_org_isolation" ON campaigns
  USING (location_id IN (SELECT id FROM locations WHERE org_id IN (SELECT id FROM organizations WHERE clerk_org_id = auth.jwt()->>'org_id')));

-- Leads: service_role ONLY
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_only" ON leads
  USING (auth.role() = 'service_role');

-- Nurture Events
ALTER TABLE nurture_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nurture_service_only" ON nurture_events
  USING (auth.role() = 'service_role');

-- Attribution Records
ALTER TABLE attribution_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attribution_org_isolation" ON attribution_records
  USING (location_id IN (SELECT id FROM locations WHERE org_id IN (SELECT id FROM organizations WHERE clerk_org_id = auth.jwt()->>'org_id')));

-- GBP Profiles
ALTER TABLE gbp_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gbp_org_isolation" ON gbp_profiles
  USING (location_id IN (SELECT id FROM locations WHERE org_id IN (SELECT id FROM organizations WHERE clerk_org_id = auth.jwt()->>'org_id')));

-- GBP Posts
ALTER TABLE gbp_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gbp_posts_org_isolation" ON gbp_posts
  USING (gbp_profile_id IN (SELECT id FROM gbp_profiles WHERE location_id IN (SELECT id FROM locations WHERE org_id IN (SELECT id FROM organizations WHERE clerk_org_id = auth.jwt()->>'org_id'))));

-- Review Responses
ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "review_org_isolation" ON review_responses
  USING (gbp_profile_id IN (SELECT id FROM gbp_profiles WHERE location_id IN (SELECT id FROM locations WHERE org_id IN (SELECT id FROM organizations WHERE clerk_org_id = auth.jwt()->>'org_id'))));

-- Offline Conversion Queue: service_role only
ALTER TABLE offline_conversion_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ocq_service_only" ON offline_conversion_queue
  USING (auth.role() = 'service_role');

-- Budget Allocations
ALTER TABLE budget_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budget_org_isolation" ON budget_allocations
  USING (location_id IN (SELECT id FROM locations WHERE org_id IN (SELECT id FROM organizations WHERE clerk_org_id = auth.jwt()->>'org_id')));

-- Spend Records
ALTER TABLE spend_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spend_org_isolation" ON spend_records
  USING (location_id IN (SELECT id FROM locations WHERE org_id IN (SELECT id FROM organizations WHERE clerk_org_id = auth.jwt()->>'org_id')));

-- Landing Pages
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "landing_pages_org_isolation" ON landing_pages
  USING (location_id IN (SELECT id FROM locations WHERE org_id IN (SELECT id FROM organizations WHERE clerk_org_id = auth.jwt()->>'org_id')));

-- CallRail Trackers
ALTER TABLE callrail_trackers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "callrail_org_isolation" ON callrail_trackers
  USING (location_id IN (SELECT id FROM locations WHERE org_id IN (SELECT id FROM organizations WHERE clerk_org_id = auth.jwt()->>'org_id')));

-- Ad Groups
ALTER TABLE ad_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "adgroup_org_isolation" ON ad_groups
  USING (campaign_id IN (SELECT id FROM campaigns WHERE location_id IN (SELECT id FROM locations WHERE org_id IN (SELECT id FROM organizations WHERE clerk_org_id = auth.jwt()->>'org_id'))));

-- Keywords
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "keywords_org_isolation" ON keywords
  USING (ad_group_id IN (SELECT id FROM ad_groups WHERE campaign_id IN (SELECT id FROM campaigns WHERE location_id IN (SELECT id FROM locations WHERE org_id IN (SELECT id FROM organizations WHERE clerk_org_id = auth.jwt()->>'org_id')))));

-- Ads
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ads_org_isolation" ON ads
  USING (ad_group_id IN (SELECT id FROM ad_groups WHERE campaign_id IN (SELECT id FROM campaigns WHERE location_id IN (SELECT id FROM locations WHERE org_id IN (SELECT id FROM organizations WHERE clerk_org_id = auth.jwt()->>'org_id')))));
