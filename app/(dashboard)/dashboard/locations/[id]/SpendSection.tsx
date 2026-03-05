'use client'

import { useState } from 'react'
import { SpendEntryForm } from './SpendEntryForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'

interface SpendRecord {
  id: string
  platform: string
  spend_date: string
  spend: number | null
  clicks: number | null
  impressions: number | null
}

interface SpendSectionProps {
  locationId: string
  initialRecords: SpendRecord[]
}

export function SpendSection({ locationId, initialRecords }: SpendSectionProps) {
  const [records, setRecords] = useState<SpendRecord[]>(initialRecords)

  async function refreshRecords() {
    try {
      const res = await fetch(`/api/locations/${locationId}/spend`)
      if (res.ok) {
        const data = (await res.json()) as SpendRecord[]
        setRecords(data)
      }
    } catch {
      // ignore
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Spend Entry</CardTitle>
        <p className="text-sm text-gray-500">
          Log ad spend before platform API integrations are live. Data flows into analytics automatically.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <SpendEntryForm locationId={locationId} onSuccess={refreshRecords} />

        {records.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Date</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Platform</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Spend</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Clicks</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Impressions</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="py-2 px-3">
                      {format(new Date(r.spend_date + 'T00:00:00'), 'MMM d, yyyy')}
                    </td>
                    <td className="py-2 px-3 capitalize">{r.platform}</td>
                    <td className="py-2 px-3">${(r.spend ?? 0).toFixed(2)}</td>
                    <td className="py-2 px-3">{r.clicks?.toLocaleString() ?? '—'}</td>
                    <td className="py-2 px-3">{r.impressions?.toLocaleString() ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {records.length === 0 && (
          <p className="text-sm text-gray-400">No spend entries yet for this location.</p>
        )}
      </CardContent>
    </Card>
  )
}
