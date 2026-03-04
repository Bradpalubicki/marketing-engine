import { inngest } from '../client'
import { supabaseAdmin } from '@/lib/supabase'
import { fetchReviews } from '@/lib/gbp'
import { generateReviewResponse } from '@/lib/ad-copy-generator'

export const gbpReviews = inngest.createFunction(
  { id: 'gbp-reviews', name: 'GBP Review Fetch & AI Draft' },
  { cron: '0 */4 * * *' },
  async ({ step }) => {
    const { data: profiles } = await supabaseAdmin
      .from('gbp_profiles')
      .select('id, location_id, gbp_location_id, account_id')
      .not('gbp_location_id', 'is', null)

    if (!profiles?.length) return { processed: 0 }

    let processed = 0

    for (const profile of profiles) {
      await step.run(`reviews-${profile.id}`, async () => {
        try {
          const reviews = await fetchReviews(
            profile.account_id ?? process.env.GBP_AGENCY_ACCOUNT_EMAIL ?? '',
            profile.gbp_location_id!
          )

          for (const review of reviews) {
            const { data: existing } = await supabaseAdmin
              .from('review_responses')
              .select('id')
              .eq('review_id', review.reviewId)
              .single()

            if (existing) continue

            const starRating = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }[review.starRating] ?? 3

            let aiDraft = ''
            try {
              const { response } = await generateReviewResponse(
                review.reviewer.displayName,
                starRating,
                review.comment ?? ''
              )
              aiDraft = response
            } catch {
              aiDraft = `Thank you for your feedback, ${review.reviewer.displayName}. We appreciate you taking the time to share your experience.`
            }

            await supabaseAdmin.from('review_responses').insert({
              gbp_profile_id: profile.id,
              review_id: review.reviewId,
              reviewer_name: review.reviewer.displayName,
              rating: starRating,
              review_text: review.comment,
              ai_draft_response: aiDraft,
              status: 'pending',
            })

            processed++
          }

          await supabaseAdmin
            .from('gbp_profiles')
            .update({ review_count: reviews.length, last_synced_at: new Date().toISOString() })
            .eq('id', profile.id)

          return { reviews: reviews.length, profileId: profile.id }
        } catch (err) {
          return { error: String(err), profileId: profile.id }
        }
      })
    }

    return { processed }
  }
)
