import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Clock } from 'lucide-react'

interface Integration {
  name: string
  description: string
  status: 'connected' | 'not_configured' | 'feature_flagged'
  envKey?: string
}

function getIntegrations(): Integration[] {
  return [
    {
      name: 'Supabase',
      description: 'Database and row-level security',
      status: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'connected' : 'not_configured',
    },
    {
      name: 'Clerk',
      description: 'Authentication and user management',
      status: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'connected' : 'not_configured',
    },
    {
      name: 'Twilio',
      description: 'SMS nurture sequences',
      status: process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID !== 'placeholder' ? 'connected' : 'not_configured',
      envKey: 'TWILIO_ACCOUNT_SID',
    },
    {
      name: 'Resend',
      description: 'Email delivery',
      status: process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_placeholder' ? 'connected' : 'not_configured',
      envKey: 'RESEND_API_KEY',
    },
    {
      name: 'Inngest',
      description: 'Background job orchestration',
      status: process.env.INNGEST_EVENT_KEY && process.env.INNGEST_EVENT_KEY !== 'placeholder' ? 'connected' : 'not_configured',
      envKey: 'INNGEST_EVENT_KEY',
    },
    {
      name: 'Google Ads',
      description: 'Search campaign management and offline conversions',
      status: process.env.FEATURE_GOOGLE_ADS === 'true' ? 'connected' : 'feature_flagged',
      envKey: 'FEATURE_GOOGLE_ADS',
    },
    {
      name: 'Meta Ads',
      description: 'Facebook/Instagram lead campaigns',
      status: process.env.FEATURE_META_ADS === 'true' ? 'connected' : 'feature_flagged',
      envKey: 'FEATURE_META_ADS',
    },
    {
      name: 'Google Business Profile',
      description: 'Review management and post scheduling',
      status: process.env.GBP_CLIENT_ID ? 'connected' : 'not_configured',
      envKey: 'GBP_CLIENT_ID',
    },
    {
      name: 'CallRail',
      description: 'Call tracking and lead attribution',
      status: process.env.CALLRAIL_API_KEY ? 'connected' : 'not_configured',
      envKey: 'CALLRAIL_API_KEY',
    },
    {
      name: 'Claude AI',
      description: 'Ad copy generation and GBP post writing',
      status: process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'sk-ant-placeholder' ? 'connected' : 'not_configured',
      envKey: 'ANTHROPIC_API_KEY',
    },
  ]
}

const statusIcons = {
  connected: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  not_configured: <XCircle className="h-5 w-5 text-gray-300" />,
  feature_flagged: <Clock className="h-5 w-5 text-amber-500" />,
}

const statusBadges = {
  connected: <Badge variant="success">Connected</Badge>,
  not_configured: <Badge variant="secondary">Not configured</Badge>,
  feature_flagged: <Badge variant="warning">Flag disabled</Badge>,
}

export default function IntegrationsPage() {
  const integrations = getIntegrations()
  const connected = integrations.filter(i => i.status === 'connected').length

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-500 mt-1">{connected} of {integrations.length} integrations active</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((integration) => (
          <Card key={integration.name}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {statusIcons[integration.status]}
                  <CardTitle className="text-base">{integration.name}</CardTitle>
                </div>
                {statusBadges[integration.status]}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">{integration.description}</p>
              {integration.envKey && integration.status !== 'connected' && (
                <p className="text-xs text-gray-400 mt-1 font-mono">
                  {integration.envKey}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
