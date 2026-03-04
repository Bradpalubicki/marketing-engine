import { supabaseAdmin } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { updateLeadStatus } from '../actions'
import type { Lead, NurtureEvent } from '@/types'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'secondary' | 'destructive' | 'outline'> = {
  new: 'default',
  contacted: 'warning',
  booked: 'success',
  showed: 'success',
  no_showed: 'destructive',
  disqualified: 'secondary',
}

const eventTypeIcons: Record<string, string> = {
  sms: '💬',
  email: '📧',
  retargeting_audience: '🎯',
  internal_alert: '🔔',
}

export default async function LeadDetailPage({ params }: PageProps) {
  const { id } = await params

  const [leadRes, nurtureRes, attrRes] = await Promise.all([
    supabaseAdmin.from('leads').select('*').eq('id', id).single(),
    supabaseAdmin.from('nurture_events').select('*').eq('lead_id', id).order('step', { ascending: true }),
    supabaseAdmin.from('attribution_records').select('*').eq('lead_id', id).single(),
  ])

  if (leadRes.error || !leadRes.data) {
    notFound()
  }

  const lead = leadRes.data as Lead
  const nurtureEvents = (nurtureRes.data ?? []) as NurtureEvent[]
  const attribution = attrRes.data

  const LEAD_STATUSES = ['new', 'contacted', 'booked', 'showed', 'no_showed', 'disqualified'] as const

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <Link href="/dashboard/leads" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" />
        Back to Leads
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {lead.first_name} {lead.last_name ?? ''}
          </h1>
          <p className="text-gray-500 mt-1">
            Lead #{lead.id.slice(0, 8)} · Created {format(new Date(lead.created_at), 'MMM d, yyyy h:mm a')}
          </p>
        </div>
        <Badge variant={statusColors[lead.status] ?? 'secondary'}>{lead.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Update Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {LEAD_STATUSES.map((s) => (
              <form key={s} action={updateLeadStatus.bind(null, lead.id, s)}>
                <Button
                  type="submit"
                  size="sm"
                  variant={lead.status === s ? 'default' : 'outline'}
                  className="capitalize"
                >
                  {s.replace('_', ' ')}
                </Button>
              </form>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {lead.phone && (
              <div className="flex justify-between">
                <span className="text-gray-500">Phone</span>
                <a href={`tel:${lead.phone}`} className="text-blue-600">{lead.phone}</a>
              </div>
            )}
            {lead.email && (
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <a href={`mailto:${lead.email}`} className="text-blue-600">{lead.email}</a>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Source</span>
              <span className="capitalize">{lead.source}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Nurture Step</span>
              <span>{lead.nurture_sequence_step} of 5</span>
            </div>
            {lead.nurture_paused && (
              <Badge variant="warning">Nurture Paused</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {lead.utm_source && (
              <div className="flex justify-between">
                <span className="text-gray-500">UTM Source</span>
                <span>{lead.utm_source}</span>
              </div>
            )}
            {lead.utm_campaign && (
              <div className="flex justify-between">
                <span className="text-gray-500">Campaign</span>
                <span>{lead.utm_campaign}</span>
              </div>
            )}
            {lead.gclid && (
              <div className="flex justify-between">
                <span className="text-gray-500">GCLID</span>
                <span className="text-xs font-mono text-green-700 bg-green-50 px-1 rounded">
                  {lead.gclid.slice(0, 20)}...
                </span>
              </div>
            )}
            {lead.fbclid && (
              <div className="flex justify-between">
                <span className="text-gray-500">FBCLID</span>
                <span className="text-xs font-mono text-blue-700 bg-blue-50 px-1 rounded">
                  {lead.fbclid.slice(0, 20)}...
                </span>
              </div>
            )}
            {attribution && (
              <>
                {attribution.booked_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Booked At</span>
                    <span>{format(new Date(attribution.booked_at), 'MMM d')}</span>
                  </div>
                )}
                {attribution.revenue && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Revenue</span>
                    <span className="text-green-700 font-medium">${attribution.revenue}</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nurture Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {nurtureEvents.length === 0 ? (
            <p className="text-sm text-gray-400">No nurture events yet.</p>
          ) : (
            <div className="space-y-3">
              {nurtureEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-3 text-sm">
                  <span className="text-lg">{eventTypeIcons[event.type] ?? '•'}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">{event.type.replace('_', ' ')}</span>
                      <span className="text-xs text-gray-400">Step {event.step}</span>
                      <Badge variant={event.status === 'sent' ? 'success' : event.status === 'failed' ? 'destructive' : 'secondary'}>
                        {event.status}
                      </Badge>
                    </div>
                    {event.content && (
                      <p className="text-gray-500 mt-0.5 text-xs">{event.content}</p>
                    )}
                    {event.sent_at && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {format(new Date(event.sent_at), 'MMM d, h:mm a')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
