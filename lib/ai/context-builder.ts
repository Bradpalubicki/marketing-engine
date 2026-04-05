// SEM Bible — Ch 50: Prompt Enrichment Architecture
// Injects structured context into Claude API calls for escalation handler (Ch 43)

import { supabaseAdmin } from '@/lib/supabase'

export type ContextType = 'campaign_review' | 'budget_optimization' | 'copy_generation' | 'escalation'

export interface EnrichmentContext {
  orgId: string
  contextType: ContextType
}

/**
 * Builds structured context string for injection into Claude API calls.
 * Sources: last 7-day snapshots, 30-day competitive, top 20 search terms,
 * seasonal benchmarks for current month, top/bottom 5 copy variants.
 */
export async function buildPromptContext(input: EnrichmentContext): Promise<string> {
  const { orgId, contextType } = input
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const sections: string[] = []

  // 1. Last 7-day performance snapshots
  const { data: snapshots } = await supabaseAdmin
    .from('sem_platform_daily_snapshots')
    .select('snapshot_date, platform, impressions, clicks, conversions, cost_micros')
    .eq('org_id', orgId)
    .gte('snapshot_date', sevenDaysAgo)
    .order('snapshot_date', { ascending: false })

  if (snapshots && snapshots.length > 0) {
    const totalCost = snapshots.reduce((sum, s) => sum + (s.cost_micros ?? 0) / 1_000_000, 0)
    const totalConversions = snapshots.reduce((sum, s) => sum + (s.conversions ?? 0), 0)
    const totalClicks = snapshots.reduce((sum, s) => sum + (s.clicks ?? 0), 0)
    const cpa = totalConversions > 0 ? (totalCost / totalConversions).toFixed(2) : 'N/A'

    sections.push(
      `## Performance (Last 7 Days)\n` +
      `- Total Spend: $${totalCost.toFixed(2)}\n` +
      `- Clicks: ${totalClicks}\n` +
      `- Conversions: ${totalConversions}\n` +
      `- CPA: $${cpa}`
    )
  }

  // 2. Competitive snapshots (last 30 days)
  const { data: competitive } = await supabaseAdmin
    .from('sem_competitive_snapshots')
    .select('snapshot_date, competitor_domain, impression_share, overlap_rate, outranking_share')
    .eq('org_id', orgId)
    .gte('snapshot_date', thirtyDaysAgo)
    .order('snapshot_date', { ascending: false })
    .limit(5)

  if (competitive && competitive.length > 0) {
    const compLines = competitive
      .filter((c) => c.competitor_domain)
      .map(
        (c) =>
          `- ${c.competitor_domain}: IS ${((c.impression_share ?? 0) * 100).toFixed(1)}%, overlap ${((c.overlap_rate ?? 0) * 100).toFixed(1)}%`
      )
      .join('\n')

    if (compLines) {
      sections.push(`## Competitive Intelligence (Last 30 Days)\n${compLines}`)
    }
  }

  // 3. Top 20 search terms by spend
  const { data: searchTerms } = await supabaseAdmin
    .from('sem_search_term_log')
    .select('search_term, clicks, conversions, cost, ctr')
    .eq('org_id', orgId)
    .order('cost', { ascending: false })
    .limit(20)

  if (searchTerms && searchTerms.length > 0) {
    const termLines = searchTerms
      .map(
        (t) =>
          `- "${t.search_term}": ${t.clicks} clicks, ${t.conversions} conv, $${(t.cost ?? 0).toFixed(2)}`
      )
      .join('\n')

    sections.push(`## Top Search Terms (by Spend)\n${termLines}`)
  }

  // 4. Seasonal benchmarks for current vertical + month
  const { data: profile } = await supabaseAdmin
    .from('sem_client_compliance_profiles')
    .select('vertical')
    .eq('org_id', orgId)
    .single()

  const vertical = profile?.vertical ?? 'healthcare'

  const { data: benchmarks } = await supabaseAdmin
    .from('sem_seasonal_benchmarks')
    .select('metric, benchmark_value')
    .eq('vertical', vertical)
    .eq('month', currentMonth)

  if (benchmarks && benchmarks.length > 0) {
    const benchmarkLines = benchmarks
      .map((b) => `- ${b.metric.toUpperCase()}: ${b.benchmark_value}`)
      .join('\n')

    sections.push(`## Seasonal Benchmarks (${vertical}, Month ${currentMonth})\n${benchmarkLines}`)
  }

  // 5. Top 5 and bottom 5 copy variants
  const { data: topCopy } = await supabaseAdmin
    .from('sem_copy_performance_log')
    .select('headline, ctr, cvr, test_result')
    .eq('org_id', orgId)
    .eq('test_result', 'WINNER')
    .order('ctr', { ascending: false })
    .limit(5)

  const { data: bottomCopy } = await supabaseAdmin
    .from('sem_copy_performance_log')
    .select('headline, ctr, cvr, test_result')
    .eq('org_id', orgId)
    .eq('test_result', 'LOSER')
    .order('ctr', { ascending: true })
    .limit(5)

  if ((topCopy && topCopy.length > 0) || (bottomCopy && bottomCopy.length > 0)) {
    const copySection: string[] = ['## Copy Performance']
    if (topCopy && topCopy.length > 0) {
      copySection.push('**Top Performers:**')
      topCopy.forEach((c) => copySection.push(`- "${c.headline}" CTR: ${((c.ctr ?? 0) * 100).toFixed(2)}%`))
    }
    if (bottomCopy && bottomCopy.length > 0) {
      copySection.push('**Bottom Performers:**')
      bottomCopy.forEach((c) => copySection.push(`- "${c.headline}" CTR: ${((c.ctr ?? 0) * 100).toFixed(2)}%`))
    }
    sections.push(copySection.join('\n'))
  }

  const context = sections.join('\n\n')

  // Ensure non-empty — return placeholder if no data yet
  if (!context.trim()) {
    return `## Context\nNo performance data available yet for org ${orgId}. Context type: ${contextType}.`
  }

  return `# SEM Performance Context\nOrg: ${orgId} | Context: ${contextType} | Generated: ${now.toISOString()}\n\n${context}`
}
