'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { format, subDays, startOfMonth } from 'date-fns'

const PRESETS = [
  {
    label: 'Last 7 days',
    from: () => format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    to: () => format(new Date(), 'yyyy-MM-dd'),
  },
  {
    label: 'Last 30 days',
    from: () => format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: () => format(new Date(), 'yyyy-MM-dd'),
  },
  {
    label: 'Last 90 days',
    from: () => format(subDays(new Date(), 90), 'yyyy-MM-dd'),
    to: () => format(new Date(), 'yyyy-MM-dd'),
  },
  {
    label: 'This month',
    from: () => format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: () => format(new Date(), 'yyyy-MM-dd'),
  },
]

interface DateRangeBarProps {
  currentFrom: string
  currentTo: string
}

export function DateRangeBar({ currentFrom, currentTo }: DateRangeBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function applyPreset(from: string, to: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('from', from)
    params.set('to', to)
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-gray-500 mr-1">Range:</span>
      {PRESETS.map((preset) => {
        const pFrom = preset.from()
        const pTo = preset.to()
        const isActive = currentFrom === pFrom && currentTo === pTo
        return (
          <Button
            key={preset.label}
            size="sm"
            variant={isActive ? 'default' : 'outline'}
            onClick={() => applyPreset(pFrom, pTo)}
          >
            {preset.label}
          </Button>
        )
      })}
      <span className="text-xs text-gray-400 ml-2">
        {currentFrom} to {currentTo}
      </span>
    </div>
  )
}
