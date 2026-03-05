import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { getLandingPageVariant, type ABVariant } from '@/lib/posthog-server'
import { LocationHero } from '@/components/landing/LocationHero'
import { LeadForm } from '@/components/landing/LeadForm'
import { SocialProof } from '@/components/landing/SocialProof'
import { MapPin, Clock, CheckCircle } from 'lucide-react'
import type { Location, LandingPage, GBPProfile } from '@/types'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ city: string; slug: string }>
  searchParams: Promise<Record<string, string>>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city, slug } = await params

  const { data: location } = await supabaseAdmin
    .from('locations')
    .select('name, city, state, address')
    .eq('city', city.replace(/-/g, ' '))
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!location) {
    return { title: 'Clinic Not Found' }
  }

  return {
    title: `${location.name} — Men's Health Clinic in ${location.city}, ${location.state}`,
    description: `Book a free consultation at ${location.name} in ${location.city}, ${location.state}. Expert men's health and hormone optimization care.`,
    robots: { index: true, follow: true },
  }
}

const SERVICES = [
  { name: "Men's Health", desc: "Comprehensive care tailored for men at every stage of life." },
  { name: "Hormone Optimization", desc: "Evidence-based hormone therapy to restore energy and vitality." },
  { name: "Primary Care", desc: "Preventive care, annual physicals, and chronic disease management." },
  { name: "Wellness Programs", desc: "Personalized wellness plans for weight, sleep, and performance." },
]

// Variant-specific content overrides
function getVariantContent(variant: ABVariant, loc: Location) {
  if (variant === 'B') {
    return {
      headline: 'Reclaim Your Energy. Reclaim Your Life.',
      subheadline: `Expert men's health care in ${loc.city}, ${loc.state}. Your first step starts today.`,
      ctaOverride: 'Book Your Free Consultation Today',
    }
  }
  if (variant === 'C') {
    return {
      headline: `Men's Health Experts in ${loc.city}, ${loc.state}`,
      subheadline: 'Personalized care to help you feel your best. Book your free consultation today.',
      ctaOverride: null,
      socialProofBanner: true,
    }
  }
  return { headline: null, subheadline: null, ctaOverride: null, socialProofBanner: false }
}

export default async function LandingPage({ params, searchParams }: PageProps) {
  const { city, slug } = await params
  const sp = await searchParams

  const cityName = city.replace(/-/g, ' ')

  const { data: location } = await supabaseAdmin
    .from('locations')
    .select('*')
    .ilike('city', cityName)
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!location) {
    notFound()
  }

  const loc = location as Location

  const [landingPageRes, gbpRes] = await Promise.all([
    supabaseAdmin
      .from('landing_pages')
      .select('*')
      .eq('location_id', loc.id)
      .eq('is_active', true)
      .single(),
    supabaseAdmin
      .from('gbp_profiles')
      .select('*')
      .eq('location_id', loc.id)
      .single(),
  ])

  const landingPage = (landingPageRes.data ?? {
    id: loc.id,
    location_id: loc.id,
    slug,
    title: `${loc.name} — Men's Health`,
    headline: `Men's Health Experts in ${loc.city}, ${loc.state}`,
    subheadline: 'Personalized care to help you feel your best. Book your free consultation today.',
    cta_text: 'Book Your Free Consultation',
    is_active: true,
    views: 0,
    conversions: 0,
    created_at: new Date().toISOString(),
    ab_variant: null,
    posthog_flag: null,
    body_copy: null,
  }) as LandingPage

  const gbpProfile = gbpRes.data as GBPProfile | null

  const cookieStore = await cookies()
  const gclid = sp.gclid ?? null
  const fbclid = sp.fbclid ?? null
  const msclkid = sp.msclkid ?? null

  if (gclid) {
    cookieStore.set('_gclid', gclid, { maxAge: 90 * 24 * 60 * 60, path: '/' })
  }
  if (fbclid) {
    cookieStore.set('_fbclid', fbclid, { maxAge: 90 * 24 * 60 * 60, path: '/' })
  }
  if (msclkid) {
    cookieStore.set('_msclkid', msclkid, { maxAge: 90 * 24 * 60 * 60, path: '/' })
  }
  if (sp.utm_source) {
    cookieStore.set('_utm_source', sp.utm_source, { maxAge: 30 * 24 * 60 * 60, path: '/' })
  }
  if (sp.utm_campaign) {
    cookieStore.set('_utm_campaign', sp.utm_campaign, { maxAge: 30 * 24 * 60 * 60, path: '/' })
  }

  // A/B testing — get or assign distinct ID
  let distinctId = cookieStore.get('_ph_distinct_id')?.value
  if (!distinctId) {
    distinctId = crypto.randomUUID()
    cookieStore.set('_ph_distinct_id', distinctId, { maxAge: 365 * 24 * 60 * 60, path: '/' })
  }

  const variant = await getLandingPageVariant(distinctId)
  const variantContent = getVariantContent(variant, loc)

  // Apply variant overrides to landing page content
  const displayLandingPage: LandingPage = {
    ...landingPage,
    headline: variantContent.headline ?? landingPage.headline,
    subheadline: variantContent.subheadline ?? landingPage.subheadline,
    ab_variant: variant,
  }

  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'MedicalClinic'],
    name: loc.name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: loc.address,
      addressLocality: loc.city,
      addressRegion: loc.state,
      postalCode: loc.zip,
      addressCountry: 'US',
    },
    telephone: loc.phone,
    ...(gbpProfile?.avg_rating ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: gbpProfile.avg_rating,
        reviewCount: gbpProfile.review_count,
      },
    } : {}),
  }

  supabaseAdmin.rpc('increment_landing_page_views', { page_id: landingPage.id })
    .then(() => null, () => null)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />

      <div className="min-h-screen bg-white">
        {/* Variant C: Social proof banner above fold */}
        {variantContent.socialProofBanner && (
          <div className="bg-blue-900 text-white text-center py-2 px-4 text-sm font-medium">
            2,400+ Men Treated | 4.9&#9733; Average Rating | Same-Day Appointments Available
          </div>
        )}

        <LocationHero location={loc} landingPage={displayLandingPage} gbpProfile={gbpProfile} />

        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Take charge of your health today
                </h2>
                <p className="text-gray-600 leading-relaxed mb-6">
                  At {loc.name}, we specialize in men&apos;s health and wellness. Our experienced team provides
                  personalized, evidence-based care to help you feel your best at every age.
                </p>
                <ul className="space-y-3">
                  {['No long waits — same-week appointments', 'Comprehensive lab work included', 'Private, confidential consultations', 'Most insurance accepted'].map((point) => (
                    <li key={point} className="flex items-center gap-2 text-gray-700">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <LeadForm
                  locationId={loc.id}
                  landingPageId={landingPage.id}
                  ctaText={variantContent.ctaOverride ?? landingPage.cta_text}
                  abVariant={variant}
                />
              </div>
            </div>
          </div>
        </section>

        <SocialProof reviewCount={gbpProfile?.review_count} avgRating={gbpProfile?.avg_rating ?? 4.9} />

        <section className="py-16 px-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Our Services</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {SERVICES.map((service) => (
                <div key={service.name} className="border border-gray-100 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">{service.name}</h3>
                  <p className="text-sm text-gray-500">{service.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Location</h2>
            <div className="flex items-start gap-3 text-gray-600">
              <MapPin className="h-5 w-5 mt-0.5 text-blue-500" />
              <div>
                <p className="font-medium">{loc.name}</p>
                <p>{loc.address}</p>
                <p>{loc.city}, {loc.state} {loc.zip}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-gray-600 mt-4">
              <Clock className="h-5 w-5 mt-0.5 text-blue-500" />
              <div>
                <p>Mon&ndash;Fri: 8:00 AM &ndash; 6:00 PM</p>
                <p>Sat: 9:00 AM &ndash; 2:00 PM</p>
              </div>
            </div>
          </div>
        </section>

        <footer className="bg-gray-900 text-gray-400 py-8 px-4">
          <div className="max-w-4xl mx-auto text-center text-sm">
            <p>&copy; {new Date().getFullYear()} {loc.name}. All rights reserved.</p>
            <p className="mt-1">This site does not use tracking pixels. Your privacy is protected.</p>
          </div>
        </footer>
      </div>
    </>
  )
}
