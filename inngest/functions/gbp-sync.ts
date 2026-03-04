import { inngest } from '../client'
import { supabaseAdmin } from '@/lib/supabase'
import { fetchProfile } from '@/lib/gbp'

export const gbpSync = inngest.createFunction(
  { id: 'gbp-sync', name: 'GBP Daily Sync' },
  { cron: '0 3 * * *' },
  async ({ step }) => {
    const { data: locations } = await supabaseAdmin
      .from('locations')
      .select('id, name, gbp_location_id')
      .eq('status', 'active')
      .not('gbp_location_id', 'is', null)

    if (!locations?.length) return { synced: 0 }

    let synced = 0

    for (const location of locations) {
      await step.run(`sync-${location.id}`, async () => {
        try {
          const accountId = process.env.GBP_AGENCY_ACCOUNT_EMAIL ?? ''
          const profile = await fetchProfile(accountId, location.gbp_location_id!)

          await supabaseAdmin
            .from('gbp_profiles')
            .upsert(
              {
                location_id: location.id,
                gbp_location_id: location.gbp_location_id,
                account_id: accountId,
                last_synced_at: new Date().toISOString(),
              },
              { onConflict: 'gbp_location_id' }
            )

          synced++
          return { synced: true, locationId: location.id, name: profile.name }
        } catch (err) {
          return { error: String(err), locationId: location.id }
        }
      })
    }

    return { synced }
  }
)
