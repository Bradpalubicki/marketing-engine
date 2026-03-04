import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Phone, TrendingUp } from 'lucide-react'
import type { Location } from '@/types'

interface LocationCardProps {
  location: Location
  leadsThisMonth?: number
}

const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'success',
  pending: 'warning',
  paused: 'secondary',
  inactive: 'outline',
}

export function LocationCard({ location, leadsThisMonth = 0 }: LocationCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{location.name}</CardTitle>
          <Badge variant={statusVariants[location.status] ?? 'secondary'}>
            {location.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <MapPin className="h-3.5 w-3.5" />
          <span>{location.city}, {location.state}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Phone className="h-3.5 w-3.5" />
          <span>{location.phone}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-blue-600">
          <TrendingUp className="h-3.5 w-3.5" />
          <span>{leadsThisMonth} leads this month</span>
        </div>
        {location.monthly_ad_budget && (
          <p className="text-xs text-gray-400">Budget: ${location.monthly_ad_budget.toLocaleString()}/mo</p>
        )}
        <div className="pt-2">
          <Link
            href={`/dashboard/locations/${location.id}`}
            className="text-xs text-blue-600 hover:underline"
          >
            View details →
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
