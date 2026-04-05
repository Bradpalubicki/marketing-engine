'use client'

interface PesScoreBadgeProps {
  pesScore: number | null
  campaignStartDate: string | null // ISO date string
}

/**
 * PES Score Badge — shows score if campaign is >= 60 days old.
 * Per spec: if campaign history < 60 days, show baseline period message instead.
 */
export function PesScoreBadge({ pesScore, campaignStartDate }: PesScoreBadgeProps) {
  const daysElapsed = campaignStartDate
    ? Math.floor((Date.now() - new Date(campaignStartDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const baselinePeriod = daysElapsed < 60

  if (baselinePeriod) {
    const daysRemaining = 60 - daysElapsed
    return (
      <span
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600 border border-gray-200"
        title={`PES available after 60 days of campaign history. ${daysElapsed} days elapsed.`}
      >
        <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
        Baseline Period — PES available at Day {daysRemaining > 0 ? `${daysElapsed + daysRemaining - daysElapsed}` : '60'}
        {daysElapsed > 0 && (
          <span className="text-gray-400 font-normal ml-0.5">({daysRemaining} days)</span>
        )}
      </span>
    )
  }

  if (pesScore === null) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-500">
        PES: —
      </span>
    )
  }

  const color =
    pesScore >= 75
      ? 'bg-green-100 text-green-800 border-green-200'
      : pesScore >= 55
        ? 'bg-amber-100 text-amber-800 border-amber-200'
        : 'bg-red-100 text-red-800 border-red-200'

  const dot =
    pesScore >= 75
      ? 'bg-green-500'
      : pesScore >= 55
        ? 'bg-amber-500'
        : 'bg-red-500'

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${color}`}
      title={`Platform Efficiency Score: ${pesScore}/100`}
    >
      <span className={`w-2 h-2 rounded-full ${dot} inline-block`} />
      PES: {pesScore}
    </span>
  )
}
