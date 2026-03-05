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
      .select('id, name, city, state, org_id')
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
          locationId: location.id,
          orgId: location.org_id,
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
      // Save one insight record per location
      const inserts = locationData.map(ld => ({
        org_id: (ld as { orgId: string }).orgId ?? null,
        location_id: (ld as { locationId: string }).locationId ?? null,
        week_start: weekStart,
        week_end: weekEnd,
        insights_text: insights,
        metrics: {
          totalLeads: (ld as { totalLeads: number }).totalLeads,
          bookedLeads: (ld as { bookedLeads: number }).bookedLeads,
          bookingRate: (ld as { bookingRate: string }).bookingRate,
          totalSpend: (ld as { totalSpend: string }).totalSpend,
          cpl: (ld as { cpl: string }).cpl,
        },
      }))

      if (inserts.length > 0) {
        await supabaseAdmin.from('ai_insights').insert(inserts)
      }

      return { saved: inserts.length }
    })

    return { weekStart, weekEnd, locations: locationData.length, insights }
  }
)
