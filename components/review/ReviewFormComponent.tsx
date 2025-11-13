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
  // ข้อมูลรีวิวเดิม (ถ้ามี) สำหรับโหมดแก้ไข
  existingShopReview?: {
    id: string
    rating: number
    comment: string
  } | null
  existingProductReview?: {
    id: string
    rating: number
    comment: string
  } | null
}

export function ReviewFormComponent({ 
  orderId, 
  shopId, 
  productId, 
  shopName, 
  productName,
  onSuccess,
  existingShopReview,
  existingProductReview
}: ReviewFormProps) {
  const { user } = useAuth()
  const [shopRating, setShopRating] = useState(existingShopReview?.rating || 0)
  const [shopComment, setShopComment] = useState(existingShopReview?.comment || '')
  const [productRating, setProductRating] = useState(existingProductReview?.rating || 0)
  const [productComment, setProductComment] = useState(existingProductReview?.comment || '')
  const [hoveredShopStar, setHoveredShopStar] = useState(0)
  const [hoveredProductStar, setHoveredProductStar] = useState(0)

  // Separate loading state for shop and product reviews
  const [shopLoading, setShopLoading] = useState(false)
  const [productLoading, setProductLoading] = useState(false)
  const [shopSuccess, setShopSuccess] = useState(false)
  const [productSuccess, setProductSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmitShopReview = async () => {
    if (!user || shopRating === 0) return

    setError('')
    setShopLoading(true)

    try {
      const token = await user.getIdToken()
      const endpoint = existingShopReview ? '/api/reviews' : '/api/reviews'
      const method = existingShopReview ? 'PATCH' : 'POST'

      const body = existingShopReview
        ? {
            reviewId: existingShopReview.id,
            type: 'shop',
            rating: shopRating,
            text: shopComment,
          }
        : {
            type: 'shop',
            shopId,
            shopName: shopName || '',
            orderId,
            rating: shopRating,
            text: shopComment || '',
          }

      console.log('🔵 Submitting shop review:', body)

      const response = await fetch(endpoint, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body),
      })

      console.log('📡 Shop review response status:', response.status, response.statusText)
      const data = await response.json()
      console.log('📦 Shop review response data:', data)

      if (!response.ok) {
        console.error('❌ Shop review error:', data)
        throw new Error(data.error || data.message || `Failed to submit review (${response.status})`)
      }

      console.log('✅ Shop review success:', data)
      setShopSuccess(true)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setShopLoading(false)
    }
  }

  const handleSubmitProductReview = async () => {
    if (!user || !productId || productRating === 0) return

    setError('')
    setProductLoading(true)

    try {
      const token = await user.getIdToken()
      const endpoint = existingProductReview ? '/api/reviews' : '/api/reviews'
      const method = existingProductReview ? 'PATCH' : 'POST'

      const body = existingProductReview
        ? {
            reviewId: existingProductReview.id,
            type: 'product',
            rating: productRating,
            text: productComment,
          }
        : {
            type: 'product',
            productId,
            productName: productName || '',
            shopId,
            shopName: shopName || '',
            orderId,
            rating: productRating,
            text: productComment || '',
          }

      console.log('🟢 Submitting product review:', body)

      const response = await fetch(endpoint, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body),
      })

      console.log('📡 Product review response status:', response.status, response.statusText)
      const data = await response.json()
      console.log('📦 Product review response data:', data)

      if (!response.ok) {
        console.error('❌ Product review error:', data)
        throw new Error(data.error || data.message || `Failed to submit review (${response.status})`)
      }

      console.log('✅ Product review success:', data)
      setProductSuccess(true)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setProductLoading(false)
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

  // If both reviews are successful, show the thank you card
  if (shopSuccess && (!productId || productSuccess)) {
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
            {existingShopReview ? 'แก้ไขรีวิวร้านค้า' : 'รีวิวร้านค้า'}: {shopName}
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
            disabled={shopLoading || shopRating === 0 || shopSuccess}
            className="w-full bg-[#ff9800] hover:bg-[#e08800]"
          >
            {shopLoading ? 'กำลังส่ง...' : shopSuccess ? (existingShopReview ? 'บันทึกการแก้ไขแล้ว' : 'ส่งรีวิวร้านค้าแล้ว') : (existingShopReview ? 'บันทึกการแก้ไข' : 'ส่งรีวิวร้านค้า')}
          </Button>
        </CardContent>
      </Card>

      {/* Product Review */}
      {productId && productName && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-[#ff9800]" />
              {existingProductReview ? 'แก้ไขรีวิวสินค้า' : 'รีวิวสินค้า'}: {productName}
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
              disabled={productLoading || productRating === 0 || productSuccess}
              className="w-full bg-[#ff9800] hover:bg-[#e08800]"
            >
              {productLoading ? 'กำลังส่ง...' : productSuccess ? (existingProductReview ? 'บันทึกการแก้ไขแล้ว' : 'ส่งรีวิวสินค้าแล้ว') : (existingProductReview ? 'บันทึกการแก้ไข' : 'ส่งรีวิวสินค้า')}
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
