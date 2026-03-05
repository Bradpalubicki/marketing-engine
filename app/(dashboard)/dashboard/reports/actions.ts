'use server'

import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export async function sendWeeklyReport(): Promise<{ success: boolean; error?: string }> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/cron/weekly-report`,
      {
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? ''}` },
      }
    )

    if (!res.ok) {
      const data = (await res.json()) as { error?: string }
      return { success: false, error: data.error ?? 'Failed to send report' }
    }

    const data = (await res.json()) as { sent: number }
    return { success: true, error: data.sent === 0 ? 'No recipients found' : undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

const toggleSchema = z.object({
  locationId: z.string().uuid(),
  enabled: z.boolean(),
})

export async function toggleWeeklyReport(locationId: string, enabled: boolean): Promise<{ success: boolean }> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const parsed = toggleSchema.safeParse({ locationId, enabled })
  if (!parsed.success) throw new Error('Invalid input')

  const { error } = await supabaseAdmin
    .from('locations')
    .update({ weekly_report_enabled: parsed.data.enabled })
    .eq('id', parsed.data.locationId)

  if (error) return { success: false }

  revalidatePath('/dashboard/reports')
  return { success: true }
}
