'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import type { Lead } from '@/types'

interface LeadTableProps {
  leads: Lead[]
}

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'secondary' | 'destructive' | 'outline'> = {
  new: 'default',
  contacted: 'warning',
  booked: 'success',
  showed: 'success',
  no_showed: 'destructive',
  disqualified: 'secondary',
}

const sourceLabels: Record<string, string> = {
  form: 'Form',
  call: 'Call',
  chat: 'Chat',
}

export function LeadTable({ leads }: LeadTableProps) {
  if (leads.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No leads found.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Phone</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Source</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Created</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="py-3 px-4">
                <Link href={`/dashboard/leads/${lead.id}`} className="text-blue-600 hover:underline">
                  {lead.first_name} {lead.last_name}
                </Link>
              </td>
              <td className="py-3 px-4 text-gray-600">{lead.phone ?? '—'}</td>
              <td className="py-3 px-4">
                <span className="text-gray-500">{sourceLabels[lead.source] ?? lead.source}</span>
              </td>
              <td className="py-3 px-4">
                <Badge variant={statusColors[lead.status] ?? 'secondary'}>
                  {lead.status}
                </Badge>
              </td>
              <td className="py-3 px-4 text-gray-500">
                {format(new Date(lead.created_at), 'MMM d, yyyy')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
