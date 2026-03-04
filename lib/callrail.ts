const CALLRAIL_BASE = 'https://api.callrail.com/v3'

export interface CallRailWebhook {
  tracker_id: string
  caller_number: string
  duration: number
  recording_url?: string
  call_date: string
  direction: string
  answered: boolean
}

export function parseWebhook(body: Record<string, unknown>): CallRailWebhook {
  return {
    tracker_id: String(body.tracker_id ?? ''),
    caller_number: String(body.caller_number ?? body.caller_phone_number ?? ''),
    duration: Number(body.duration ?? 0),
    recording_url: body.recording_url ? String(body.recording_url) : undefined,
    call_date: String(body.call_date ?? body.start_time ?? new Date().toISOString()),
    direction: String(body.direction ?? 'inbound'),
    answered: Boolean(body.answered),
  }
}

export async function getTracker(trackerId: string): Promise<Record<string, unknown>> {
  const response = await fetch(
    `${CALLRAIL_BASE}/a/${process.env.CALLRAIL_ACCOUNT_ID}/trackers/${trackerId}.json`,
    {
      headers: {
        Authorization: `Token token="${process.env.CALLRAIL_API_KEY}"`,
      },
    }
  )
  if (!response.ok) {
    throw new Error(`CallRail tracker fetch failed: ${response.status}`)
  }
  return response.json() as Promise<Record<string, unknown>>
}
