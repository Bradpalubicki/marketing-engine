import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { format, subDays } from 'date-fns'
import { z } from 'zod'

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  location: z.string().uuid().optional(),
})

function escapeCsv(val: string | null | undefined): string {
  if (val == null) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sp = request.nextUrl.searchParams
  const parsed = querySchema.safeParse({
    from: sp.get('from') ?? undefined,
    to: sp.get('to') ?? undefined,
    location: sp.get('location') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query params' }, { status: 400 })
  }

  const from = parsed.data.from ?? format(subDays(new Date(), 30), 'yyyy-MM-dd')
  const to = parsed.data.to ?? format(new Date(), 'yyyy-MM-dd')

  let query = supabaseAdmin
    .from('leads')
    .select('created_at, first_name, last_name, source, status, utm_source, utm_campaign, gclid')
    .gte('created_at', from + 'T00:00:00Z')
    .lte('created_at', to + 'T23:59:59Z')
    .order('created_at', { ascending: false })

  if (parsed.data.location) {
    query = query.eq('location_id', parsed.data.location)
  }

  const { data: leads, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }

  const rows = leads ?? []
  const header = ['created_at', 'first_name', 'last_name', 'source', 'status', 'utm_source', 'utm_campaign', 'gclid']
  const csv = [
    header.join(','),
    ...rows.map(r =>
      [
        escapeCsv(r.created_at),
        escapeCsv(r.first_name),
        escapeCsv(r.last_name),
        escapeCsv(r.source),
        escapeCsv(r.status),
        escapeCsv(r.utm_source),
        escapeCsv(r.utm_campaign),
        escapeCsv(r.gclid),
      ].join(',')
    ),
  ].join('\n')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="leads-${from}-${to}.csv"`,
    },
  })
}
