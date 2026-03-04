import { Star, Quote } from 'lucide-react'

interface SocialProofProps {
  reviewCount?: number
  avgRating?: number
}

const testimonials = [
  {
    text: "Finally found a clinic that actually listens. The team here is professional, knowledgeable, and genuinely cares about your wellbeing.",
    author: "Michael R.",
    rating: 5,
  },
  {
    text: "Great experience from start to finish. The staff is welcoming and the doctors take time to explain everything clearly.",
    author: "James T.",
    rating: 5,
  },
  {
    text: "Highly recommend to any man looking to take charge of their health. Easy to book, no long waits, real results.",
    author: "David M.",
    rating: 5,
  },
]

export function SocialProof({ reviewCount = 0, avgRating = 4.9 }: SocialProofProps) {
  return (
    <section className="bg-gray-50 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className="h-6 w-6 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <p className="text-2xl font-bold text-gray-900">{avgRating.toFixed(1)} stars</p>
          {reviewCount > 0 && (
            <p className="text-gray-500 mt-1">Based on {reviewCount} Google reviews</p>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
              <Quote className="h-5 w-5 text-blue-200 mb-3" />
              <p className="text-gray-700 text-sm leading-relaxed mb-4">{t.text}</p>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-3.5 w-3.5 ${star <= t.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium text-gray-600">{t.author}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
