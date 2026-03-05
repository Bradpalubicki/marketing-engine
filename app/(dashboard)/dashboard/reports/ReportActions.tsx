'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import { sendWeeklyReport, toggleWeeklyReport } from './actions'

interface Location {
  id: string
  name: string
  weekly_report_enabled: boolean | null
}

export function SendReportButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null)

  async function handleSend() {
    setLoading(true)
    setResult(null)
    try {
      const res = await sendWeeklyReport()
      setResult(res)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleSend} disabled={loading}>
        <Send className="h-4 w-4 mr-2" />
        {loading ? 'Sending...' : 'Send Weekly Report Now'}
      </Button>
      {result && (
        <p className={`text-sm ${result.success && !result.error ? 'text-green-600' : 'text-amber-600'}`}>
          {result.success && !result.error
            ? 'Report sent to all org admins'
            : result.error ?? 'Unknown result'}
        </p>
      )}
    </div>
  )
}

export function ReportScheduleRow({ location }: { location: Location }) {
  const [enabled, setEnabled] = useState(location.weekly_report_enabled !== false)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    const next = !enabled
    const res = await toggleWeeklyReport(location.id, next)
    if (res.success) setEnabled(next)
    setLoading(false)
  }

  return (
    <tr className="border-b border-gray-50">
      <td className="py-3 px-4 font-medium">{location.name}</td>
      <td className="py-3 px-4">
        <button
          onClick={toggle}
          disabled={loading}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
            enabled ? 'bg-blue-600' : 'bg-gray-200'
          } ${loading ? 'opacity-50' : ''}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </td>
      <td className="py-3 px-4 text-sm text-gray-500">
        {enabled ? 'Every Monday 8am' : 'Paused'}
      </td>
    </tr>
  )
}

// Named exports: SendReportButton, ReportScheduleRow
