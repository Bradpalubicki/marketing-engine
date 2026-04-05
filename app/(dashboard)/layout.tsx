'use client'

import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { BarChart3, MapPin, Users, TrendingUp, Megaphone, Star, FileText, Settings, FileImage, Menu, X, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3, exact: true },
  { href: '/dashboard/locations', label: 'Locations', icon: MapPin, exact: false },
  { href: '/dashboard/leads', label: 'Leads', icon: Users, exact: false },
  { href: '/dashboard/analytics', label: 'Analytics', icon: TrendingUp, exact: false },
  { href: '/dashboard/campaigns', label: 'Campaigns', icon: Megaphone, exact: false },
  { href: '/dashboard/reviews', label: 'Reviews', icon: Star, exact: false },
  { href: '/dashboard/posts', label: 'Posts', icon: FileImage, exact: false },
  { href: '/dashboard/reports', label: 'Reports', icon: FileText, exact: false },
  { href: '/dashboard/tracking', label: 'Conv. Health', icon: Activity, exact: false },
  { href: '/dashboard/settings/integrations', label: 'Settings', icon: Settings, exact: false },
]

function NavLinks({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname()
  return (
    <>
      {navItems.map((item) => {
        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              isActive
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-100 flex-col flex-shrink-0">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 leading-tight">Marketing Engine</h1>
              <p className="text-xs text-gray-400">NuStack Digital</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-0.5">
          <NavLinks />
        </nav>
        <div className="p-4 border-t border-gray-100 flex items-center gap-3">
          <UserButton />
          <span className="text-xs text-gray-500">Account</span>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-100 flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
            <BarChart3 className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-gray-900">Marketing Engine</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-50"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-20 bg-black/40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'md:hidden fixed top-14 left-0 bottom-0 z-20 w-64 bg-white border-r border-gray-100 flex flex-col transform transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
          <NavLinks onItemClick={() => setMobileOpen(false)} />
        </nav>
        <div className="p-4 border-t border-gray-100 flex items-center gap-3">
          <UserButton />
          <span className="text-xs text-gray-500">Account</span>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto md:ml-0 mt-14 md:mt-0">
        {children}
      </main>
    </div>
  )
}
