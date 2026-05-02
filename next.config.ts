import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
    ],
  },
}

export default withSentryConfig(nextConfig, {
  org: 'nustack-digital-ventures',
  project: 'marketing-engine',
  silent: true,
  disableLogger: true,
})
