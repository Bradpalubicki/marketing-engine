import { Phone, MapPin, Star } from 'lucide-react'
import type { Location, LandingPage, GBPProfile } from '@/types'

interface LocationHeroProps {
  location: Location
  landingPage: LandingPage
  gbpProfile?: GBPProfile | null
}

export function LocationHero({ location, landingPage, gbpProfile }: LocationHeroProps) {
  return (
    <section className="relative bg-gradient-to-br from-blue-900 to-blue-700 text-white py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        {gbpProfile && gbpProfile.avg_rating && (
          <div className="flex items-center justify-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-5 w-5 ${star <= Math.round(gbpProfile.avg_rating!) ? 'fill-yellow-400 text-yellow-400' : 'text-blue-400'}`}
              />
            ))}
            <span className="ml-2 text-blue-200">
              {gbpProfile.avg_rating.toFixed(1)} ({gbpProfile.review_count} reviews)
            </span>
          </div>
        )}

        <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
          {landingPage.headline}
        </h1>

        {landingPage.subheadline && (
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            {landingPage.subheadline}
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <div className="flex items-center gap-2 text-blue-200">
            <MapPin className="h-4 w-4" />
            <span>{location.address}, {location.city}, {location.state} {location.zip}</span>
          </div>
          <a
            href={`tel:${location.callrail_phone ?? location.phone}`}
            className="flex items-center gap-2 bg-white text-blue-900 px-6 py-3 rounded-full font-semibold hover:bg-blue-50 transition-colors"
          >
            <Phone className="h-4 w-4" />
            {location.callrail_phone ?? location.phone}
          </a>
        </div>
      </div>
    </section>
  )
}
