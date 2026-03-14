'use client'

import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  Users,
  DollarSign,
  TrendingUp,
  CheckCircle,
  Star,
  MapPin,
  Brain,
  BarChart2,
  FileText,
  Settings,
  Bell,
  ChevronDown,
  ArrowUpRight,
} from 'lucide-react'

const fakeLeads = [
  { name: 'Jennifer Martinez', source: 'Google Ads', campaign: 'Implants Phoenix', status: 'Booked', statusColor: 'bg-emerald-100 text-emerald-700', value: '$4,800', time: '2h ago' },
  { name: 'Robert Thompson', source: 'Meta Ads', campaign: 'Invisalign Spring', status: 'Called', statusColor: 'bg-blue-100 text-blue-700', value: '$3,200', time: '4h ago' },
  { name: 'Amanda Wilson', source: 'Google Ads', campaign: 'Veneers Phoenix', status: 'New', statusColor: 'bg-amber-100 text-amber-700', value: '$6,100', time: '5h ago' },
  { name: 'David Kim', source: 'Bing Ads', campaign: 'Dental Implants', status: 'Booked', statusColor: 'bg-emerald-100 text-emerald-700', value: '$5,500', time: 'Yesterday' },
  { name: 'Lisa Chen', source: 'Google Ads', campaign: 'Emergency Dental', status: 'Showed', statusColor: 'bg-violet-100 text-violet-700', value: '$890', time: 'Yesterday' },
  { name: 'Marcus Johnson', source: 'Meta Ads', campaign: 'Teeth Whitening', status: 'New', statusColor: 'bg-amber-100 text-amber-700', value: '$299', time: '2d ago' },
]

const fakeCampaigns = [
  { name: 'Dental Implants — Phoenix', platform: 'Google', platformColor: 'text-blue-600 bg-blue-50', budget: '$120/d', spend: '$3,240', clicks: 847, ctr: '4.2%', leads: 38, cpl: '$85', status: 'Active', statusColor: 'bg-emerald-100 text-emerald-700' },
  { name: 'Invisalign Spring Promo', platform: 'Meta', platformColor: 'text-indigo-600 bg-indigo-50', budget: '$60/d', spend: '$1,800', clicks: 2341, ctr: '1.8%', leads: 29, cpl: '$62', status: 'Active', statusColor: 'bg-emerald-100 text-emerald-700' },
  { name: 'Veneers — Scottsdale', platform: 'Google', platformColor: 'text-blue-600 bg-blue-50', budget: '$70/d', spend: '$2,100', clicks: 612, ctr: '3.9%', leads: 31, cpl: '$68', status: 'Active', statusColor: 'bg-emerald-100 text-emerald-700' },
  { name: 'Emergency Dental', platform: 'Bing', platformColor: 'text-cyan-600 bg-cyan-50', budget: '$25/d', spend: '$780', clicks: 423, ctr: '5.1%', leads: 18, cpl: '$43', status: 'Active', statusColor: 'bg-emerald-100 text-emerald-700' },
  { name: 'Teeth Whitening — Meta', platform: 'Meta', platformColor: 'text-indigo-600 bg-indigo-50', budget: '$20/d', spend: '$500', clicks: 1820, ctr: '2.2%', leads: 11, cpl: '$45', status: 'Paused', statusColor: 'bg-gray-100 text-gray-500' },
]

const spendChartData = [
  { date: 'Mar 1', google: 280, microsoft: 60, meta: 120 },
  { date: 'Mar 5', google: 320, microsoft: 70, meta: 145 },
  { date: 'Mar 10', google: 410, microsoft: 85, meta: 180 },
  { date: 'Mar 15', google: 380, microsoft: 90, meta: 200 },
  { date: 'Mar 20', google: 460, microsoft: 100, meta: 220 },
  { date: 'Mar 25', google: 510, microsoft: 110, meta: 195 },
  { date: 'Mar 30', google: 490, microsoft: 95, meta: 240 },
]

const leadsOverTimeData = [
  { date: 'Mar 1', leads: 4 },
  { date: 'Mar 5', leads: 7 },
  { date: 'Mar 10', leads: 12 },
  { date: 'Mar 15', leads: 9 },
  { date: 'Mar 20', leads: 16 },
  { date: 'Mar 25', leads: 14 },
  { date: 'Mar 30', leads: 19 },
]

const navItems = [
  { icon: BarChart2, label: 'Dashboard', active: true },
  { icon: Users, label: 'Leads', active: false },
  { icon: TrendingUp, label: 'Campaigns', active: false },
  { icon: Star, label: 'Reviews', active: false },
  { icon: MapPin, label: 'Locations', active: false },
  { icon: Brain, label: 'AI Insights', active: false },
  { icon: FileText, label: 'Reports', active: false },
  { icon: Settings, label: 'Settings', active: false },
]

const metrics = [
  { title: 'Leads This Month', value: '127', sub: '+18 vs last month', icon: Users, trend: '+14%', trendUp: true },
  { title: 'Booking Rate', value: '68%', sub: '86 booked from 127 leads', icon: CheckCircle, trend: '+4%', trendUp: true },
  { title: 'MTD Ad Spend', value: '$8,420', sub: '$9,000 monthly budget', icon: DollarSign, trend: '93%', trendUp: null },
  { title: 'Avg Cost Per Lead', value: '$66', sub: 'Google: $73 · Meta: $62 · Bing: $43', icon: TrendingUp, trend: '-12%', trendUp: true },
  { title: 'Active Locations', value: '3', sub: 'Phoenix · Scottsdale · Tempe', icon: MapPin, trend: null, trendUp: null },
  { title: 'Avg Review Rating', value: '4.8★', sub: '214 total reviews managed', icon: Star, trend: '+0.2', trendUp: true },
]

function Sidebar({ activeTab }: { activeTab: 'dashboard' | 'campaigns' }) {
  return (
    <aside className="w-56 bg-gray-900 flex flex-col h-screen sticky top-0">
      {/* logo */}
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <BarChart2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-bold leading-tight">NuStack</p>
            <p className="text-slate-400 text-[10px]">Marketing Engine</p>
          </div>
        </div>
      </div>

      {/* client */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
          <div className="h-6 w-6 rounded bg-blue-600 flex items-center justify-center text-[10px] text-white font-bold">AD</div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">Advanced Dental Group</p>
            <p className="text-slate-400 text-[10px]">Phoenix, AZ · 3 locations</p>
          </div>
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const isActive = (activeTab === 'dashboard' && item.label === 'Dashboard') ||
            (activeTab === 'campaigns' && item.label === 'Campaigns')
          return (
            <div
              key={item.label}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span className="text-xs font-medium">{item.label}</span>
              {item.label === 'Leads' && (
                <span className="ml-auto bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">12</span>
              )}
            </div>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-white/5">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-slate-600 flex items-center justify-center text-xs text-white font-medium">SC</div>
          <div>
            <p className="text-white text-xs font-medium">Dr. Sarah Chen</p>
            <p className="text-slate-400 text-[10px]">Practice Owner</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

function TopBar({ title, sub }: { title: string; sub: string }) {
  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-10">
      <div>
        <h1 className="text-base font-bold text-gray-900">{title}</h1>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
          March 1 – March 31, 2026
        </div>
        <div className="relative">
          <Bell className="h-5 w-5 text-gray-400" />
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-red-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center">3</span>
        </div>
      </div>
    </header>
  )
}

export default function SlidePlatformPage() {
  return (
    <div className="font-sans antialiased bg-gray-50">

      {/* ── VIEW 1: MAIN DASHBOARD ─────────────────────────────── */}
      <section id="platform-dashboard" className="flex h-screen overflow-hidden">
        <Sidebar activeTab="dashboard" />

        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar title="Dashboard" sub="Patient acquisition overview — Advanced Dental Group" />

          <main className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* metrics */}
            <div className="grid grid-cols-3 gap-4">
              {metrics.map(m => (
                <div key={m.title} className="bg-white rounded-xl border border-gray-100 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
                      <m.icon className="h-4.5 w-4.5 text-blue-600" />
                    </div>
                    {m.trend && (
                      <span className={`text-xs font-semibold flex items-center gap-0.5 ${m.trendUp === true ? 'text-emerald-600' : m.trendUp === false ? 'text-red-500' : 'text-gray-500'}`}>
                        {m.trendUp === true && <ArrowUpRight className="h-3 w-3" />}
                        {m.trend}
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-black text-gray-900">{m.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{m.title}</p>
                  <p className="text-[10px] text-gray-300 mt-1">{m.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* leads chart */}
              <div className="col-span-2 bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900">Leads Over Time</h3>
                  <span className="text-xs text-gray-400">Last 30 days</span>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={leadsOverTimeData}>
                    <defs>
                      <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11, border: '1px solid #e2e8f0' }} />
                    <Area type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} fill="url(#leadGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* platform breakdown */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Spend by Platform</h3>
                <div className="space-y-4">
                  {[
                    { name: 'Google Ads', spend: '$5,340', pct: 63, color: 'bg-blue-500' },
                    { name: 'Meta Ads', spend: '$2,300', pct: 27, color: 'bg-indigo-500' },
                    { name: 'Bing Ads', spend: '$780', pct: 10, color: 'bg-cyan-500' },
                  ].map(p => (
                    <div key={p.name}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-medium text-gray-700">{p.name}</span>
                        <span className="text-gray-500">{p.spend}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full">
                        <div className={`h-2 rounded-full ${p.color}`} style={{ width: `${p.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">Total MTD Spend</p>
                  <p className="text-2xl font-black text-gray-900">$8,420</p>
                  <p className="text-xs text-emerald-600 font-medium">93% of $9,000 budget used</p>
                </div>
              </div>
            </div>

            {/* recent leads table */}
            <div className="bg-white rounded-xl border border-gray-100">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">Recent Leads</h3>
                <button className="text-xs text-blue-600 font-medium">View all 127 →</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50">
                      {['Patient', 'Source', 'Campaign', 'Status', 'Est. Value', 'Time'].map(h => (
                        <th key={h} className="text-left py-3 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fakeLeads.map((lead, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                              {lead.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span className="font-medium text-gray-900 text-xs">{lead.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-5 text-xs text-gray-500">{lead.source}</td>
                        <td className="py-3 px-5 text-xs text-gray-500">{lead.campaign}</td>
                        <td className="py-3 px-5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${lead.statusColor}`}>{lead.status}</span>
                        </td>
                        <td className="py-3 px-5 text-xs font-semibold text-gray-700">{lead.value}</td>
                        <td className="py-3 px-5 text-xs text-gray-400">{lead.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AI insight card */}
            <div className="bg-gradient-to-r from-violet-50 to-blue-50 rounded-xl border border-violet-100 p-5">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
                  <Brain className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className="text-sm font-bold text-gray-900">AI Insight — Week of March 24, 2026</p>
                    <span className="text-[10px] bg-violet-100 text-violet-700 font-semibold px-2 py-0.5 rounded-full">Auto-generated</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Your Emergency Dental campaign on Bing is delivering leads at <strong>$43 CPL</strong> — 35% below your account average. Consider increasing Bing budget by $15/day to capture more demand before competitors discover this gap. Additionally, the Invisalign campaign is performing best on Tuesday–Thursday. Shift $10/day of weekend budget to midweek to improve booking rate.
                  </p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </section>

      {/* ── VIEW 2: CAMPAIGNS DEEP DIVE ────────────────────────── */}
      <section id="platform-campaigns" className="flex h-screen overflow-hidden">
        <Sidebar activeTab="campaigns" />

        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar title="Campaigns" sub="5 campaigns across 3 locations — March 2026" />

          <main className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* spend metrics */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { title: 'Total MTD Spend', value: '$8,420', sub: 'All platforms' },
                { title: 'Google MTD', value: '$5,340', sub: 'Google Ads' },
                { title: 'Meta MTD', value: '$2,300', sub: 'Meta Ads' },
                { title: 'Bing MTD', value: '$780', sub: 'Microsoft Ads' },
              ].map(m => (
                <div key={m.title} className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <p className="text-xs text-gray-500 font-medium">{m.title}</p>
                  </div>
                  <p className="text-2xl font-black text-gray-900">{m.value}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{m.sub}</p>
                </div>
              ))}
            </div>

            {/* spend chart */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900">Daily Spend by Platform — Last 30 Days</h3>
                <div className="flex gap-3 text-xs">
                  {[
                    { label: 'Google', color: 'bg-blue-500' },
                    { label: 'Meta', color: 'bg-indigo-500' },
                    { label: 'Bing', color: 'bg-cyan-500' },
                  ].map(p => (
                    <div key={p.label} className="flex items-center gap-1.5">
                      <div className={`h-2 w-2 rounded-full ${p.color}`} />
                      <span className="text-gray-500">{p.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={spendChartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip formatter={(v: number | string | undefined) => [`$${Number(v ?? 0)}`, '']} contentStyle={{ borderRadius: 8, fontSize: 11, border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="google" name="Google" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="meta" name="Meta" stackId="a" fill="#6366f1" />
                  <Bar dataKey="microsoft" name="Bing" stackId="a" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* campaign performance table */}
            <div className="bg-white rounded-xl border border-gray-100">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">Campaign Performance</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50">
                      {['Campaign', 'Platform', 'Budget', 'MTD Spend', 'Clicks', 'CTR', 'Leads', 'CPL', 'Status'].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fakeCampaigns.map((c, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-3 px-4 text-xs font-semibold text-gray-900 whitespace-nowrap">{c.name}</td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.platformColor}`}>{c.platform}</span>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500">{c.budget}</td>
                        <td className="py-3 px-4 text-xs font-semibold text-gray-700">{c.spend}</td>
                        <td className="py-3 px-4 text-xs text-gray-500">{c.clicks.toLocaleString()}</td>
                        <td className="py-3 px-4 text-xs text-gray-500">{c.ctr}</td>
                        <td className="py-3 px-4 text-xs font-bold text-gray-900">{c.leads}</td>
                        <td className="py-3 px-4 text-xs font-semibold text-blue-600">{c.cpl}</td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.statusColor}`}>{c.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-between text-xs text-gray-400">
                <span>5 campaigns · Total spend: $8,420 · 127 leads · Avg CPL: $66</span>
                <span>Last synced 4 min ago</span>
              </div>
            </div>
          </main>
        </div>
      </section>
    </div>
  )
}
