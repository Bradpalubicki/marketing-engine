'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { inngest } from '@/inngest/client'
import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'

type LocationStatus = 'active' | 'paused' | 'inactive'

export async function setLocationStatus(locationId: string, status: LocationStatus) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const { error } = await supabaseAdmin
    .from('locations')
    .update({ status })
    .eq('id', locationId)

  if (error) throw new Error(`Failed to update location status: ${error.message}`)

  if (status === 'active') {
    await inngest.send({
      name: 'location/activated',
      data: { locationId },
    })
  }

  revalidatePath(`/dashboard/locations/${locationId}`)
  revalidatePath('/dashboard/locations')
}
