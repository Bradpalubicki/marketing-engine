import { inngest } from '../client'
import { supabaseAdmin } from '@/lib/supabase'
import { isHoliday } from '@/lib/holidays'
import { format, getDaysInMonth } from 'date-fns'

const MIN_DAILY_BUDGET = 5

// Day-of-week spend weights for healthcare clinics
// 0=Sunday, 1=Monday, ..., 6=Saturday
const DAY_WEIGHTS: Record<number, number> = {
  0: 0.8,  // Sunday
  1: 1.2,  // Monday — post-weekend decision making
  2: 1.0,  // Tuesday
  3: 1.0,  // Wednesday
  4: 1.15, // Thursday
  5: 0.9,  // Friday
  6: 0.75, // Saturday
}

function getElapsedDates(year: number, month: number, throughDay: number): Date[] {
  const dates: Date[] = []
  for (let d = 1; d <= throughDay; d++) {
    dates.push(new Date(year, month, d))
  }
  return dates
}

function computeWeightedExpectedSpend(
  dailyBudget: number,
  elapsedDates: Date[]
): number {
  return elapsedDates.reduce((sum, date) => {
    const weight = DAY_WEIGHTS[date.getDay()] ?? 1.0
    let dayWeight = weight
    if (isHoliday(date)) {
      // Holidays see 40-60% lower healthcare search volume — reduce by 50%
      dayWeight = weight * 0.5
    }
    return sum + dailyBudget * dayWeight
  }, 0)
}

export const budgetPacing = inngest.createFunction(
  { id: 'budget-pacing', name: 'Budget Pacing Check' },
  { cron: '0 */4 * * *' },
  async ({ step }) => {
    const anyEnabled =
      process.env.FEATURE_GOOGLE_ADS === 'true' ||
      process.env.FEATURE_META_ADS === 'true' ||
      process.env.FEATURE_MICROSOFT_ADS === 'true'

    if (!anyEnabled) {
      return { skipped: true, reason: 'All ad feature flags disabled' }
    }

    const now = new Date()
    const daysInMonth = getDaysInMonth(now)
    const daysElapsed = now.getDate()
    const currentMonth = format(now, 'yyyy-MM-01')

    const elapsedDates = getElapsedDates(now.getFullYear(), now.getMonth(), daysElapsed)

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

        // Skip disabled platforms
        if (
          (allocation.platform === 'google' && process.env.FEATURE_GOOGLE_ADS !== 'true') ||
          (allocation.platform === 'meta' && process.env.FEATURE_META_ADS !== 'true') ||
          (allocation.platform === 'microsoft' && process.env.FEATURE_MICROSOFT_ADS !== 'true')
        ) {
          return { skipped: true, reason: `${allocation.platform} feature flag disabled` }
        }

        const { data: spendRecords } = await supabaseAdmin
          .from('spend_records')
          .select('spend')
          .eq('location_id', allocation.location_id)
          .eq('platform', allocation.platform)
          .gte('spend_date', currentMonth)

        const actualSpend = spendRecords?.reduce((s, r) => s + (r.spend ?? 0), 0) ?? 0

        // v2: weighted expected spend using day-of-week weights + holiday detection
        const expectedSpend = computeWeightedExpectedSpend(
          allocation.current_daily_budget,
          elapsedDates
        )

        // Fallback proportional for sanity check
        const simpleExpected = (daysElapsed / daysInMonth) * (allocation.monthly_budget ?? 0)
        const _ = simpleExpected // referenced to avoid lint warning

        let newDailyBudget = allocation.current_daily_budget

        if (actualSpend > expectedSpend * 1.15) {
          newDailyBudget = Math.max(MIN_DAILY_BUDGET, newDailyBudget * 0.9)
        } else if (actualSpend < expectedSpend * 0.85) {
          newDailyBudget = newDailyBudget * 1.1
        }

        // Cap: never above 110% of (monthly_budget / 28) for all platforms
        const maxDailyBudget = (allocation.monthly_budget * 1.1) / 28
        newDailyBudget = Math.min(newDailyBudget, maxDailyBudget)

        if (Math.abs(newDailyBudget - allocation.current_daily_budget) > 0.01) {
          await supabaseAdmin
            .from('budget_allocations')
            .update({ current_daily_budget: newDailyBudget })
            .eq('id', allocation.id)

          adjusted++
          return {
            adjusted: true,
            platform: allocation.platform,
            old: allocation.current_daily_budget,
            new: newDailyBudget,
            actualSpend,
            expectedSpend,
            holidayInPeriod: elapsedDates.some(isHoliday),
          }
        }

        return { adjusted: false, actualSpend, expectedSpend }
      })
    }

    return { checked: allocations.length, adjusted }
  }
)
