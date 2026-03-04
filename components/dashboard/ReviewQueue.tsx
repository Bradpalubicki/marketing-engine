'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Star, Check, X, Edit2 } from 'lucide-react'
import type { ReviewResponse } from '@/types'

interface ReviewQueueProps {
  reviews: ReviewResponse[]
  onApprove?: (id: string, response: string) => Promise<void>
  onSkip?: (id: string) => Promise<void>
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  )
}

export function ReviewQueue({ reviews, onApprove, onSkip }: ReviewQueueProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editedResponses, setEditedResponses] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<string | null>(null)

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No pending reviews.
      </div>
    )
  }

  const getResponse = (review: ReviewResponse) =>
    editedResponses[review.id] ?? review.ai_draft_response ?? ''

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="border border-gray-100 rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-sm">{review.reviewer_name ?? 'Anonymous'}</p>
              <StarRating rating={review.rating ?? 0} />
            </div>
            <Badge variant="warning">pending</Badge>
          </div>

          {review.review_text && (
            <p className="text-sm text-gray-600 italic">&quot;{review.review_text}&quot;</p>
          )}

          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">AI Draft Response</p>
            {editingId === review.id ? (
              <Textarea
                value={getResponse(review)}
                onChange={(e) => setEditedResponses(prev => ({ ...prev, [review.id]: e.target.value }))}
                rows={4}
                className="text-sm"
              />
            ) : (
              <p className="text-sm text-gray-700 bg-gray-50 rounded p-3">{getResponse(review)}</p>
            )}
          </div>

          <div className="flex gap-2">
            {editingId === review.id ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingId(null)}
              >
                Done
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingId(review.id)}
              >
                <Edit2 className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
            )}
            <Button
              size="sm"
              disabled={loading === review.id}
              onClick={async () => {
                if (!onApprove) return
                setLoading(review.id)
                await onApprove(review.id, getResponse(review))
                setLoading(null)
              }}
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={loading === review.id}
              onClick={async () => {
                if (!onSkip) return
                setLoading(review.id)
                await onSkip(review.id)
                setLoading(null)
              }}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Skip
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
