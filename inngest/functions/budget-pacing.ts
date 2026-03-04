import { inngest } from '../client'
import { supabaseAdmin } from '@/lib/supabase'
import { format, getDaysInMonth } from 'date-fns'

const MIN_DAILY_BUDGET = 5

export const budgetPacing = inngest.createFunction(
  { id: 'budget-pacing', name: 'Budget Pacing Check' },
  { cron: '0 */4 * * *' },
  async ({ step }) => {
    if (
      process.env.FEATURE_GOOGLE_ADS !== 'true' &&
      process.env.FEATURE_META_ADS !== 'true'
    ) {
      return { skipped: true, reason: 'Ad feature flags disabled' }
    }

    const now = new Date()
    const daysInMonth = getDaysInMonth(now)
    const daysElapsed = now.getDate()
    const currentMonth = format(now, 'yyyy-MM-01')

    const { data: allocations } = await supabaseAdmin
      .from('budget_allocations')
      .select('*')
      .eq('month', currentMonth)

    if (!allocations?.length) return { checked: 0 }

    let adjusted = 0

    for (const allocation of allocations) {
      await step.run(`pace-${allocation.id}`, async () => {
        if (!allocation.monthly_budget || !allocation.current_daily_budget) {
          return { skipped: true }
        }

        const { data: spendRecords } = await supabaseAdmin
          .from('spend_records')
          .select('spend')
          .eq('location_id', allocation.location_id)
          .eq('platform', allocation.platform)
          .gte('spend_date', currentMonth)

        const actualSpend = spendRecords?.reduce((s, r) => s + (r.spend ?? 0), 0) ?? 0
        const expectedSpend = (daysElapsed / daysInMonth) * (allocation.monthly_budget ?? 0)

        let newDailyBudget = allocation.current_daily_budget

        if (actualSpend > expectedSpend * 1.15) {
          newDailyBudget = Math.max(MIN_DAILY_BUDGET, newDailyBudget * 0.9)
        } else if (actualSpend < expectedSpend * 0.85) {
          newDailyBudget = newDailyBudget * 1.1
        }

        if (Math.abs(newDailyBudget - allocation.current_daily_budget) > 0.01) {
          await supabaseAdmin
            .from('budget_allocations')
            .update({ current_daily_budget: newDailyBudget })
            .eq('id', allocation.id)

          adjusted++
          return {
            adjusted: true,
            old: allocation.current_daily_budget,
            new: newDailyBudget,
            actualSpend,
            expectedSpend,
          }
        }

        return { adjusted: false }
      })
    }

    return { checked: allocations.length, adjusted }
  }
)
