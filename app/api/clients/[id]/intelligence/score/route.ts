// GET /api/clients/[id]/intelligence/score — lightweight completeness score only

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { calculateCompleteness } from '@/lib/completeness'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data, error } = await supabase
    .from('client_intelligence')
    .select('*')
    .eq('organization_id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ score: 0, can_launch: false, smart_bidding_eligible: false, missing_high_priority: [] })

  const { score, can_launch, smart_bidding_eligible, missing_high_priority } = calculateCompleteness(data)
  return NextResponse.json({ score, can_launch, smart_bidding_eligible, missing_high_priority })
}
