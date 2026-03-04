import { inngest } from '../client'
import { supabaseAdmin } from '@/lib/supabase'
import { generateGBPPosts } from '@/lib/ad-copy-generator'
import { createPost } from '@/lib/gbp'

export const gbpPosts = inngest.createFunction(
  { id: 'gbp-posts', name: 'GBP Weekly Post Generation' },
  { cron: '0 9 * * 1' },
  async ({ step }) => {
    const { data: locations } = await supabaseAdmin
      .from('locations')
      .select('id, name, city, gbp_location_id')
      .eq('status', 'active')
      .not('gbp_location_id', 'is', null)

    if (!locations?.length) return { generated: 0 }

    let generated = 0

    for (const location of locations) {
      await step.run(`posts-${location.id}`, async () => {
        try {
          const { data: profile } = await supabaseAdmin
            .from('gbp_profiles')
            .select('id, account_id, gbp_location_id')
            .eq('location_id', location.id)
            .single()

          if (!profile) return { skipped: true, reason: 'No GBP profile' }

          const posts = await generateGBPPosts(location.name, location.city)

          const scheduledDate = new Date()
          scheduledDate.setDate(scheduledDate.getDate() + 1)

          const insertedPosts = posts.map((post, i) => ({
            gbp_profile_id: profile.id,
            type: post.type,
            summary: post.summary,
            call_to_action_type: post.callToActionType,
            scheduled_at: new Date(scheduledDate.getTime() + i * 2 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'scheduled',
          }))

          const { data: dbPosts } = await supabaseAdmin
            .from('gbp_posts')
            .insert(insertedPosts)
            .select()

          generated += posts.length

          // Publish each post to GBP API if we have credentials
          if (profile.account_id && profile.gbp_location_id && dbPosts) {
            for (let i = 0; i < dbPosts.length; i++) {
              const dbPost = dbPosts[i]
              const postData = posts[i]

              await step.sleep(`rate-limit-${location.id}-${i}`, '6s')

              try {
                await createPost(profile.account_id, profile.gbp_location_id, {
                  summary: postData.summary,
                  callToActionType: postData.callToActionType,
                  topicType: postData.type,
                })

                await supabaseAdmin
                  .from('gbp_posts')
                  .update({ status: 'published', published_at: new Date().toISOString() })
                  .eq('id', dbPost.id)
              } catch (publishErr) {
                await supabaseAdmin
                  .from('gbp_posts')
                  .update({ status: 'failed' })
                  .eq('id', dbPost.id)
              }
            }
          }

          return { posts: posts.length, locationId: location.id }
        } catch (err) {
          return { error: String(err), locationId: location.id }
        }
      })
    }

    return { generated }
  }
)
