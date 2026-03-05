'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState } from 'react'

const spendSchema = z.object({
  platform: z.enum(['google', 'meta', 'microsoft']),
  spend_date: z.string().min(1, 'Date is required'),
  spend: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid dollar amount'),
  clicks: z.string().regex(/^\d+$/, 'Enter a whole number').optional().or(z.literal('')),
  impressions: z.string().regex(/^\d+$/, 'Enter a whole number').optional().or(z.literal('')),
})

type SpendFormData = z.infer<typeof spendSchema>

interface SpendEntryFormProps {
  locationId: string
  onSuccess: () => void
}

export function SpendEntryForm({ locationId, onSuccess }: SpendEntryFormProps) {
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SpendFormData>({
    resolver: zodResolver(spendSchema),
    defaultValues: {
      spend_date: new Date().toISOString().slice(0, 10),
    },
  })

  const onSubmit = async (data: SpendFormData) => {
    setError(null)
    try {
      const res = await fetch(`/api/locations/${locationId}/spend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: data.platform,
          spend_date: data.spend_date,
          spend: parseFloat(data.spend),
          clicks: data.clicks && data.clicks !== '' ? parseInt(data.clicks, 10) : null,
          impressions: data.impressions && data.impressions !== '' ? parseInt(data.impressions, 10) : null,
        }),
      })

      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        throw new Error(body.error ?? 'Failed to save spend')
      }

      reset({ spend_date: new Date().toISOString().slice(0, 10) })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="space-y-1.5">
        <Label>Platform</Label>
        <Select onValueChange={(v) => setValue('platform', v as 'google' | 'meta' | 'microsoft')}>
          <SelectTrigger>
            <SelectValue placeholder="Select platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="google">Google Ads</SelectItem>
            <SelectItem value="meta">Meta Ads</SelectItem>
            <SelectItem value="microsoft">Microsoft (Bing)</SelectItem>
          </SelectContent>
        </Select>
        {errors.platform && <p className="text-xs text-red-500">{errors.platform.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Date</Label>
        <Input type="date" {...register('spend_date')} />
        {errors.spend_date && <p className="text-xs text-red-500">{errors.spend_date.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Spend ($)</Label>
        <Input type="number" step="0.01" placeholder="0.00" {...register('spend')} />
        {errors.spend && <p className="text-xs text-red-500">{errors.spend.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Clicks (optional)</Label>
        <Input type="number" placeholder="0" {...register('clicks')} />
        {errors.clicks && <p className="text-xs text-red-500">{errors.clicks.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Impressions (optional)</Label>
        <Input type="number" placeholder="0" {...register('impressions')} />
        {errors.impressions && <p className="text-xs text-red-500">{errors.impressions.message}</p>}
      </div>

      <div className="flex items-end">
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Saving...' : 'Add Spend'}
        </Button>
      </div>

      {error && (
        <div className="col-span-full text-sm text-red-600 bg-red-50 rounded p-3">{error}</div>
      )}
    </form>
  )
}
