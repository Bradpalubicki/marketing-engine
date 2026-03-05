import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { PostHogProvider } from '@/components/PostHogProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    template: '%s | NuStack Marketing',
    default: 'NuStack Marketing Engine',
  },
  description: 'Patient Acquisition Platform for multi-location men\'s health clinics',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://marketing-engine-roan.vercel.app'),
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <PostHogProvider>
            {children}
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
