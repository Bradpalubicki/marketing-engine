'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MessageSquare } from 'lucide-react'
import { resendLeadSMS } from '../actions'

interface ResendSMSButtonProps {
  leadId: string
}

export function ResendSMSButton({ leadId }: ResendSMSButtonProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null)

  async function handleResend() {
    setLoading(true)
    setResult(null)
    try {
      const res = await resendLeadSMS(leadId)
      setResult(res)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleResend}
        disabled={loading}
        variant="outline"
        size="sm"
        className="flex items-center gap-1"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        {loading ? 'Sending...' : 'Resend SMS'}
      </Button>
      {result && (
        <p className={`text-xs ${result.success ? 'text-green-600' : 'text-red-600'}`}>
          {result.success ? 'SMS sent successfully' : result.error}
        </p>
      )}
    </div>
  )
}
