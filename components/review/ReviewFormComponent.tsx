'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/components/auth-context'

interface ReviewFormProps {
  orderId: string
  shopId: string
  productId?: string
  shopName: string
  productName?: string
  onSuccess?: () => void
}

export function ReviewFormComponent({ 
  orderId, 
  shopId, 
  productId, 
  shopName, 
  productName,
  onSuccess 
}: ReviewFormProps) {
  const { user } = useAuth()
  const [shopRating, setShopRating] = useState(0)
  const [shopComment, setShopComment] = useState('')
  const [productRating, setProductRating] = useState(0)
  const [productComment, setProductComment] = useState('')
  const [hoveredShopStar, setHoveredShopStar] = useState(0)
  const [hoveredProductStar, setHoveredProductStar] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmitShopReview = async () => {
    if (!user || shopRating === 0) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/reviews/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          userId: user.uid,
          shopId,
          rating: shopRating,
          comment: shopComment,
          type: 'shop'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review')
      }

      setSuccess(true)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitProductReview = async () => {
    if (!user || !productId || productRating === 0) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/reviews/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          userId: user.uid,
          shopId,
          productId,
          rating: productRating,
          comment: productComment,
          type: 'product'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review')
      }

      setSuccess(true)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const StarRating = ({ 
    rating, 
    setRating, 
    hovered, 
    setHovered 
  }: { 
    rating: number
    setRating: (n: number) => void
    hovered: number
    setHovered: (n: number) => void
  }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setRating(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`w-8 h-8 ${
              star <= (hovered || rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  )

  if (success) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-white fill-white" />
          </div>
          <h3 className="text-xl font-bold text-green-900 mb-2">
            ขอบคุณสำหรับรีวิว!
          </h3>
          <p className="text-green-700">
            รีวิวของคุณจะช่วยให้ผู้ซื้อคนอื่นตัดสินใจได้ดีขึ้น
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Shop Review */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-[#ff9800]" />
            รีวิวร้านค้า: {shopName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              ให้คะแนนร้านค้า <span className="text-red-500">*</span>
            </label>
            <StarRating
              rating={shopRating}
              setRating={setShopRating}
              hovered={hoveredShopStar}
              setHovered={setHoveredShopStar}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              ความคิดเห็น (ไม่บังคับ)
            </label>
            <Textarea
              value={shopComment}
              onChange={(e) => setShopComment(e.target.value)}
              placeholder="แบ่งปันประสบการณ์การซื้อของคุณ..."
              rows={4}
              className="resize-none"
            />
          </div>

          <Button
            onClick={handleSubmitShopReview}
            disabled={loading || shopRating === 0}
            className="w-full bg-[#ff9800] hover:bg-[#e08800]"
          >
            {loading ? 'กำลังส่ง...' : 'ส่งรีวิวร้านค้า'}
          </Button>
        </CardContent>
      </Card>

      {/* Product Review */}
      {productId && productName && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-[#ff9800]" />
              รีวิวสินค้า: {productName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                ให้คะแนนสินค้า <span className="text-red-500">*</span>
              </label>
              <StarRating
                rating={productRating}
                setRating={setProductRating}
                hovered={hoveredProductStar}
                setHovered={setHoveredProductStar}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                ความคิดเห็น (ไม่บังคับ)
              </label>
              <Textarea
                value={productComment}
                onChange={(e) => setProductComment(e.target.value)}
                placeholder="บอกเล่าเกี่ยวกับสินค้า..."
                rows={4}
                className="resize-none"
              />
            </div>

            <Button
              onClick={handleSubmitProductReview}
              disabled={loading || productRating === 0}
              className="w-full bg-[#ff9800] hover:bg-[#e08800]"
            >
              {loading ? 'กำลังส่ง...' : 'ส่งรีวิวสินค้า'}
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
    </div>
  )
}
