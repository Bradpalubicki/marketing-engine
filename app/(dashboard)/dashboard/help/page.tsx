'use client'

import { useState, useMemo } from 'react'
import { Search, BookOpen, Megaphone, Users, MapPin, AlertCircle } from 'lucide-react'

const TABS = [
  { id: 'getting-started', label: 'Getting Started', icon: BookOpen },
  { id: 'campaigns', label: 'Managing Campaigns', icon: Megaphone },
  { id: 'leads', label: 'Understanding Leads', icon: Users },
  { id: 'gbp', label: 'Google Business Profile', icon: MapPin },
  { id: 'troubleshooting', label: 'Troubleshooting', icon: AlertCircle },
]

interface Section {
  heading: string
  body: string[]
}

const CONTENT: Record<string, Section[]> = {
  'getting-started': [
    {
      heading: 'What is NuStack Marketing Engine?',
      body: [
        'The Marketing Engine is a PPC + GBP automation platform built for men\'s health clinics. It manages Google Ads campaigns, captures and nurtures leads, automates Google Business Profile posts and review responses, and gives you a single dashboard to see performance across all your client locations.',
        'It replaces the 4–6 tools a typical agency stitches together (Google Ads, CallRail, GHL, a reporting tool, a review tool, and a manual posting workflow) with a single integrated system.',
      ],
    },
    {
      heading: 'How to add your first client',
      body: [
        '1. Click Intake in the left sidebar.',
        '2. Enter the business name, primary service (e.g. "TRT clinic"), and city.',
        '3. Add economics: target CPL (cost per lead) and average client value. These unlock smart bidding.',
        '4. Add offer, proof point (e.g. "500+ 5-star reviews"), and 2–3 competitor names.',
        '5. When the completeness score reaches 60%, the Launch Campaign button activates.',
      ],
    },
    {
      heading: 'How to launch your first campaign',
      body: [
        '1. Complete the intake form (score ≥ 60%).',
        '2. Go to Settings → Integrations and connect Google Ads.',
        '3. Go to Locations and confirm the location address, phone, and service radius are correct.',
        '4. Click Launch Campaign on the location card or from the Campaigns page.',
        '5. The Campaign Factory runs in the background — campaigns appear in Google Ads within 5–10 minutes.',
      ],
    },
    {
      heading: 'What the completeness score means',
      body: [
        'The score measures how much information the system has to build high-quality campaigns and copy.',
        '0–39%: Not enough to launch. Missing economics (CPL target) or core service info.',
        '40–59%: Can launch a basic campaign, but ad copy quality will be limited.',
        '60–79%: Recommended minimum. Smart bidding and full ad copy generation enabled.',
        '80–100%: Full feature set. All automations including negative keyword expansion and competitor conquesting are active.',
      ],
    },
    {
      heading: 'How long until campaigns start working?',
      body: [
        'Day 1–3: Google reviews and approves ads. Impressions start.',
        'Day 4–14: Learning phase. Google is figuring out which queries convert. CPL may be higher than target.',
        'Day 15–30: Data starts accumulating. Smart bidding begins to optimize.',
        'Day 30+: Campaigns have at least 30 conversions. tCPA bidding activates. CPL should trend toward target.',
        'Don\'t panic during the learning phase. Don\'t pause campaigns. Don\'t change bids. Let the system learn.',
      ],
    },
  ],
  'campaigns': [
    {
      heading: 'How the campaign factory works',
      body: [
        'When you trigger a campaign launch, the Campaign Factory fires an Inngest background job that:',
        '1. Reads the client\'s intake data (service, city, offer, proof point, target CPL).',
        '2. Generates a keyword list using the NuStack compliance filter (no Rx drug terms).',
        '3. Builds an Exact Match + Broad Match Modified campaign structure.',
        '4. Generates 3 RSA (Responsive Search Ad) variants per ad group using Claude AI.',
        '5. Sets MANUAL_CPC bidding at launch with bids calibrated to the target CPL.',
        '6. Creates all campaigns via the Google Ads API and returns the campaign IDs.',
      ],
    },
    {
      heading: 'Campaign structure',
      body: [
        'Each client location gets one Google Ads campaign.',
        'Inside the campaign: 3–5 ad groups organized by intent (e.g. "TRT near me", "hormone therapy", "low T clinic").',
        'Each ad group: 10–15 keywords (Exact + Phrase match) and 3 RSA ads.',
        'Negative keywords are applied at the campaign level and updated weekly based on search term data.',
        'Remarketing lists (RLSA) are added when a location has 100+ website visitors.',
      ],
    },
    {
      heading: 'How bidding works',
      body: [
        'Launch (Day 1–30): MANUAL_CPC. Bids are set based on target CPL and expected CTR. Conservative — avoids blowing budget during the learning phase.',
        'After 30 conversions: Switches to Target CPA (tCPA). You set the target CPL in intake — the system handles the rest.',
        'After 100 conversions: Considers Target ROAS if client LTV data is available.',
        'Never change bidding strategy manually during a learning phase — it resets the algorithm.',
      ],
    },
    {
      heading: 'When to pause vs restructure vs scale',
      body: [
        'PAUSE: Budget exhausted before end of day for 3+ consecutive days → increase budget first.',
        'PAUSE: Impression share < 20% with budget remaining → bidding or QS issue, not a pause situation.',
        'RESTRUCTURE: CPL is 2x+ target after 60 days → rebuild ad groups around different intent clusters.',
        'RESTRUCTURE: CTR < 2% → ad copy issue, not a bidding issue. Regenerate ads via the factory.',
        'SCALE: CPL is at or below target for 14+ days → increase daily budget by 20% per week.',
      ],
    },
    {
      heading: 'The Monday checklist',
      body: [
        '1. Open Dashboard → check CPL vs prior week for each client.',
        '2. Open Analytics → check impression share. Below 50% = flag for budget review.',
        '3. Open Leads → rate any unrated leads from last week (thumbs up/down).',
        '4. Open Reviews → check for any new 1–3 star reviews needing response.',
        '5. Open Posts → publish one of the 4 weekly GBP post drafts for each client.',
        '6. Check Conv. Health → confirm GCLID capture is green for all locations.',
      ],
    },
    {
      heading: 'How to read campaign health: green/yellow/red',
      body: [
        'GREEN: CPL within 20% of target, impression share > 50%, no errors.',
        'YELLOW: CPL 20–50% above target, or impression share 30–50%, or one minor error.',
        'RED: CPL > 50% above target, or impression share < 30%, or campaign suspended/disapproved.',
        'Red status triggers an automatic alert on your dashboard. Investigate before the next client call.',
      ],
    },
  ],
  'leads': [
    {
      heading: 'What counts as a lead',
      body: [
        'Form fill: Any form submission on a NuStack landing page with a valid name + phone.',
        'Phone call: Any inbound call to a CallRail tracked number lasting > 30 seconds.',
        'Chat: GoHighLevel chat submissions (when GHL integration is active).',
        'Each lead record stores: source, keyword, campaign, ad group, GCLID, landing page URL, UTM parameters, and timestamp.',
      ],
    },
    {
      heading: 'How lead quality rating works and why it matters',
      body: [
        'After reviewing a lead, use thumbs up (qualified) or thumbs down (not qualified).',
        'Qualified leads are uploaded to Google Ads as offline conversions — this is how the algorithm learns who to show your ads to.',
        'Unqualified leads with low GCLID pattern = the algorithm can exclude that keyword match type or device.',
        'Rate every lead, every week. A 60% rating rate is the minimum for smart bidding to work well.',
        'The more leads you rate, the more accurately Google\'s algorithm targets future leads.',
      ],
    },
    {
      heading: 'How GCLID tracking works',
      body: [
        'GCLID (Google Click Identifier) is a unique string Google appends to the URL when someone clicks your ad.',
        'Our landing page captures the GCLID from the URL and stores it server-side in Supabase when the form is submitted.',
        'When you mark a lead as qualified, that GCLID is uploaded to Google Ads as an offline conversion.',
        'This is why we use server-side capture — browser privacy settings and ad blockers block client-side GCLID capture.',
        'If you see leads with no GCLID: check that the landing page URL parameter passthrough is not being stripped by a redirect.',
      ],
    },
    {
      heading: 'How leads feed back into smart bidding',
      body: [
        'Qualified leads uploaded as offline conversions tell Google: "The person who clicked this keyword became a real patient inquiry."',
        'Google\'s algorithm then bids more aggressively on similar queries, devices, times, and locations.',
        'The feedback loop typically takes 2–3 weeks to show measurable impact.',
        'Without offline conversion upload, Google optimizes for clicks (cheap but low intent) instead of real leads.',
      ],
    },
    {
      heading: 'How GoHighLevel sync works',
      body: [
        'When the GHL integration is active, every inbound lead is pushed to GHL as a new contact in real time.',
        'The lead\'s source, campaign, and keyword data is passed as custom fields.',
        'If a client already uses GHL for their CRM, this means leads from the Marketing Engine appear in their existing workflow automatically.',
        'Connect GHL in Settings → Integrations using the API key from GHL → Settings → API Keys.',
      ],
    },
  ],
  'gbp': [
    {
      heading: 'How GBP posts work',
      body: [
        'Every week, the system generates 4 AI post variants for each client location.',
        'Posts are generated using the client\'s service info, current seasonal context, and any active offers from their intake profile.',
        'You review the 4 drafts and click Publish on the one you want live.',
        'The post goes directly to Google Business Profile via the GBP API — no manual login needed.',
        'Posts expire after 7 days (Google\'s policy for offer posts). Weekly publishing keeps the profile active.',
      ],
    },
    {
      heading: 'How to pick a post from the 4 weekly drafts',
      body: [
        'Go to Posts in the sidebar.',
        'Review the 4 drafts. Each shows the post text, suggested image prompt, and category.',
        'Pick the one that best matches current promotions or seasonal context.',
        'Click Publish. The post goes live within 60 seconds.',
        'You can also edit the text before publishing — click the edit icon on any draft.',
      ],
    },
    {
      heading: 'Why consistent posting matters',
      body: [
        'Google uses GBP post activity as a local ranking signal.',
        'Profiles that post weekly rank higher in the Local Pack ("map results") than inactive profiles.',
        'For men\'s health keywords, local pack placement drives 40–60% of clicks — organic and paid combined.',
        'One post per week is the minimum. Two is better. The system makes it a one-click decision.',
      ],
    },
    {
      heading: 'How reviews affect local ranking',
      body: [
        'Google uses three review signals: quantity, recency, and response rate.',
        'Quantity: More reviews = higher trust signal. Aim for 50+ reviews per location.',
        'Recency: Reviews older than 6 months lose weight. Clients need a steady review acquisition strategy.',
        'Response rate: Google rewards profiles that respond to all reviews within 48 hours.',
        'The system generates AI response drafts for new reviews. You approve and publish — or auto-publish if enabled.',
        'Review velocity (reviews per month) is more important than total count for ranking.',
      ],
    },
  ],
  'troubleshooting': [
    {
      heading: 'CPL is above target — what to check',
      body: [
        '1. Check Quality Score in Google Ads for the top keywords. QS < 5 = fix landing page relevance.',
        '2. Check impression share. If IS < 50%, you are losing auctions — likely a bid issue, not CPL.',
        '3. Check search terms report. If irrelevant searches are eating budget, add negatives.',
        '4. Check CTR. If CTR < 2%, the ad copy doesn\'t match intent — regenerate ads.',
        '5. Check conversion rate on the landing page. If > 5% leads per click, the page is fine — bidding is the issue.',
        '6. If campaign is < 30 days old, do nothing. Learning phase CPL is always higher than steady state.',
      ],
    },
    {
      heading: 'Campaigns not spending — what to check',
      body: [
        '1. Check campaign status in Google Ads. If ELIGIBLE but not spending: bids may be too low for the auction.',
        '2. Check approval status of ads. If ads are under review or disapproved, impressions stop.',
        '3. Check keyword match types. Exact match in a small market = very low volume. Add Phrase match.',
        '4. Check budget pacing. If daily budget is very low and CPC is high, Google may not trigger the campaign.',
        '5. Check location targeting. Too narrow a radius = not enough searchers.',
      ],
    },
    {
      heading: 'Leads not appearing — what to check',
      body: [
        '1. Check Conv. Health in the sidebar. If red, GCLID capture is broken.',
        '2. Submit a test lead on the landing page and check if it appears in the Leads tab within 5 minutes.',
        '3. If the lead appears in Google Ads but not here: check the API webhook connection in Settings.',
        '4. If the lead appears nowhere: check the landing page form POST endpoint.',
        '5. Check Inngest dashboard for failed jobs in the lead-capture function.',
      ],
    },
    {
      heading: 'Dashboard showing no data — what to check',
      body: [
        '1. Check if a location has been added. No locations = no data to display.',
        '2. Check the date range filter. Default is current month — if it\'s day 1 of the month, there\'s nothing yet.',
        '3. Check if Google Ads integration is connected in Settings → Integrations.',
        '4. Check Supabase for data: if leads exist in the DB but don\'t show on dashboard, it\'s a rendering issue — hard refresh (Ctrl+Shift+R).',
      ],
    },
    {
      heading: 'Google Ads campaign in learning phase — what to expect',
      body: [
        'Every new campaign and every bidding strategy change triggers a learning phase.',
        'During learning: CPL will be higher than target, spend may be inconsistent, impression share fluctuates.',
        'Learning phase lasts 7–14 days or until 30 conversions are recorded, whichever comes first.',
        'What NOT to do during learning: change bids, pause ad groups, change match types, change the target CPA.',
        'Any change resets the learning phase clock.',
        'Best practice: set up the campaign right the first time and don\'t touch it for 30 days.',
      ],
    },
  ],
}

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState('getting-started')
  const [search, setSearch] = useState('')

  const filteredSections = useMemo(() => {
    const sections = CONTENT[activeTab] ?? []
    if (!search.trim()) return sections
    const q = search.toLowerCase()
    return sections.filter(s =>
      s.heading.toLowerCase().includes(q) ||
      s.body.some(b => b.toLowerCase().includes(q))
    )
  }, [activeTab, search])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Operating Manual</h1>
          <p className="text-sm text-gray-500">Everything you need to run the Marketing Engine effectively.</p>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search the manual…"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 flex-wrap mb-6 bg-white border border-gray-100 rounded-lg p-1">
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearch('') }}
                className={[
                  'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center',
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                ].join(' ')}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="space-y-4">
          {filteredSections.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              No results for &quot;{search}&quot; in this section.
            </div>
          ) : (
            filteredSections.map((section, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-lg p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">{section.heading}</h2>
                <div className="space-y-2">
                  {section.body.map((line, j) => (
                    <p key={j} className="text-sm text-gray-600 leading-relaxed">{line}</p>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
