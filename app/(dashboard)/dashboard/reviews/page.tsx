import { supabaseAdmin } from '@/lib/supabase'
import { ReviewQueue } from '@/components/dashboard/ReviewQueue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ReviewResponse } from '@/types'

export const dynamic = 'force-dynamic'

export default async function ReviewsPage() {
  const { data } = await supabaseAdmin
    .from('review_responses')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50)

  const reviews = (data ?? []) as ReviewResponse[]

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Review Queue</h1>
        <p className="text-gray-500 mt-1">{reviews.length} pending reviews with AI draft responses</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <ReviewQueue reviews={reviews} />
        </CardContent>
      </Card>
    </div>
  )
}
