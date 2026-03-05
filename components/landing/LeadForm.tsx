'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const leadSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  phone: z.string().regex(/^\d{10}$/, 'Enter a valid 10-digit phone number'),
  service_interest: z.enum(['mens_health', 'hormone_optimization', 'primary_care', 'wellness']),
  zip: z.string().regex(/^\d{5}$/, 'Enter a valid 5-digit zip code'),
})

type LeadFormData = z.infer<typeof leadSchema>

interface LeadFormProps {
  locationId: string
  landingPageId: string
  ctaText?: string
  abVariant?: string | null
}

export function LeadForm({ locationId, landingPageId, ctaText = 'Book Your Free Consultation', abVariant }: LeadFormProps) {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gclid, setGclid] = useState<string | null>(null)
  const [fbclid, setFbclid] = useState<string | null>(null)

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';').reduce<Record<string, string>>((acc, c) => {
        const [k, v] = c.trim().split('=')
        if (k && v) acc[k] = decodeURIComponent(v)
        return acc
      }, {})
      setGclid(cookies['_gclid'] ?? null)
      setFbclid(cookies['_fbclid'] ?? null)
    }
  }, [])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
  })

  const onSubmit = async (data: LeadFormData) => {
    setError(null)
    try {
      const res = await fetch('/api/leads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          location_id: locationId,
          landing_page_id: landingPageId,
          gclid,
          fbclid,
          ab_variant: abVariant ?? null,
        }),
      })

      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        throw new Error(body.error ?? 'Failed to submit')
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="text-4xl mb-4">✓</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">We&apos;ll be in touch shortly!</h3>
        <p className="text-gray-500">Expect a text or call from us within 60 seconds.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Book Your Free Consultation</h2>
      <p className="text-gray-500 text-sm mb-6">No commitment. Get answers today.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="first_name">First Name</Label>
          <Input
            id="first_name"
            placeholder="John"
            {...register('first_name')}
          />
          {errors.first_name && (
            <p className="text-xs text-red-500">{errors.first_name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="5555555555"
            {...register('phone')}
          />
          {errors.phone && (
            <p className="text-xs text-red-500">{errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="service_interest">I&apos;m interested in</Label>
          <Select onValueChange={(val) => setValue('service_interest', val as LeadFormData['service_interest'])}>
            <SelectTrigger id="service_interest">
              <SelectValue placeholder="Select a service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mens_health">Men&apos;s Health</SelectItem>
              <SelectItem value="hormone_optimization">Hormone Optimization</SelectItem>
              <SelectItem value="primary_care">Primary Care</SelectItem>
              <SelectItem value="wellness">General Wellness</SelectItem>
            </SelectContent>
          </Select>
          {errors.service_interest && (
            <p className="text-xs text-red-500">{errors.service_interest.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="zip">Zip Code</Label>
          <Input
            id="zip"
            placeholder="60601"
            maxLength={5}
            {...register('zip')}
          />
          {errors.zip && (
            <p className="text-xs text-red-500">{errors.zip.message}</p>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded p-3">{error}</div>
        )}

        <Button type="submit" className="w-full h-11 text-base" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : ctaText}
        </Button>

        <p className="text-xs text-gray-400 text-center">
          By submitting, you agree to receive communications from us. Standard rates may apply.
        </p>
      </form>
    </div>
  )
}
