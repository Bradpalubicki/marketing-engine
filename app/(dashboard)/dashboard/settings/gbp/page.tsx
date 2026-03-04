import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ExternalLink } from 'lucide-react'

export default function GBPSettingsPage() {
  const gbpConfigured = !!(
    process.env.GBP_CLIENT_ID &&
    process.env.GBP_CLIENT_SECRET &&
    process.env.GBP_REFRESH_TOKEN
  )

  return (
    <div className="p-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Google Business Profile</h1>
        <p className="text-gray-500 mt-1">Connect your GBP account to sync reviews and post updates</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Connection Status</CardTitle>
            <Badge variant={gbpConfigured ? 'success' : 'warning'}>
              {gbpConfigured ? 'Configured' : 'Not configured'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Google Business Profile integration allows automated:
          </p>
          <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
            <li>Review monitoring and AI-drafted responses</li>
            <li>Weekly post generation and scheduling</li>
            <li>Profile data sync (hours, photos, attributes)</li>
          </ul>

          {!gbpConfigured && (
            <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm">
              <p className="font-medium text-amber-900 mb-1">Setup Required</p>
              <p className="text-amber-800">
                Add GBP_CLIENT_ID, GBP_CLIENT_SECRET, GBP_REFRESH_TOKEN, and GBP_AGENCY_ACCOUNT_EMAIL
                to your environment variables.
              </p>
            </div>
          )}

          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
          >
            <Button variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Google Cloud Console
            </Button>
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
