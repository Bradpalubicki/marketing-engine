'use client'

import {
  BarChart2,
  DollarSign,
  TrendingUp,
  Users,
  AlertCircle,
  CheckCircle,
  Settings,
  Bell,
  Filter,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const allCampaigns = [
  // Advanced Dental Group
  { client: 'Advanced Dental Group', campaign: 'Dental Implants — Phoenix', platform: 'Google', budget: '$120/d', spend: '$3,240', clicks: 847, ctr: '4.2%', leads: 38, cpl: '$85', roas: '4.2x', status: 'Active', statusColor: 'bg-emerald-100 text-emerald-700', alert: null },
  { client: 'Advanced Dental Group', campaign: 'Invisalign Spring Promo', platform: 'Meta', budget: '$60/d', spend: '$1,800', clicks: 2341, ctr: '1.8%', leads: 29, cpl: '$62', roas: '5.1x', status: 'Active', statusColor: 'bg-emerald-100 text-emerald-700', alert: null },
  { client: 'Advanced Dental Group', campaign: 'Veneers — Scottsdale', platform: 'Google', budget: '$70/d', spend: '$2,100', clicks: 612, ctr: '3.9%', leads: 31, cpl: '$68', roas: '4.7x', status: 'Active', statusColor: 'bg-emerald-100 text-emerald-700', alert: null },
  { client: 'Advanced Dental Group', campaign: 'Emergency Dental', platform: 'Bing', budget: '$25/d', spend: '$780', clicks: 423, ctr: '5.1%', leads: 18, cpl: '$43', roas: '6.8x', status: 'Active', statusColor: 'bg-emerald-100 text-emerald-700', alert: null },
  // Men's Health Center IL
  { client: "Men's Health Center IL", campaign: 'TRT — Chicago North', platform: 'Google', budget: '$90/d', spend: '$2,700', clicks: 534, ctr: '3.8%', leads: 44, cpl: '$61', roas: '6.2x', status: 'Active', statusColor: 'bg-emerald-100 text-emerald-700', alert: null },
  { client: "Men's Health Center IL", campaign: 'Weight Loss — Meta', platform: 'Meta', budget: '$80/d', spend: '$2,400', clicks: 1820, ctr: '2.1%', leads: 39, cpl: '$62', roas: '4.8x', status: 'Active', statusColor: 'bg-emerald-100 text-emerald-700', alert: null },
  { client: "Men's Health Center IL", campaign: 'ED Treatment — Search', platform: 'Google', budget: '$15/d', spend: '$500', clicks: 198, ctr: '4.6%', leads: 11, cpl: '$45', roas: '7.1x', status: 'Active', statusColor: 'bg-emerald-100 text-emerald-700', alert: null },
  // Premier Dermatology
  { client: 'Premier Dermatology', campaign: 'Botox Summer Promo', platform: 'Meta', budget: '$100/d', spend: '$3,100', clicks: 2940, ctr: '2.4%', leads: 47, cpl: '$66', roas: '7.1x', status: 'Active', statusColor: 'bg-emerald-100 text-emerald-700', alert: null },
  { client: 'Premier Dermatology', campaign: 'Laser Resurfacing', platform: 'Google', budget: '$120/d', spend: '$3,600', clicks: 712, ctr: '4.1%', leads: 54, cpl: '$67', roas: '5.9x', status: 'Active', statusColor: 'bg-emerald-100 text-emerald-700', alert: null },
  // Elite Physical Therapy
  { client: 'Elite Physical Therapy', campaign: 'Sports Rehab — Google', platform: 'Google', budget: '$70/d', spend: '$2,200', clicks: 487, ctr: '2.9%', leads: 24, cpl: '$92', roas: '2.8x', status: 'Review', statusColor: 'bg-amber-100 text-amber-700', alert: 'REVIEW' },
  { client: 'Elite Physical Therapy', campaign: 'Post-Surgery PT', platform: 'Meta', budget: '$60/d', spend: '$2,200', clicks: 1240, ctr: '1.7%', leads: 47, cpl: '$47', roas: '4.4x', status: 'Active', statusColor: 'bg-emerald-100 text-emerald-700', alert: null },
  // Scottsdale Sleep Center
  { client: 'Scottsdale Sleep Center', campaign: 'Sleep Apnea — Bing', platform: 'Bing', budget: '$60/d', spend: '$1,900', clicks: 312, ctr: '3.1%', leads: 12, cpl: '$158', roas: '1.9x', status: 'Review', statusColor: 'bg-red-100 text-red-700', alert: 'HIGH CPL' },
  // Chicago Spine & Pain
  { client: 'Chicago Spine & Pain', campaign: 'Spine Surgery Consult', platform: 'Google', budget: '$150/d', spend: '$4,500', clicks: 891, ctr: '4.4%', leads: 74, cpl: '$61', roas: '5.8x', status: 'Active', statusColor: 'bg-emerald-100 text-emerald-700', alert: null },
  { client: 'Chicago Spine & Pain', campaign: 'Pain Management Bing', platform: 'Bing', budget: '$90/d', spend: '$2,700', clicks: 534, ctr: '5.2%', leads: 44, cpl: '$61', roas: '6.1x', status: 'Active', statusColor: 'bg-emerald-100 text-emerald-700', alert: null },
  // Mountain View Wellness
  { client: 'Mountain View Wellness', campaign: 'Weight Loss Program', platform: 'Meta', budget: '$100/d', spend: '$3,100', clicks: 2100, ctr: '2.0%', leads: 48, cpl: '$65', roas: '4.2x', status: 'Active', statusColor: 'bg-emerald-100 text-emerald-700', alert: null },
  // Bright Smiles Pediatric
  { client: 'Bright Smiles Pediatric', campaign: 'Pediatric Checkup', platform: 'Google', budget: '$50/d', spend: '$1,400', clicks: 423, ctr: '3.7%', leads: 25, cpl: '$56', roas: '5.4x', status: 'Active', statusColor: 'bg-emerald-100 text-emerald-700', alert: null },
  { client: 'Bright Smiles Pediatric', campaign: 'Back to School Promo', platform: 'Meta', budget: '$25/d', spend: '$800', clicks: 980, ctr: '2.3%', leads: 14, cpl: '$57', roas: '4.9x', status: 'Active', statusColor: 'bg-emerald-100 text-emerald-700', alert: null },
]

const platformColors: Record<string, string> = {
  Google: 'bg-blue-100 text-blue-700',
  Meta: 'bg-indigo-100 text-indigo-700',
  Bing: 'bg-cyan-100 text-cyan-700',
}

const alertColors: Record<string, string> = {
  'HIGH CPL': 'bg-red-100 text-red-700 border border-red-200',
  'REVIEW': 'bg-amber-100 text-amber-700 border border-amber-200',
}

const spendByClientData = [
  { client: 'Advanced Dental', google: 5340, meta: 1800, bing: 780 },
  { client: "Men's Health", google: 3200, meta: 2400, bing: 0 },
  { client: 'Premier Derm', google: 3600, meta: 3100, bing: 0 },
  { client: 'Chicago Spine', google: 4500, meta: 0, bing: 2700 },
  { client: 'Mtn Wellness', google: 0, meta: 3100, bing: 0 },
  { client: 'Elite PT', google: 2200, meta: 2200, bing: 0 },
  { client: 'Sleep Ctr', google: 0, meta: 0, bing: 1900 },
  { client: 'Bright Smiles', google: 1400, meta: 800, bing: 0 },
]

export default function SlidePpcBackendPage() {
  const flagged = allCampaigns.filter(c => c.alert)
  const active = allCampaigns.filter(c => !c.alert)

  return (
    <div className="font-sans antialiased bg-gray-50 min-h-screen">

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <div>
                <span className="text-sm font-black text-gray-900">NuStack</span>
                <span className="text-xs text-gray-400 ml-2">PPC Operations Center</span>
              </div>
            </div>

            <div className="h-5 w-px bg-gray-200" />

            <nav className="flex gap-1">
              {['All Campaigns', 'By Client', 'Alerts', 'Reports', 'Settings'].map((item, i) => (
                <button
                  key={item}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg ${i === 0 ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
                >
                  {item}
                  {item === 'Alerts' && <span className="ml-1.5 bg-red-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-full">2</span>}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">March 1–31, 2026</span>
            <button className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
              <Filter className="h-3.5 w-3.5" /> Filter
            </button>
            <button className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <div className="relative">
              <Bell className="h-5 w-5 text-gray-400" />
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-red-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center">2</span>
            </div>
            <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-xs text-white font-bold">B</div>
          </div>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">

        {/* KPI strip */}
        <div className="grid grid-cols-6 gap-4">
          {[
            { label: 'Daily Budget Managed', value: '$3,420/day', icon: DollarSign, trend: null, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'MTD Total Spend', value: '$39,620', icon: TrendingUp, trend: '+12% vs last month', trendUp: true, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'MTD Total Leads', value: '628', icon: Users, trend: '+94 vs last month', trendUp: true, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Portfolio Avg CPL', value: '$63', icon: BarChart2, trend: '-8% vs last month', trendUp: true, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Active Campaigns', value: `${active.length}`, icon: CheckCircle, trend: '2 paused', trendUp: null, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Flagged Campaigns', value: `${flagged.length}`, icon: AlertCircle, trend: 'Require action', trendUp: false, color: 'text-red-600', bg: 'bg-red-50' },
          ].map(m => (
            <div key={m.label} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className={`inline-flex items-center justify-center h-8 w-8 rounded-lg ${m.bg} mb-3`}>
                <m.icon className={`h-4 w-4 ${m.color}`} />
              </div>
              <p className="text-xl font-black text-gray-900">{m.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{m.label}</p>
              {m.trend && (
                <p className={`text-[10px] font-medium mt-1 flex items-center gap-0.5 ${m.trendUp === true ? 'text-emerald-600' : m.trendUp === false ? 'text-red-500' : 'text-gray-400'}`}>
                  {m.trendUp === true && <ArrowUpRight className="h-3 w-3" />}
                  {m.trendUp === false && <ArrowDownRight className="h-3 w-3" />}
                  {m.trend}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* spend by client chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900">MTD Spend by Client & Platform</h3>
            <div className="flex gap-3 text-xs">
              {[{ label: 'Google', color: 'bg-blue-500' }, { label: 'Meta', color: 'bg-indigo-500' }, { label: 'Bing', color: 'bg-cyan-500' }].map(p => (
                <div key={p.label} className="flex items-center gap-1.5">
                  <div className={`h-2 w-2 rounded-full ${p.color}`} />
                  <span className="text-gray-500">{p.label}</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={spendByClientData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="client" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number | string | undefined) => [`$${Number(v ?? 0).toLocaleString()}`, '']} contentStyle={{ borderRadius: 8, fontSize: 11, border: '1px solid #e2e8f0' }} />
              <Bar dataKey="google" name="Google" stackId="a" fill="#3b82f6" />
              <Bar dataKey="meta" name="Meta" stackId="a" fill="#6366f1" />
              <Bar dataKey="bing" name="Bing" stackId="a" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* flagged campaigns */}
        {flagged.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <h3 className="text-sm font-bold text-red-900">{flagged.length} Campaigns Require Immediate Attention</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {flagged.map((c, i) => (
                <div key={i} className="bg-white rounded-lg border border-red-200 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-gray-900">{c.client}</p>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${alertColors[c.alert!]}`}>{c.alert}</span>
                  </div>
                  <p className="text-xs text-gray-600">{c.campaign}</p>
                  <div className="flex gap-4 mt-2 text-[10px] text-gray-400">
                    <span>CPL: <strong className="text-red-600">{c.cpl}</strong></span>
                    <span>ROAS: <strong className="text-red-600">{c.roas}</strong></span>
                    <span>Spend: {c.spend}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* master campaign table */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-bold text-gray-900">All Campaigns</h3>
              <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">{allCampaigns.length} total</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 text-xs text-gray-400">
                <RefreshCw className="h-3 w-3" /> Synced 4 min ago
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  {['Client', 'Campaign', 'Platform', 'Budget', 'MTD Spend', 'Clicks', 'CTR', 'Leads', 'CPL', 'ROAS', 'Status', 'Alert'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allCampaigns.map((c, i) => (
                  <tr key={i} className={`border-b border-gray-50 hover:bg-gray-50/50 ${c.alert === 'HIGH CPL' ? 'bg-red-50/30' : c.alert === 'REVIEW' ? 'bg-amber-50/30' : ''}`}>
                    <td className="py-2.5 px-4 text-xs font-semibold text-gray-700 whitespace-nowrap">{c.client}</td>
                    <td className="py-2.5 px-4 text-xs text-gray-600 max-w-[200px]">
                      <span className="truncate block">{c.campaign}</span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${platformColors[c.platform]}`}>{c.platform}</span>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-gray-500 whitespace-nowrap">{c.budget}</td>
                    <td className="py-2.5 px-4 text-xs font-semibold text-gray-800 whitespace-nowrap">{c.spend}</td>
                    <td className="py-2.5 px-4 text-xs text-gray-500">{parseInt(c.clicks.toString()).toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-xs text-gray-500">{c.ctr}</td>
                    <td className="py-2.5 px-4 text-xs font-bold text-gray-900">{c.leads}</td>
                    <td className={`py-2.5 px-4 text-xs font-bold ${c.alert === 'HIGH CPL' ? 'text-red-600' : 'text-blue-600'}`}>{c.cpl}</td>
                    <td className={`py-2.5 px-4 text-xs font-bold ${parseFloat(c.roas) < 3 ? 'text-red-500' : 'text-emerald-600'}`}>{c.roas}</td>
                    <td className="py-2.5 px-4">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${c.statusColor}`}>{c.status}</span>
                    </td>
                    <td className="py-2.5 px-4">
                      {c.alert ? (
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${alertColors[c.alert]}`}>{c.alert}</span>
                      ) : (
                        <span className="text-[9px] text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
            <div className="flex gap-6 text-xs text-gray-400">
              <span>17 campaigns · 8 clients · 6 locations</span>
              <span>Total MTD Spend: <strong className="text-gray-600">$39,620</strong></span>
              <span>Total Leads: <strong className="text-gray-600">628</strong></span>
              <span>Portfolio CPL: <strong className="text-gray-600">$63</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <Zap className="h-3 w-3 text-blue-500" />
              <span>Managed by <strong className="text-blue-600">NuStack Digital Ventures</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
