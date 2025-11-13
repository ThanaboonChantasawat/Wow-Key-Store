'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface Review {
  id: string
  rating: number
  comment: string
  userName: string
  userId: string
  createdAt: string | null
  updatedAt: string | null
}

interface ReviewsDisplayProps {
  shopId?: string
  productId?: string
  type: 'shop' | 'product'
}

export function ReviewsDisplay({ shopId, productId, type }: ReviewsDisplayProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [avgRating, setAvgRating] = useState(0)

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const endpoint = type === 'shop' 
          ? `/api/reviews/shop/${shopId}`
          : `/api/reviews/product/${productId}`
        
        const response = await fetch(endpoint)
        if (response.ok) {
          const data = await response.json()
          setReviews(data.reviews || [])
          
          // Calculate average rating
          if (data.reviews && data.reviews.length > 0) {
            const total = data.reviews.reduce((sum: number, r: Review) => sum + r.rating, 0)
            setAvgRating(total / data.reviews.length)
          }
        }
      } catch (error) {
        console.error('Error fetching reviews:', error)
      } finally {
        setLoading(false)
      }
    }

    if ((type === 'shop' && shopId) || (type === 'product' && productId)) {
      fetchReviews()
    }
  }, [shopId, productId, type])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date)
  }

  const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-gray-100 animate-pulse rounded-lg"></div>
        <div className="h-32 bg-gray-100 animate-pulse rounded-lg"></div>
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">ยังไม่มีรีวิว</p>
          <p className="text-sm text-gray-400 mt-1">
            เป็นคนแรกที่รีวิว{type === 'shop' ? 'ร้านค้า' : 'สินค้า'}นี้
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="bg-gradient-to-r from-yellow-50 to-orange-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-1">
                {avgRating.toFixed(1)}
              </div>
              <StarRating rating={Math.round(avgRating)} />
              <p className="text-sm text-gray-600 mt-1">
                {reviews.length} รีวิว
              </p>
            </div>
            
            <div className="flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = reviews.filter(r => r.rating === star).length
                const percentage = (count / reviews.length) * 100
                
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-sm w-6">{star}</span>
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-10 text-right">
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <Card key={review.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">{review.userName}</p>
                  <p className="text-sm text-gray-500">{formatDate(review.createdAt)}</p>
                </div>
                <StarRating rating={review.rating} />
              </div>
              
              {review.comment && (
                <p className="text-gray-700 leading-relaxed">{review.comment}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
