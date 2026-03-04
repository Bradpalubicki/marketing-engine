import { supabaseAdmin } from './supabase'
import type { AttributionRecord } from '@/types'

export async function createAttributionRecord(
  leadId: string,
  locationId: string,
  platform: string | null,
  campaignId: string | null
): Promise<AttributionRecord | null> {
  const { data, error } = await supabaseAdmin
    .from('attribution_records')
    .insert({
      lead_id: leadId,
      location_id: locationId,
      platform,
      campaign_id: campaignId,
      lead_created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating attribution record:', error)
    return null
  }

  return data as AttributionRecord
}

export async function updateAttributionRecord(
  leadId: string,
  updates: Partial<{
    contacted_at: string
    booked_at: string
    showed_at: string
    revenue: number
  }>
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('attribution_records')
    .update(updates)
    .eq('lead_id', leadId)

  if (error) {
    console.error('Error updating attribution record:', error)
  }
}

export async function calculateCPL(
  locationId: string,
  dateRange: { start: string; end: string }
): Promise<number> {
  const { data: leads, error: leadsError } = await supabaseAdmin
    .from('leads')
    .select('id')
    .eq('location_id', locationId)
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end)

  const { data: spend, error: spendError } = await supabaseAdmin
    .from('spend_records')
    .select('spend')
    .eq('location_id', locationId)
    .gte('spend_date', dateRange.start)
    .lte('spend_date', dateRange.end)

  if (leadsError || spendError || !leads || !spend) return 0

  const totalLeads = leads.length
  const totalSpend = spend.reduce((sum, r) => sum + (r.spend ?? 0), 0)

  if (totalLeads === 0) return 0
  return totalSpend / totalLeads
}

export async function calculateRoas(
  locationId: string,
  dateRange: { start: string; end: string }
): Promise<number> {
  const { data: attribution, error: attrError } = await supabaseAdmin
    .from('attribution_records')
    .select('revenue')
    .eq('location_id', locationId)
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end)

  const { data: spend, error: spendError } = await supabaseAdmin
    .from('spend_records')
    .select('spend')
    .eq('location_id', locationId)
    .gte('spend_date', dateRange.start)
    .lte('spend_date', dateRange.end)

  if (attrError || spendError || !attribution || !spend) return 0

  const totalRevenue = attribution.reduce((sum, r) => sum + (r.revenue ?? 0), 0)
  const totalSpend = spend.reduce((sum, r) => sum + (r.spend ?? 0), 0)

  if (totalSpend === 0) return 0
  return totalRevenue / totalSpend
}
