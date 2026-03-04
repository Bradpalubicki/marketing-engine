import { inngest } from '../client'
import { supabaseAdmin } from '@/lib/supabase'
import { generatePerformanceInsights } from '@/lib/ad-copy-generator'
import { format, subDays } from 'date-fns'

export const aiInsights = inngest.createFunction(
  { id: 'ai-insights', name: 'Weekly AI Performance Insights' },
  { cron: '0 0 * * 0' },
  async ({ step }) => {
    const weekEnd = format(new Date(), 'yyyy-MM-dd')
    const weekStart = format(subDays(new Date(), 7), 'yyyy-MM-dd')

    const { data: locations } = await supabaseAdmin
      .from('locations')
      .select('id, name, city, state')
      .eq('status', 'active')

    if (!locations?.length) return { processed: 0 }

    const locationData: Record<string, unknown>[] = []

    await step.run('gather-performance-data', async () => {
      for (const location of locations) {
        const { data: leads } = await supabaseAdmin
          .from('leads')
          .select('status, source, created_at')
          .eq('location_id', location.id)
          .gte('created_at', weekStart)
          .lte('created_at', weekEnd + 'T23:59:59Z')

        const { data: spend } = await supabaseAdmin
          .from('spend_records')
          .select('spend, platform, clicks')
          .eq('location_id', location.id)
          .gte('spend_date', weekStart)
          .lte('spend_date', weekEnd)

        const totalLeads = leads?.length ?? 0
        const booked = leads?.filter(l => l.status === 'booked' || l.status === 'showed').length ?? 0
        const totalSpend = spend?.reduce((s, r) => s + (r.spend ?? 0), 0) ?? 0

        locationData.push({
          location: `${location.name}, ${location.city} ${location.state}`,
          totalLeads,
          bookedLeads: booked,
          bookingRate: totalLeads > 0 ? `${Math.round((booked / totalLeads) * 100)}%` : '0%',
          totalSpend: `$${totalSpend.toFixed(2)}`,
          cpl: totalLeads > 0 ? `$${(totalSpend / totalLeads).toFixed(2)}` : 'N/A',
        })
      }

      return { gathered: locationData.length }
    })

    const insights = await step.run('generate-ai-insights', async () => {
      return generatePerformanceInsights(locationData)
    })

    await step.run('save-insights', async () => {
      const { data: orgs } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .limit(1)

      if (orgs?.length) {
        await supabaseAdmin.from('gbp_posts').insert({
          gbp_profile_id: null,
          type: 'STANDARD',
          summary: `Weekly Insights (${weekStart} to ${weekEnd}):\n\n${insights}`,
          status: 'draft',
        })
      }

      return { saved: true }
    })

    return { weekStart, weekEnd, locations: locationData.length, insights }
  }
)
