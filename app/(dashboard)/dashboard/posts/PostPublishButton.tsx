'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { publishPostNow } from './actions'

interface Props {
  postId: string
  disabled?: boolean
}

export function PostPublishButton({ postId, disabled }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePublish() {
    setLoading(true)
    setError(null)
    try {
      await publishPostNow(postId)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Button
        size="sm"
        variant="outline"
        onClick={handlePublish}
        disabled={loading || disabled}
      >
        {loading ? 'Publishing...' : 'Publish Now'}
      </Button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
