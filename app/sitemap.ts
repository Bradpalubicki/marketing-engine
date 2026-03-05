import { supabaseAdmin } from '@/lib/supabase'
import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://marketing-engine-roan.vercel.app'

  try {
    const { data: locations } = await supabaseAdmin
      .from('locations')
      .select('city, slug, created_at')
      .eq('status', 'active')

    const locationUrls = (locations ?? []).map(loc => ({
      url: `${appUrl}/${loc.city.toLowerCase().replace(/ /g, '-')}/${loc.slug}`,
      lastModified: new Date(loc.created_at ?? new Date()),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))

    return [
      {
        url: appUrl,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 1,
      },
      ...locationUrls,
    ]
  } catch {
    return [
      {
        url: appUrl,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 1,
      },
    ]
  }
}
