import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MetaTestButton } from './MetaTestButton'
import { CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function MetaSettingsPage() {
  const isConnected = Boolean(
    process.env.META_USER_ACCESS_TOKEN &&
    process.env.META_USER_ACCESS_TOKEN !== 'placeholder'
  )
  const businessManagerId = process.env.META_BUSINESS_MANAGER_ID ?? null

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <Link
        href="/dashboard/settings/integrations"
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Integrations
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meta Ads Connection</h1>
        <p className="text-gray-500 mt-1">Connect your Meta Business Manager to enable automated Meta Ads campaigns.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Connection Status</CardTitle>
            {isConnected ? (
              <Badge variant="success" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Not Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">System User Token</span>
                <span className="text-green-700 font-medium">Configured</span>
              </div>
              {businessManagerId && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Business Manager ID</span>
                  <span className="font-mono text-gray-700">{businessManagerId}</span>
                </div>
              )}
              <MetaTestButton />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm font-medium text-amber-900 mb-2">Setup Required</p>
                <p className="text-sm text-amber-800">
                  Complete Meta App Review first, then generate a System User token in Business Manager.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">Setup Instructions</h3>
                <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
                  <li>Create a Meta Business Manager at business.facebook.com</li>
                  <li>Submit Business Verification documents (2–4 weeks for approval)</li>
                  <li>After approval, navigate to Business Settings → System Users</li>
                  <li>Create a System User with Admin role</li>
                  <li>Generate a token with these permissions: <code className="bg-gray-100 px-1 rounded">ads_management</code>, <code className="bg-gray-100 px-1 rounded">ads_read</code>, <code className="bg-gray-100 px-1 rounded">business_management</code></li>
                  <li>Add the token as <code className="bg-gray-100 px-1 rounded">META_USER_ACCESS_TOKEN</code> in your Vercel environment variables</li>
                  <li>Add your Business Manager ID as <code className="bg-gray-100 px-1 rounded">META_BUSINESS_MANAGER_ID</code></li>
                </ol>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> System User tokens are non-expiring and preferred over user tokens for production integrations.
                  Never use personal user tokens in production.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>App Review Status</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>
            Meta requires Advanced Access for <code className="bg-gray-100 px-1 rounded">ads_management</code> which requires App Review.
          </p>
          <p>
            Until App Review is approved, <code className="bg-gray-100 px-1 rounded">FEATURE_META_ADS</code> should remain <code className="bg-gray-100 px-1 rounded">false</code>.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-gray-500">FEATURE_META_ADS:</span>
            <Badge variant={process.env.FEATURE_META_ADS === 'true' ? 'success' : 'secondary'}>
              {process.env.FEATURE_META_ADS === 'true' ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
