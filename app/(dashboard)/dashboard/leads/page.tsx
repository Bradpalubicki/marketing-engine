import { supabaseAdmin } from '@/lib/supabase'
import { LeadTable } from '@/components/dashboard/LeadTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Lead } from '@/types'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ location?: string; status?: string; source?: string }>
}

export default async function LeadsPage({ searchParams }: PageProps) {
  const params = await searchParams

  let query = supabaseAdmin
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (params.location) {
    query = query.eq('location_id', params.location)
  }
  if (params.status) {
    query = query.eq('status', params.status)
  }
  if (params.source) {
    query = query.eq('source', params.source)
  }

  const { data } = await query
  const leads = (data ?? []) as Lead[]

  const statusCounts = {
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    booked: leads.filter(l => l.status === 'booked').length,
    showed: leads.filter(l => l.status === 'showed').length,
    no_showed: leads.filter(l => l.status === 'no_showed').length,
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <p className="text-gray-500 mt-1">{leads.length} leads found</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        {Object.entries(statusCounts).map(([status, count]) => (
          <div key={status} className="bg-white border border-gray-100 rounded-lg px-4 py-2 text-sm">
            <span className="font-medium capitalize">{status.replace('_', ' ')}</span>
            <span className="ml-2 text-gray-400">{count}</span>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lead Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <LeadTable leads={leads} />
        </CardContent>
      </Card>
    </div>
  )
}
