import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { leadNurture } from '@/inngest/functions/lead-nurture'
import { campaignFactory } from '@/inngest/functions/campaign-factory'
import { gbpSync } from '@/inngest/functions/gbp-sync'
import { gbpReviews } from '@/inngest/functions/gbp-reviews'
import { gbpPosts } from '@/inngest/functions/gbp-posts'
import { budgetPacing } from '@/inngest/functions/budget-pacing'
import { offlineConversions } from '@/inngest/functions/offline-conversions'
import { aiInsights } from '@/inngest/functions/ai-insights'
import { spendReporting } from '@/inngest/functions/spend-reporting'
import { expectationDocJob } from '@/inngest/functions/expectation-doc'
import { weeklyReportEmail } from '@/inngest/functions/weekly-report-email'
import { pesAlert } from '@/inngest/functions/pes-alert'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    leadNurture,
    campaignFactory,
    gbpSync,
    gbpReviews,
    gbpPosts,
    budgetPacing,
    offlineConversions,
    aiInsights,
    spendReporting,
    expectationDocJob,
    weeklyReportEmail,
    pesAlert,
  ],
})
