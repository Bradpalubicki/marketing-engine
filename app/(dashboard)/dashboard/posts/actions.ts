'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { createPost } from '@/lib/gbp'
import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'

export async function publishPostNow(postId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const { data: post, error } = await supabaseAdmin
    .from('gbp_posts')
    .select('*, gbp_profiles(account_id, gbp_location_id)')
    .eq('id', postId)
    .single()

  if (error || !post) throw new Error('Post not found')

  const profile = post.gbp_profiles as { account_id: string | null; gbp_location_id: string | null } | null

  if (!profile?.account_id || !profile?.gbp_location_id) {
    throw new Error('GBP profile missing account_id or gbp_location_id')
  }

  try {
    await createPost(profile.account_id, profile.gbp_location_id, {
      summary: post.summary ?? '',
      callToActionType: post.call_to_action_type ?? 'LEARN_MORE',
      topicType: post.type ?? 'STANDARD',
    })

    await supabaseAdmin
      .from('gbp_posts')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', postId)
  } catch (err) {
    await supabaseAdmin
      .from('gbp_posts')
      .update({ status: 'failed' })
      .eq('id', postId)
    throw new Error(`Publish failed: ${String(err)}`)
  }

  revalidatePath('/dashboard/posts')
}
