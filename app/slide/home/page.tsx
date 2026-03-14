'use client'

import {
  BarChart2,
  Brain,
  DollarSign,
  Globe,
  MapPin,
  Star,
  TrendingUp,
  Users,
  Zap,
  CheckCircle,
  XCircle,
  ChevronRight,
  ArrowRight,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

const sparkData = [
  { v: 12 }, { v: 18 }, { v: 14 }, { v: 22 }, { v: 19 }, { v: 28 }, { v: 24 },
  { v: 31 }, { v: 27 }, { v: 38 }, { v: 34 }, { v: 42 },
]

const miniChartData = [
  { date: 'Mar 1', google: 280, meta: 120, bing: 60 },
  { date: 'Mar 5', google: 320, meta: 145, bing: 70 },
  { date: 'Mar 10', google: 410, meta: 180, bing: 85 },
  { date: 'Mar 15', google: 380, meta: 200, bing: 90 },
  { date: 'Mar 20', google: 460, meta: 220, bing: 100 },
  { date: 'Mar 25', google: 510, meta: 195, bing: 110 },
  { date: 'Mar 30', google: 490, meta: 240, bing: 95 },
]

const stats = [
  { value: '$2.4M', label: 'Ad Spend Managed', icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50', sparkColor: '#3b82f6' },
  { value: '847', label: 'Leads Generated This Month', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50', sparkColor: '#10b981' },
  { value: '$38', label: 'Average Cost Per Lead', icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50', sparkColor: '#7c3aed' },
  { value: '4.9★', label: 'Average Review Rating', icon: Star, color: 'text-amber-600', bg: 'bg-amber-50', sparkColor: '#f59e0b' },
]

const features = [
  {
    icon: BarChart2,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    title: 'Unified Campaign Management',
    desc: 'Google, Meta, and Bing in one dashboard. No switching tabs, no missed spend, no data silos.',
  },
  {
    icon: Brain,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    title: 'AI Weekly Insights',
    desc: 'Every Sunday, Claude analyzes your spend and tells you exactly what to optimize — before you lose budget.',
  },
  {
    icon: DollarSign,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    title: 'True Cost Per Lead Tracking',
    desc: 'Know your CPL by campaign, platform, and location. Real attribution — not agency guesswork.',
  },
  {
    icon: Star,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    title: 'Review Request Automation',
    desc: 'Automatically send review requests after appointments. Protect your 5-star rating at scale.',
  },
  {
    icon: MapPin,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    title: 'Multi-Location Intelligence',
    desc: 'Managing 3 locations? 30? One dashboard shows everything ranked by performance — instantly.',
  },
  {
    icon: Globe,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
    title: 'Conversion Landing Pages',
    desc: 'Pre-built, conversion-optimized landing pages for every procedure and city. No design agency needed.',
  },
]

const comparisons = [
  { bad: 'Agency sends a monthly PDF report', good: 'AI insights every Sunday, auto-emailed to your inbox' },
  { bad: 'Siloed Google, Meta, and Bing dashboards', good: 'All platforms in one screen — one source of truth' },
  { bad: 'You own nothing when you leave the agency', good: 'Your data, your dashboard, your engine — forever' },
  { bad: 'Setup takes 6–8 weeks and a kickoff call', good: 'Live in 7 days, campaigns running on day one' },
]

export default function SlidehomePage() {
  return (
    <div className="font-sans antialiased">

      {/* ── SECTION 1: HERO ─────────────────────────────────────── */}
      <section
        id="hero"
        className="relative overflow-hidden min-h-screen flex flex-col justify-center"
        style={{ background: 'linear-gradient(135deg, #0A0F1E 0%, #0F1729 60%, #0D1B3E 100%)' }}
      >
        {/* grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* glow blobs */}
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }} />

        <div className="relative z-10 max-w-7xl mx-auto px-8 py-24 grid grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            {/* badge */}
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-8">
              <Zap className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-xs font-medium text-blue-300 tracking-wide uppercase">NuStack Marketing Engine</span>
            </div>

            <h1 className="text-5xl font-bold text-white leading-tight mb-6">
              Your Patients Are Searching.{' '}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                We Make Sure They Find You.
              </span>
            </h1>

            <p className="text-lg text-slate-400 mb-10 leading-relaxed max-w-xl">
              NuStack's Marketing Engine connects PPC, social, reviews, and AI — pre-wired for healthcare practices. No setup. No agency. No guesswork.
            </p>

            <div className="flex gap-4 mb-12">
              <button className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-7 py-3.5 rounded-xl transition-colors flex items-center gap-2">
                See It Live <ChevronRight className="h-4 w-4" />
              </button>
              <button className="border border-white/10 text-white/80 hover:bg-white/5 font-medium px-7 py-3.5 rounded-xl transition-colors">
                Watch Demo
              </button>
            </div>

            {/* platform chips */}
            <div className="flex flex-wrap gap-2">
              {['Google Ads', 'Meta Ads', 'Microsoft Bing', 'AI Insights', 'Review Automation', 'Landing Pages'].map(tag => (
                <span key={tag} className="text-xs font-medium bg-white/5 border border-white/10 text-slate-300 px-3 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Right — dashboard preview card */}
          <div className="relative">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 shadow-2xl">
              {/* mock header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Advanced Dental Group</p>
                  <p className="text-white font-semibold">Campaign Overview — March 2026</p>
                </div>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs font-medium px-2.5 py-1 rounded-full border border-emerald-500/20">
                  ● Live
                </span>
              </div>

              {/* mini kpi row */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'MTD Spend', val: '$8,420' },
                  { label: 'Leads', val: '127' },
                  { label: 'Avg CPL', val: '$66' },
                ].map(k => (
                  <div key={k.label} className="bg-white/5 rounded-xl p-3">
                    <p className="text-xs text-slate-400">{k.label}</p>
                    <p className="text-xl font-bold text-white mt-0.5">{k.val}</p>
                  </div>
                ))}
              </div>

              {/* mini chart */}
              <div className="rounded-xl bg-white/5 p-4">
                <p className="text-xs text-slate-400 mb-3">Daily Spend — Last 30 Days</p>
                <ResponsiveContainer width="100%" height={110}>
                  <AreaChart data={miniChartData}>
                    <defs>
                      <linearGradient id="gg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="google" stroke="#3b82f6" fill="url(#gg)" strokeWidth={2} dot={false} />
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 11 }}
                      labelStyle={{ color: '#94a3b8' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* leads row */}
              <div className="mt-4 space-y-2">
                {[
                  { name: 'Jennifer M.', src: 'Google Ads', status: 'Booked', color: 'text-emerald-400' },
                  { name: 'Robert T.', src: 'Meta Ads', status: 'Called', color: 'text-blue-400' },
                  { name: 'Amanda W.', src: 'Google Ads', status: 'New', color: 'text-amber-400' },
                ].map(l => (
                  <div key={l.name} className="flex items-center justify-between py-2 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white font-medium">
                        {l.name[0]}
                      </div>
                      <div>
                        <p className="text-xs text-white font-medium">{l.name}</p>
                        <p className="text-[10px] text-slate-400">{l.src}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-semibold ${l.color}`}>{l.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* floating badge */}
            <div className="absolute -bottom-4 -left-4 bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg">
              68% Booking Rate
            </div>
          </div>
        </div>

        {/* trust bar */}
        <div className="relative z-10 border-t border-white/5 py-6">
          <div className="max-w-7xl mx-auto px-8 flex items-center gap-12">
            <p className="text-xs text-slate-500 uppercase tracking-widest whitespace-nowrap">Trusted by practices across 6 states</p>
            {['Advanced Dental Group', 'Men\'s Health Center', 'Premier Dermatology', 'Mountain View Wellness'].map(name => (
              <div key={name} className="text-slate-600 text-xs font-semibold tracking-wide whitespace-nowrap">{name}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 2: STATS BAR ────────────────────────────────── */}
      <section id="stats" className="bg-white py-20 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-8">
          <p className="text-center text-sm font-semibold text-gray-400 uppercase tracking-widest mb-12">
            Results across the NuStack client portfolio
          </p>
          <div className="grid grid-cols-4 gap-8">
            {stats.map(stat => (
              <div key={stat.label} className="text-center relative">
                <div className={`inline-flex items-center justify-center h-12 w-12 rounded-2xl ${stat.bg} mb-4`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <p className="text-5xl font-black text-gray-900 mb-2">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <div className="mt-4 h-12">
                  <ResponsiveContainer width="100%" height={48}>
                    <AreaChart data={sparkData}>
                      <defs>
                        <linearGradient id={`spark-${stat.label}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={stat.sparkColor} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={stat.sparkColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="v"
                        stroke={stat.sparkColor}
                        strokeWidth={2}
                        fill={`url(#spark-${stat.label})`}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 3: FEATURES GRID ────────────────────────────── */}
      <section id="features" className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything your practice needs to{' '}
              <span className="text-blue-600">dominate local search</span>
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Pre-wired, pre-connected, and live in 7 days. Not a platform — an engine.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {features.map(f => (
              <div
                key={f.title}
                className="bg-white rounded-2xl p-7 border border-gray-100 hover:border-blue-100 hover:shadow-lg transition-all group"
              >
                <div className={`inline-flex items-center justify-center h-11 w-11 rounded-xl ${f.bg} mb-5`}>
                  <f.icon className={`h-5 w-5 ${f.color}`} />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">
                  {f.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* bottom CTA strip */}
          <div className="mt-14 bg-blue-600 rounded-2xl p-8 flex items-center justify-between">
            <div>
              <p className="text-white font-bold text-xl">Ready to see your engine?</p>
              <p className="text-blue-200 text-sm mt-1">We build, configure, and launch — you focus on patients.</p>
            </div>
            <button className="bg-white text-blue-600 font-bold px-8 py-3.5 rounded-xl flex items-center gap-2 hover:bg-blue-50 transition-colors">
              Get Your Custom Proposal <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: DIFFERENTIATION ──────────────────────────── */}
      <section
        id="differentiation"
        className="py-24"
        style={{ background: 'linear-gradient(135deg, #0A0F1E 0%, #0F1729 100%)' }}
      >
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-2 gap-20 items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-8">
              <span className="text-xs font-medium text-blue-300 tracking-wide uppercase">Why NuStack wins</span>
            </div>
            <h2 className="text-4xl font-bold text-white mb-10 leading-tight">
              What makes NuStack different from every marketing agency you've hired
            </h2>

            <div className="space-y-5">
              {comparisons.map((c, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-start gap-3">
                    <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-slate-400">{c.bad}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-white font-medium">{c.good}</p>
                  </div>
                  {i < comparisons.length - 1 && <div className="border-b border-white/5 pt-2" />}
                </div>
              ))}
            </div>
          </div>

          {/* Right — testimonial + mini stats */}
          <div className="space-y-6">
            {/* testimonial card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="flex gap-1 mb-4">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className="h-5 w-5 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-white text-lg leading-relaxed mb-6 italic">
                "NuStack cut our cost per new patient from $312 to $89 in 60 days. I can see exactly where every dollar goes — and so can my office manager."
              </p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">SC</div>
                <div>
                  <p className="text-white text-sm font-semibold">Dr. Sarah Chen</p>
                  <p className="text-slate-400 text-xs">Advanced Dental Group — Phoenix, AZ</p>
                </div>
              </div>
            </div>

            {/* result cards */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Cost Per Lead Reduction', val: '72%', sub: '$312 → $89', color: 'text-emerald-400' },
                { label: 'Time to First Lead', val: '7 Days', sub: 'From signed to live', color: 'text-blue-400' },
                { label: 'Platforms Connected', val: '3', sub: 'Google · Meta · Bing', color: 'text-violet-400' },
                { label: 'AI Reports Per Month', val: '4', sub: 'Every Sunday, auto-sent', color: 'text-amber-400' },
              ].map(r => (
                <div key={r.label} className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <p className={`text-3xl font-black ${r.color}`}>{r.val}</p>
                  <p className="text-white text-xs font-semibold mt-1">{r.label}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{r.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
