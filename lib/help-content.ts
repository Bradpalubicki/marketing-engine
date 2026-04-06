export const HELP_CONTENT: Record<string, {
  title: string
  what: string
  howTo: string[]
  tips?: string[]
}> = {
  '/dashboard': {
    title: 'Dashboard Overview',
    what: 'Your command center. See all active clients, campaign performance at a glance, and alerts that need attention.',
    howTo: [
      'The top cards show total leads, average CPL, and active campaigns across all clients.',
      'Click any client card to go directly to that client\'s campaigns.',
      'Red alerts mean something needs your attention — click to see what.',
      'Green = on target. Yellow = watch it. Red = action required.',
    ],
    tips: [
      'Check this page every Monday morning before client calls.',
      'If CPL is rising week-over-week, check the search terms report.',
    ],
  },
  '/intake': {
    title: 'Client Intake',
    what: 'Add a new client and build their campaign profile. The completeness score tells you when you have enough information to launch campaigns.',
    howTo: [
      'Step 1: Enter the business name, primary service, and city. The system generates an initial keyword list immediately.',
      'Step 2: Add economics — target CPL and average client value. This unlocks smart bidding.',
      'Step 3: Add offer, proof point, and competitors. This improves ad copy quality.',
      'When the score hits 60% or above, the Launch Campaign button unlocks.',
      'You can save and return later — the form auto-saves on every field.',
    ],
    tips: [
      'Target CPL is the most important field. Without it, the system cannot set smart bidding.',
      'The proof point field directly improves ad copy — be specific. "500+ 5-star reviews" beats "great service".',
      'Adding competitor names improves negative keyword strategy.',
    ],
  },
  '/dashboard/campaigns': {
    title: 'Campaigns',
    what: 'View and manage all Google Ads campaigns across all clients. See status, spend, leads, and CPL in one place.',
    howTo: [
      'Filter by client using the dropdown at the top.',
      'Campaign status: green = active, yellow = paused, red = error.',
      'Click a campaign to see ad groups and individual ads.',
      'The factory button generates new campaigns from the client intake data.',
    ],
    tips: [
      'Never pause a campaign in the first 30 days — the algorithm is still learning.',
      'If CPL is above target, check QS first before touching bids.',
    ],
  },
  '/dashboard/leads': {
    title: 'Leads',
    what: 'Every form fill and phone call captured from your campaigns. See the full lead record including which keyword and campaign drove it.',
    howTo: [
      'Filter by client, date range, or lead status.',
      'Click a lead to see the full record — source, keyword, campaign, UTM parameters.',
      'Rate lead quality using the thumbs up/down — this feeds back into smart bidding.',
      'Leads marked as appointments trigger an offline conversion import to Google Ads.',
    ],
    tips: [
      'Lead quality ratings are more valuable than raw volume — rate every lead.',
      'If you see leads with no keyword data, GCLID capture may be broken on the landing page.',
    ],
  },
  '/dashboard/locations': {
    title: 'Locations',
    what: 'Manage client business locations. Each location can have its own campaigns, landing pages, and phone numbers.',
    howTo: [
      'Add a location by clicking New Location.',
      'Each location needs: address, phone number, service radius, and a landing page URL.',
      'The campaign factory uses location data to build geo-targeted campaigns.',
      'Multiple locations = multiple campaign sets — one per location.',
    ],
  },
  '/dashboard/analytics': {
    title: 'Analytics',
    what: 'Performance trends over time. See CPL, lead volume, spend, and impression share by campaign and date range.',
    howTo: [
      'Select a client and date range at the top.',
      'The CPL trend chart shows week-over-week performance.',
      'Impression share below 50% means you are losing auctions — usually a bid or budget issue.',
      'Compare current period vs prior period using the toggle.',
    ],
    tips: [
      'Look for CPL spikes — they usually correspond to a competitor entering your keyword set.',
      'If impression share drops suddenly, check if a competitor increased budget.',
    ],
  },
  '/dashboard/reviews': {
    title: 'Reviews',
    what: 'Monitor Google Business Profile reviews for all clients. See new reviews, ratings trends, and response status.',
    howTo: [
      'New reviews appear automatically — the system polls GBP daily.',
      'Click a review to see the full text and respond directly.',
      'Filter by rating to find negative reviews that need attention.',
      'Review velocity (reviews per month) affects GBP ranking.',
    ],
  },
  '/dashboard/posts': {
    title: 'GBP Posts',
    what: 'Manage Google Business Profile posts. The system generates 4 AI draft posts per week — you pick one to publish.',
    howTo: [
      'Each week, 4 post variants are generated automatically.',
      'Review the drafts and click Publish on the one you want to go live.',
      'Posts publish directly to the client\'s Google Business Profile.',
      'Consistent posting improves GBP ranking and local visibility.',
    ],
    tips: [
      'Pick posts that match current offers or seasonal events.',
      'Posts with photos perform better — add an image when possible.',
    ],
  },
  '/dashboard/reports': {
    title: 'Reports',
    what: 'Weekly performance reports for each client. Download as CSV or view in the dashboard.',
    howTo: [
      'Select a client and week.',
      'The report shows: impressions, clicks, CTR, leads, CPL, spend vs prior week.',
      'Download as CSV for client-facing reporting.',
      'Automated weekly reports are emailed to you every Monday at 8AM.',
    ],
  },
  '/dashboard/settings': {
    title: 'Settings',
    what: 'Manage your organization, team members, integrations, and billing.',
    howTo: [
      'Organization: update your agency name and contact info.',
      'Integrations: connect Google Ads, Meta, GBP, and GoHighLevel.',
      'Team: invite team members and set their roles.',
      'Billing: manage your NuStack subscription.',
    ],
  },
  '/dashboard/settings/integrations': {
    title: 'Integrations',
    what: 'Connect Google Ads, Google Business Profile, Meta Ads, GoHighLevel, and CallRail to the Marketing Engine.',
    howTo: [
      'Click Connect next to any integration to begin the OAuth flow.',
      'Google Ads: requires MCC access and a developer token.',
      'GBP: requires Google account with Manager access on each client\'s profile.',
      'GoHighLevel: paste your API key from the GHL settings page.',
      'CallRail: paste your API key from CallRail → Account Settings → API.',
    ],
    tips: [
      'All integrations use OAuth — your credentials are never stored in plain text.',
      'If an integration shows "expired", click Reconnect — this usually happens after 90 days.',
    ],
  },
  '/dashboard/tracking': {
    title: 'Conversion Health',
    what: 'Monitor GCLID capture, offline conversion uploads, and attribution health across all campaigns.',
    howTo: [
      'Green = conversion tracking is working correctly.',
      'Yellow = conversions are being captured but not uploaded to Google Ads yet.',
      'Red = GCLID capture is broken — check landing page UTM parameters.',
      'The upload log shows each batch sent to Google Ads.',
    ],
    tips: [
      'Run a test conversion by submitting the lead form and checking if it appears here within 5 minutes.',
    ],
  },
  '/dashboard/onboarding': {
    title: 'Onboarding',
    what: 'Step-by-step setup guide for new clients. Complete all steps before launching campaigns.',
    howTo: [
      'Work through each step in order — later steps unlock when earlier ones are complete.',
      'Connect integrations first — Google Ads and GBP connections are required before campaigns can launch.',
      'The completeness score must reach 60% before the first campaign launches.',
    ],
  },
}
