'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Link2, Loader2, CheckCircle } from 'lucide-react'

interface GBPLocation {
  accountId: string
  accountName: string
  locationId: string
  locationName: string
  locationResourceName: string
  city?: string
  state?: string
}

interface GBPLinkCardProps {
  locationId: string
  currentGbpLocationId: string | null
}

export function GBPLinkCard({ locationId, currentGbpLocationId }: GBPLinkCardProps) {
  const [gbpLocations, setGbpLocations] = useState<GBPLocation[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<string>(currentGbpLocationId ?? '')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLocations = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/gbp/accounts')
      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        throw new Error(body.error ?? 'Failed to load GBP locations')
      }
      const data = (await res.json()) as { locations: GBPLocation[] }
      setGbpLocations(data.locations)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/locations/${locationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gbp_location_id: selected }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Google Business Profile</CardTitle>
          {currentGbpLocationId ? (
            <Badge variant="success">Linked</Badge>
          ) : (
            <Badge variant="secondary">Not linked</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {currentGbpLocationId && !gbpLocations.length && (
          <p className="text-xs font-mono text-gray-500 bg-gray-50 rounded p-2 break-all">
            {currentGbpLocationId}
          </p>
        )}

        {gbpLocations.length > 0 ? (
          <div className="flex gap-2">
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select GBP location" />
              </SelectTrigger>
              <SelectContent>
                {gbpLocations.map((loc) => (
                  <SelectItem key={loc.locationResourceName} value={loc.locationResourceName}>
                    {loc.locationName}
                    {loc.city ? ` — ${loc.city}, ${loc.state}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleSave} disabled={saving || !selected}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <CheckCircle className="h-3.5 w-3.5" /> : 'Save'}
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLocations}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Loading locations...</>
            ) : (
              <><Link2 className="h-3.5 w-3.5 mr-2" />Load GBP Locations</>
            )}
          </Button>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}
        {saved && <p className="text-xs text-green-600">GBP location linked successfully.</p>}
      </CardContent>
    </Card>
  )
}
