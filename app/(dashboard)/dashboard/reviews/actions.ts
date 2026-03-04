'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { replyToReview } from '@/lib/gbp'
import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'

export async function approveReview(reviewId: string, response: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const { data: review, error } = await supabaseAdmin
    .from('review_responses')
    .select('*')
    .eq('id', reviewId)
    .single()

  if (error || !review) throw new Error('Review not found')

  // Get GBP profile to get account/location IDs
  const { data: profile } = await supabaseAdmin
    .from('gbp_profiles')
    .select('account_id, gbp_location_id')
    .eq('id', review.gbp_profile_id)
    .single()

  if (profile?.account_id && profile?.gbp_location_id) {
    await replyToReview(profile.account_id, profile.gbp_location_id, review.review_id, response)
  }

  await supabaseAdmin
    .from('review_responses')
    .update({
      final_response: response,
      status: 'published',
    })
    .eq('id', reviewId)

  revalidatePath('/dashboard/reviews')
}

export async function skipReview(reviewId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  await supabaseAdmin
    .from('review_responses')
    .update({ status: 'skipped' })
    .eq('id', reviewId)

  revalidatePath('/dashboard/reviews')
}
