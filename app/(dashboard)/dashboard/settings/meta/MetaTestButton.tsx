'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface TestResult {
  success: boolean
  id?: string
  name?: string
  error?: string
}

export function MetaTestButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)

  async function handleTest() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/meta/test')
      const data = (await res.json()) as TestResult
      setResult(data)
    } catch {
      setResult({ success: false, error: 'Network error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <Button onClick={handleTest} disabled={loading} variant="outline">
        {loading ? 'Testing...' : 'Test Connection'}
      </Button>
      {result && (
        <div
          className={`rounded-lg p-4 text-sm ${
            result.success
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {result.success ? (
            <p>
              Connected as <strong>{result.name}</strong> (ID: {result.id})
            </p>
          ) : (
            <p>Error: {result.error}</p>
          )}
        </div>
      )}
    </div>
  )
}
