'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { setLocationStatus } from '@/app/(dashboard)/dashboard/locations/actions'
import type { LocationStatus } from '@/types'

interface Props {
  locationId: string
  currentStatus: LocationStatus
}

const statusVariant: Record<LocationStatus, 'default' | 'success' | 'warning' | 'secondary' | 'outline'> = {
  active: 'success',
  pending: 'warning',
  paused: 'secondary',
  inactive: 'outline',
}

export function LocationStatusCard({ locationId, currentStatus }: Props) {
  const [status, setStatus] = useState<LocationStatus>(currentStatus)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleStatusChange(newStatus: 'active' | 'paused' | 'inactive') {
    if (newStatus === status) return
    setLoading(true)
    setError(null)
    try {
      await setLocationStatus(locationId, newStatus)
      setStatus(newStatus)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-gray-500">Location Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Current:</span>
          <Badge variant={statusVariant[status] ?? 'secondary'} className="capitalize">
            {status}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={status === 'active' ? 'default' : 'outline'}
            disabled={loading || status === 'active'}
            onClick={() => handleStatusChange('active')}
          >
            Activate
          </Button>
          <Button
            size="sm"
            variant={status === 'paused' ? 'default' : 'outline'}
            disabled={loading || status === 'paused'}
            onClick={() => handleStatusChange('paused')}
          >
            Pause
          </Button>
          <Button
            size="sm"
            variant={status === 'inactive' ? 'destructive' : 'outline'}
            disabled={loading || status === 'inactive'}
            onClick={() => handleStatusChange('inactive')}
          >
            Deactivate
          </Button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {loading && <p className="text-xs text-gray-400">Updating...</p>}
      </CardContent>
    </Card>
  )
}
