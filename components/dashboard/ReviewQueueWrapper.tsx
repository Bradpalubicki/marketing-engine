'use client'

import { ReviewQueue } from './ReviewQueue'
import { approveReview, skipReview } from '@/app/(dashboard)/dashboard/reviews/actions'
import type { ReviewResponse } from '@/types'

export function ReviewQueueWrapper({ reviews }: { reviews: ReviewResponse[] }) {
  return (
    <ReviewQueue
      reviews={reviews}
      onApprove={async (id, response) => {
        await approveReview(id, response)
      }}
      onSkip={async (id) => {
        await skipReview(id)
      }}
    />
  )
}
