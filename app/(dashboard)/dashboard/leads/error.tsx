'use client'

import { useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function LeadsError({ error, reset }: Props) {
  useEffect(() => {}, [error])

  return (
    <div className="p-8">
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-red-700 mb-2">Failed to load leads</h2>
          <p className="text-sm text-red-600 mb-4">{error.message || 'An unexpected error occurred.'}</p>
          <Button variant="outline" onClick={reset}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
