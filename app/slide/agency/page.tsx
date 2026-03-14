'use client'

import {
  BarChart2,
  Users,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Settings,
  Bell,
  Globe,
  Brain,
  FileText,
  Zap,
  ArrowUpRight,
  MoreHorizontal,
} from 'lucide-react'

const fakeClients = [
  {
    name: 'Advanced Dental Group',
    type: 'Dental',
    typeColor: 'bg-blue-100 text-blue-700',
    locations: 3,
    spend: '$8,420',
    leads: 127,
    cpl: '$66',
    health: 94,
    healthColor: 'text-emerald-600',
    ring: '#10b981',
    status: 'Active',
    statusColor: 'bg-emerald-100 text-emerald-700',
    topCampaign: 'Dental Implants — Phoenix',
    platform: 'Google · Meta · Bing',
  },
  {
    name: 'Men\'s Health Center IL',
    type: 'Men\'s Health',
    typeColor: 'bg-violet-100 text-violet-700',
    locations: 2,
    spend: '$5,600',
    leads: 94,
    cpl: '$60',
    health: 91,
    healthColor: 'text-emerald-600',
    ring: '#10b981',
    status: 'Active',
    statusColor: 'bg-emerald-100 text-emerald-700',
    topCampaign: 'TRT — Chicago North',
    platform: 'Google · Meta',
  },
  {
    name: 'Premier Dermatology',
    type: 'MedSpa',
    typeColor: 'bg-rose-100 text-rose-700',
    locations: 1,
    spend: '$6,800',
    leads: 103,
    cpl: '$66',
    health: 92,
    healthColor: 'text-emerald-600',
    ring: '#10b981',
    status: 'Active',
    statusColor: 'bg-emerald-100 text-emerald-700',
    topCampaign: 'Botox Summer Promo',
    platform: 'Google · Meta',
  },
  {
    name: 'Chicago Spine & Pain',
    type: 'Specialty',
    typeColor: 'bg-orange-100 text-orange-700',
    locations: 3,
    spend: '$7,200',
    leads: 118,
    cpl: '$61',
    health: 89,
    healthColor: 'text-emerald-600',
    ring: '#10b981',
    status: 'Active',
    statusColor: 'bg-emerald-100 text-emerald-700',
    topCampaign: 'Spine Surgery Consult',
    platform: 'Google · Bing',
  },
  {
    name: 'Mountain View Wellness',
    type: 'Wellness',
    typeColor: 'bg-emerald-100 text-emerald-700',
    locations: 1,
    spend: '$3,100',
    leads: 48,
    cpl: '$65',
    health: 88,
    healthColor: 'text-emerald-600',
    ring: '#10b981',
    status: 'Active',
    statusColor: 'bg-emerald-100 text-emerald-700',
    topCampaign: 'Weight Loss Program',
    platform: 'Meta',
  },
  {
    name: 'Elite Physical Therapy',
    type: 'Wellness',
    typeColor: 'bg-emerald-100 text-emerald-700',
    locations: 2,
    spend: '$4,400',
    leads: 71,
    cpl: '$62',
    health: 79,
    healthColor: 'text-amber-600',
    ring: '#f59e0b',
    status: 'Review',
    statusColor: 'bg-amber-100 text-amber-700',
    topCampaign: 'Sports Rehab — CPL High',
    platform: 'Google · Meta',
  },
  {
    name: 'Scottsdale Sleep Center',
    type: 'Specialty',
    typeColor: 'bg-orange-100 text-orange-700',
    locations: 1,
    spend: '$1,900',
    leads: 28,
    cpl: '$68',
    health: 72,
    healthColor: 'text-amber-600',
    ring: '#f59e0b',
    status: 'Review',
    statusColor: 'bg-amber-100 text-amber-700',
    topCampaign: 'Sleep Apnea — Bing',
    platform: 'Bing',
  },
  {
    name: 'Bright Smiles Pediatric',
    type: 'Dental',
    typeColor: 'bg-blue-100 text-blue-700',
    locations: 1,
    spend: '$2,200',
    leads: 39,
    cpl: '$56',
    health: 85,
    healthColor: 'text-emerald-600',
    ring: '#10b981',
    status: 'Active',
    statusColor: 'bg-emerald-100 text-emerald-700',
    topCampaign: 'Pediatric Checkup Promo',
    platform: 'Google · Meta',
  },
]

const navItems = [
  { icon: BarChart2, label: 'Command Center', active: true },
  { icon: Users, label: 'Clients', active: false },
  { icon: TrendingUp, label: 'PPC Overview', active: false },
  { icon: Brain, label: 'AI Insights', active: false },
  { icon: FileText, label: 'Reports', active: false },
  { icon: AlertCircle, label: 'Alerts', badge: '2', active: false },
  { icon: Settings, label: 'Settings', active: false },
]

function HealthRing({ score, color }: { score: number; color: string }) {
  const r = 18
  const circ = 2 * Math.PI * r
  const fill = (score / 100) * circ
  return (
    <svg width={44} height={44} viewBox="0 0 44 44">
      <circle cx={22} cy={22} r={r} fill="none" stroke="#e5e7eb" strokeWidth={4} />
      <circle
        cx={22} cy={22} r={r} fill="none"
        stroke={color} strokeWidth={4}
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
      />
      <text x={22} y={26} textAnchor="middle" fontSize={10} fontWeight={700} fill={color === '#10b981' ? '#059669' : '#d97706'}>
        {score}
      </text>
    </svg>
  )
}

export default function SlideAgencyPage() {
  const totalSpend = '$39,620'
  const totalLeads = 628
  const avgCPL = '$63'
  const activeClients = fakeClients.filter(c => c.status === 'Active').length
  const reviewClients = fakeClients.filter(c => c.status === 'Review').length

  return (
    <div className="font-sans antialiased flex h-screen overflow-hidden" style={{ background: '#0A0F1E' }}>

      {/* Sidebar */}
      <aside className="w-60 flex flex-col border-r border-white/5" style={{ background: '#0D1220' }}>
        {/* logo */}
        <div className="px-5 py-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-bold">NuStack</p>
              <p className="text-slate-500 text-[10px]">Agency Command Center</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(item => (
            <div
              key={item.label}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer ${
                item.active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span className="text-xs font-medium flex-1">{item.label}</span>
              {item.badge && (
                <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{item.badge}</span>
              )}
            </div>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-xs text-white font-bold">B</div>
            <div>
              <p className="text-white text-xs font-medium">Brad Palubicki</p>
              <p className="text-slate-500 text-[10px]">NuStack Digital Ventures</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* topbar */}
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-6" style={{ background: '#0D1220' }}>
          <div>
            <h1 className="text-base font-bold text-white">Command Center</h1>
            <p className="text-xs text-slate-500">PPC portfolio — March 2026</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 bg-white/5 border border-white/5 rounded-lg px-3 py-1.5">March 1–31, 2026</span>
            <div className="relative">
              <Bell className="h-5 w-5 text-slate-400" />
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-red-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center">2</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* aggregate KPIs */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total MTD Spend', value: totalSpend, sub: 'Across all clients', icon: DollarSign, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
              { label: 'Total Leads MTD', value: totalLeads.toString(), sub: '+94 vs last month', icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
              { label: 'Portfolio Avg CPL', value: avgCPL, sub: 'Blended across platforms', icon: TrendingUp, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
              { label: 'Active Clients', value: `${activeClients} / ${fakeClients.length}`, sub: `${reviewClients} require review`, icon: CheckCircle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
            ].map(m => (
              <div key={m.label} className={`rounded-xl border ${m.border} p-5`} style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className={`inline-flex items-center justify-center h-9 w-9 rounded-lg ${m.bg} mb-3`}>
                  <m.icon className={`h-4 w-4 ${m.color}`} />
                </div>
                <p className="text-2xl font-black text-white">{m.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{m.label}</p>
                <p className="text-[10px] text-slate-600 mt-1">{m.sub}</p>
              </div>
            ))}
          </div>

          {/* section header */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Client Portfolio</h2>
            <div className="flex gap-2">
              <button className="text-xs bg-white/5 border border-white/10 text-slate-300 px-3 py-1.5 rounded-lg">All Types</button>
              <button className="text-xs bg-white/5 border border-white/10 text-slate-300 px-3 py-1.5 rounded-lg">All Statuses</button>
            </div>
          </div>

          {/* client grid */}
          <div className="grid grid-cols-4 gap-4">
            {fakeClients.map(client => (
              <div
                key={client.name}
                className="rounded-xl border border-white/5 p-5 hover:border-white/10 transition-colors cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-white text-xs font-bold leading-tight truncate">{client.name}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${client.typeColor}`}>{client.type}</span>
                      <span className="text-slate-500 text-[9px]">{client.locations} loc{client.locations > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <HealthRing score={client.health} color={client.ring} />
                </div>

                <div className="space-y-2.5 mb-4">
                  {[
                    { label: 'MTD Spend', value: client.spend },
                    { label: 'Leads', value: client.leads.toString() },
                    { label: 'Avg CPL', value: client.cpl },
                  ].map(m => (
                    <div key={m.label} className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500">{m.label}</span>
                      <span className="text-xs font-bold text-white">{m.value}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/5 pt-3">
                  <p className="text-[9px] text-slate-500 mb-0.5">Top Campaign</p>
                  <p className="text-[10px] text-slate-300 font-medium truncate">{client.topCampaign}</p>
                  <p className="text-[9px] text-slate-600 mt-0.5">{client.platform}</p>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${client.statusColor}`}>{client.status}</span>
                  <MoreHorizontal className="h-3.5 w-3.5 text-slate-600" />
                </div>
              </div>
            ))}
          </div>

          {/* alerts strip */}
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <p className="text-sm font-bold text-white">2 Campaigns Need Attention</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { client: 'Scottsdale Sleep Center', issue: 'Sleep Apnea — Bing CPL at $158 (target: $80)', severity: 'HIGH CPL', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
                { client: 'Elite Physical Therapy', issue: 'Sports Rehab ROAS dropped to 2.8x — review budget', severity: 'REVIEW', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
              ].map(a => (
                <div key={a.client} className={`rounded-lg border p-3 ${a.color}`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold">{a.client}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${a.color}`}>{a.severity}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">{a.issue}</p>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
