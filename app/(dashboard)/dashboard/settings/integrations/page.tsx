import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, Clock, ExternalLink, AlertTriangle } from 'lucide-react'

function statusBadge(status: 'live' | 'pending' | 'action_required' | 'blocked') {
  const map = {
    live: { label: 'Live', className: 'bg-green-100 text-green-700 border-green-200' },
    pending: { label: 'Pending Approval', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    action_required: { label: 'Action Required', className: 'bg-orange-100 text-orange-700 border-orange-200' },
    blocked: { label: 'Blocked', className: 'bg-red-100 text-red-700 border-red-200' },
  }
  const s = map[status]
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full border ${s.className}`}>
      {s.label}
    </span>
  )
}

const integrations = [
  {
    name: 'Clerk Auth',
    description: 'Multi-role authentication (super_admin, org_admin, location_manager, viewer)',
    status: 'live' as const,
    envKey: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  },
  {
    name: 'Supabase',
    description: 'PostgreSQL database with RLS — 17 tables, HIPAA-isolated leads table',
    status: 'live' as const,
    envKey: 'NEXT_PUBLIC_SUPABASE_URL',
  },
  {
    name: 'Twilio SMS',
    description: 'NuStack master account — 60-second speed-to-lead SMS + 7-day nurture',
    status: 'live' as const,
    envKey: 'TWILIO_ACCOUNT_SID',
  },
  {
    name: 'Resend Email',
    description: 'NuStack shared key — email nurture step at 2 hours post-lead',
    status: 'live' as const,
    envKey: 'RESEND_API_KEY',
  },
  {
    name: 'Inngest',
    description: '9 background functions — nurture, GBP sync, budget pacing, insights',
    status: 'live' as const,
    envKey: 'INNGEST_EVENT_KEY',
  },
  {
    name: 'Anthropic Claude',
    description: 'claude-sonnet-4-6 — GBP review responses, post generation, insights',
    status: 'live' as const,
    envKey: 'ANTHROPIC_API_KEY',
  },
  {
    name: 'PostHog',
    description: 'A/B testing on landing pages + product analytics',
    status: 'live' as const,
    envKey: 'NEXT_PUBLIC_POSTHOG_KEY',
  },
  {
    name: 'Google Business Profile',
    description: 'Daily sync, AI review responses, weekly posts. OAuth credentials set — refresh token needed.',
    status: 'action_required' as const,
    envKey: 'GBP_REFRESH_TOKEN',
    action: { label: 'Connect GBP', href: '/dashboard/settings/gbp' },
  },
  {
    name: 'CallRail',
    description: 'HIPAA Healthcare plan required. Call tracking → lead creation → nurture sequence.',
    status: 'action_required' as const,
    envKey: 'CALLRAIL_API_KEY',
    action: { label: 'Sign up for CallRail Healthcare', href: 'https://www.callrail.com/healthcare/', external: true },
  },
  {
    name: 'Google Ads API',
    description: 'Standard developer token required (2–6 week Google approval). Apply via Google Ads Manager Account.',
    status: 'pending' as const,
    envKey: 'GOOGLE_ADS_DEVELOPER_TOKEN',
    action: { label: 'Apply for Standard Token', href: 'https://ads.google.com/home/tools/manager-accounts/', external: true },
  },
  {
    name: 'Meta Ads API',
    description: 'Advanced Access requires Meta Business Verification (2–4 weeks). System User token needed.',
    status: 'pending' as const,
    envKey: 'META_SYSTEM_USER_TOKEN',
    action: { label: 'Submit Business Verification', href: 'https://business.facebook.com/settings/security', external: true },
  },
]

export default function IntegrationsPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-500 mt-1">All platform connections and their status</p>
      </div>

      <div className="grid gap-4">
        {integrations.map((integration) => {
          const isSet = !!process.env[integration.envKey]
          return (
            <Card key={integration.name}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">{integration.name}</span>
                      {statusBadge(isSet && integration.status !== 'action_required' ? 'live' : integration.status)}
                    </div>
                    <p className="text-sm text-gray-500">{integration.description}</p>
                    {!isSet && (
                      <p className="text-xs text-amber-600 font-mono">
                        Missing: <code>{integration.envKey}</code>
                      </p>
                    )}
                  </div>
                  {integration.action && (
                    <div className="flex-shrink-0">
                      {integration.action.external ? (
                        <a href={integration.action.href} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-3 w-3 mr-1.5" />
                            {integration.action.label}
                          </Button>
                        </a>
                      ) : (
                        <a href={integration.action.href}>
                          <Button size="sm">{integration.action.label}</Button>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3">
            <Clock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-blue-900">Pending approvals timeline</p>
              <p className="text-sm text-blue-700">
                Google Ads Standard token: 2–6 weeks after application. 
                Meta Business Verification: 2–4 weeks. 
                CallRail Healthcare: same-day setup after signup.
              </p>
              <p className="text-sm text-blue-700 mt-2">
                When Google Ads is approved, set <code className="bg-blue-100 px-1 rounded">FEATURE_GOOGLE_ADS=true</code> in Vercel env vars.
                For Meta, set <code className="bg-blue-100 px-1 rounded">FEATURE_META_ADS=true</code>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
