import { supabaseAdmin } from '@/lib/supabase'
import { LocationCard } from '@/components/dashboard/LocationCard'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { format, startOfMonth } from 'date-fns'
import type { Location } from '@/types'

export const dynamic = 'force-dynamic'

export default async function LocationsPage() {
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')

  const [locationsRes, leadsRes] = await Promise.all([
    supabaseAdmin.from('locations').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('leads').select('location_id').gte('created_at', monthStart),
  ])

  const locations = (locationsRes.data ?? []) as Location[]
  const leads = leadsRes.data ?? []

  const leadsByLocation: Record<string, number> = {}
  leads.forEach(l => {
    leadsByLocation[l.location_id] = (leadsByLocation[l.location_id] ?? 0) + 1
  })

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
          <p className="text-gray-500 mt-1">{locations.length} locations configured</p>
        </div>
        <Link href="/dashboard/locations/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </Link>
      </div>

      {locations.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg mb-4">No locations yet</p>
          <Link href="/dashboard/locations/new">
            <Button>Add your first location</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map(location => (
            <LocationCard
              key={location.id}
              location={location}
              leadsThisMonth={leadsByLocation[location.id] ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}
