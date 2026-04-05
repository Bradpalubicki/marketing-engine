export type OrganizationStatus = 'active' | 'inactive'
export type LocationStatus = 'pending' | 'active' | 'paused' | 'inactive'
export type CampaignStatus = 'active' | 'paused' | 'removed'
export type LeadStatus = 'new' | 'contacted' | 'booked' | 'showed' | 'no_showed' | 'disqualified'
export type LeadSource = 'form' | 'call' | 'chat'
export type Platform = 'google' | 'meta'
export type NurtureEventType = 'sms' | 'email' | 'retargeting_audience' | 'internal_alert'
export type NurtureEventStatus = 'pending' | 'sent' | 'failed' | 'skipped'
export type GBPPostType = 'STANDARD' | 'EVENT' | 'OFFER'
export type GBPPostStatus = 'draft' | 'scheduled' | 'published' | 'failed'
export type ReviewResponseStatus = 'pending' | 'approved' | 'published' | 'skipped'
export type OCQStatus = 'pending' | 'uploaded' | 'failed'
export type MatchType = 'EXACT' | 'PHRASE' | 'BROAD'
export type ABVariant = 'A' | 'B' | 'C'

export interface Organization {
  id: string
  clerk_org_id: string
  name: string
  slug: string
  google_ads_customer_id: string | null
  meta_ad_account_id: string | null
  monthly_ad_budget: number | null
  // Ch 8 Client Intelligence fields (added via migration 009)
  completeness_score: number
  tcpa_confirmed: boolean
  launch_blocked: boolean
  vertical_tag: string | null
  business_category: string | null
  created_at: string
}

export interface Location {
  id: string
  org_id: string
  name: string
  slug: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
  timezone: string
  lat: number | null
  lng: number | null
  gbp_location_id: string | null
  callrail_tracker_id: string | null
  callrail_phone: string | null
  landing_page_url: string | null
  monthly_ad_budget: number | null
  status: LocationStatus
  campaign_factory_status: string
  weekly_report_enabled: boolean | null
  campaign_factory_notes: string | null
  created_at: string
}

export interface AIInsightRecord {
  id: string
  org_id: string | null
  location_id: string | null
  week_start: string
  week_end: string
  insights_text: string
  metrics: Record<string, unknown> | null
  created_at: string
}

export interface Campaign {
  id: string
  location_id: string
  platform: Platform
  platform_campaign_id: string | null
  name: string
  type: string
  status: CampaignStatus
  daily_budget: number | null
  monthly_budget: number | null
  bidding_strategy: string | null
  target_cpa: number | null
  created_at: string
  updated_at: string
}

export interface AdGroup {
  id: string
  campaign_id: string
  platform_ad_group_id: string | null
  name: string
  status: string
  created_at: string
}

export interface Keyword {
  id: string
  ad_group_id: string
  platform_keyword_id: string | null
  keyword_text: string
  match_type: MatchType | null
  bid_micros: number | null
  status: string
  created_at: string
}

export interface Ad {
  id: string
  ad_group_id: string
  platform_ad_id: string | null
  type: string
  headlines: string[] | null
  descriptions: string[] | null
  final_url: string | null
  status: string
  performance_label: string | null
  created_at: string
  updated_at: string
}

export interface LandingPage {
  id: string
  location_id: string
  slug: string
  title: string
  headline: string
  subheadline: string | null
  body_copy: string | null
  cta_text: string
  ab_variant: ABVariant | null
  posthog_flag: string | null
  is_active: boolean
  views: number
  conversions: number
  created_at: string
}

export interface Lead {
  id: string
  location_id: string
  org_id: string
  source: LeadSource
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  gclid: string | null
  fbclid: string | null
  msclkid: string | null
  fbp: string | null
  ab_variant: ABVariant | null
  landing_page_id: string | null
  callrail_call_id: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  status: LeadStatus
  nurture_sequence_step: number
  nurture_paused: boolean
  appointment_id: string | null
  appointment_revenue: number | null
  google_conversion_uploaded: boolean
  google_conversion_uploaded_at: string | null
  meta_conversion_uploaded: boolean
  meta_conversion_uploaded_at: string | null
  created_at: string
  updated_at: string
}

export interface NurtureEvent {
  id: string
  lead_id: string
  step: number
  type: NurtureEventType
  status: NurtureEventStatus
  content: string | null
  sent_at: string | null
  inngest_event_id: string | null
  created_at: string
}

export interface AttributionRecord {
  id: string
  lead_id: string
  location_id: string
  clicked_at: string | null
  platform: string | null
  campaign_id: string | null
  lead_created_at: string | null
  contacted_at: string | null
  booked_at: string | null
  showed_at: string | null
  revenue: number | null
  created_at: string
}

export interface BudgetAllocation {
  id: string
  location_id: string
  platform: string
  month: string
  monthly_budget: number | null
  current_daily_budget: number | null
  created_at: string
}

export interface SpendRecord {
  id: string
  location_id: string
  platform: string
  campaign_id: string | null
  spend_date: string
  impressions: number | null
  clicks: number | null
  spend: number | null
  conversions: number | null
  created_at: string
}

export interface GBPProfile {
  id: string
  location_id: string
  gbp_location_id: string | null
  account_id: string | null
  is_verified: boolean
  review_count: number
  avg_rating: number | null
  last_synced_at: string | null
  created_at: string
}

export interface GBPPost {
  id: string
  gbp_profile_id: string
  gbp_post_id: string | null
  type: GBPPostType | null
  summary: string | null
  call_to_action_type: string | null
  scheduled_at: string | null
  published_at: string | null
  status: GBPPostStatus
  created_at: string
}

export interface ReviewResponse {
  id: string
  gbp_profile_id: string
  review_id: string
  reviewer_name: string | null
  rating: number | null
  review_text: string | null
  ai_draft_response: string | null
  final_response: string | null
  status: ReviewResponseStatus
  created_at: string
}

export interface CallRailTracker {
  id: string
  location_id: string
  callrail_tracker_id: string | null
  tracking_number: string | null
  destination_number: string | null
  name: string | null
  created_at: string
}

export interface OfflineConversionQueue {
  id: string
  lead_id: string
  platform: Platform
  conversion_name: string | null
  conversion_time: string | null
  conversion_value: number | null
  gclid: string | null
  fbc: string | null
  status: OCQStatus
  attempt_count: number
  uploaded_at: string | null
  error_message: string | null
  created_at: string
}

export interface LeadFormData {
  first_name: string
  phone: string
  service_interest: 'mens_health' | 'hormone_optimization' | 'primary_care' | 'wellness'
  zip: string
}

export interface DashboardMetrics {
  totalActiveLocations: number
  totalLeadsThisMonth: number
  leadsByStatus: Record<LeadStatus, number>
  recentLeads: Lead[]
}
