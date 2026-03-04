import { inngest } from '../client'
import { supabaseAdmin } from '@/lib/supabase'
import { generateGBPPosts } from '@/lib/ad-copy-generator'

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
            .select('id')
            .eq('location_id', location.id)
            .single()

          if (!profile) return { skipped: true, reason: 'No GBP profile' }

          const posts = await generateGBPPosts(location.name, location.city)

          const scheduledDate = new Date()
          scheduledDate.setDate(scheduledDate.getDate() + 1)

          await supabaseAdmin.from('gbp_posts').insert(
            posts.map((post, i) => ({
              gbp_profile_id: profile.id,
              type: post.type,
              summary: post.summary,
              call_to_action_type: post.callToActionType,
              scheduled_at: new Date(scheduledDate.getTime() + i * 2 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'scheduled',
            }))
          )

          generated += posts.length
          return { posts: posts.length, locationId: location.id }
        } catch (err) {
          return { error: String(err), locationId: location.id }
        }
      })
    }

    return { generated }
  }
)
