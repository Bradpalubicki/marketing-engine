'use client'

import { Badge } from '@/components/ui/badge'
import type { Campaign } from '@/types'

interface CampaignTableProps {
  campaigns: Campaign[]
}

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'success',
  paused: 'warning',
  removed: 'destructive',
}

const platformLabels: Record<string, string> = {
  google: 'Google',
  meta: 'Meta',
}

export function CampaignTable({ campaigns }: CampaignTableProps) {
  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No campaigns found. Activate a location to create campaigns.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-3 px-4 font-medium text-gray-500">Campaign</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Platform</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Daily Budget</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => (
            <tr key={campaign.id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="py-3 px-4 font-medium">{campaign.name}</td>
              <td className="py-3 px-4 text-gray-600">{platformLabels[campaign.platform] ?? campaign.platform}</td>
              <td className="py-3 px-4 text-gray-600 capitalize">{campaign.type.replace('_', ' ')}</td>
              <td className="py-3 px-4">
                {campaign.daily_budget ? `$${campaign.daily_budget.toFixed(2)}` : '—'}
              </td>
              <td className="py-3 px-4">
                <Badge variant={statusColors[campaign.status] ?? 'secondary'}>
                  {campaign.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
