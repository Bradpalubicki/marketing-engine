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
  ],
})
