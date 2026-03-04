import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, CheckCircle, AlertCircle, Copy } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{ success?: string; error?: string; refresh_token?: string }>
}

export default async function GBPSettingsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const isConnected = !!process.env.GBP_REFRESH_TOKEN
  const justConnected = params.success === '1' && !!params.refresh_token

  return (
    <div className="p-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Google Business Profile</h1>
        <p className="text-gray-500 mt-1">Connect your GBP account to enable review automation and weekly posts</p>
      </div>

      {params.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Connection failed</p>
            <p className="text-sm text-red-700 mt-1">Error: {params.error}. Try again or check your Google Cloud credentials.</p>
          </div>
        </div>
      )}

      {justConnected && params.refresh_token && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
          <div className="flex gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-900">Google account connected!</p>
              <p className="text-sm text-green-700 mt-1">
                Copy this refresh token and add it as <code className="bg-green-100 px-1 rounded">GBP_REFRESH_TOKEN</code> in Vercel env vars, then redeploy.
              </p>
            </div>
          </div>
          <div className="bg-white border border-green-300 rounded p-3 font-mono text-xs text-gray-800 break-all">
            {params.refresh_token}
          </div>
          <p className="text-xs text-green-700">
            ⚠️ Save this now — it will not be shown again. Add to Vercel: Settings → Environment Variables → <code>GBP_REFRESH_TOKEN</code>
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Connection Status</CardTitle>
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {isConnected ? 'Connected' : 'Not connected'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 text-sm">
            {[
              { label: 'Client ID', value: process.env.GBP_CLIENT_ID ? '✓ Set' : '✗ Missing', ok: !!process.env.GBP_CLIENT_ID },
              { label: 'Client Secret', value: process.env.GBP_CLIENT_SECRET ? '✓ Set' : '✗ Missing', ok: !!process.env.GBP_CLIENT_SECRET },
              { label: 'Refresh Token', value: process.env.GBP_REFRESH_TOKEN ? '✓ Set' : '✗ Missing — connect below', ok: !!process.env.GBP_REFRESH_TOKEN },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <span className="text-gray-600">{item.label}</span>
                <span className={item.ok ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 space-y-3">
            <Link href="/api/auth/gbp">
              <Button className="w-full" variant={isConnected ? 'outline' : 'default'}>
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {isConnected ? 'Reconnect Google Account' : 'Connect Google Account'}
              </Button>
            </Link>
            <p className="text-xs text-gray-500 text-center">
              Uses your agency Google account. Make sure all client GBP locations have added this account as Manager.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What GBP automation does</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" /><span>Daily profile sync — rating, review count, hours</span></li>
            <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" /><span>Every 4 hours — new review detection + AI draft responses</span></li>
            <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" /><span>Weekly — 4 AI-generated post variants per location</span></li>
            <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" /><span>Auto-sync hours when location record is updated</span></li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add GBP Redirect URI to Google Cloud</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">Add this as an authorized redirect URI in your Google Cloud OAuth credentials:</p>
          <code className="block bg-gray-50 border border-gray-200 rounded p-3 text-xs text-gray-800 break-all">
            {process.env.NEXT_PUBLIC_APP_URL}/api/auth/gbp/callback
          </code>
          <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-3 w-3 mr-2" />
              Open Google Cloud Console
            </Button>
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
