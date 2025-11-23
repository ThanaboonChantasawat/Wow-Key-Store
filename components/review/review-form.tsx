'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { StarRating } from './star-rating'
import { useAuth } from '@/components/auth-context'

interface ReviewFormProps {
  type: 'shop' | 'product'
  shopId: string
  shopName: string
  productId?: string
  productName?: string
  orderId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function ReviewForm({
  type,
  shopId,
  shopName,
  productId,
  productName,
  orderId,
  onSuccess,
  onCancel
}: ReviewFormProps) {
  const [rating, setRating] = useState(5)
  const [text, setText] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'กรุณาเข้าสู่ระบบ',
        description: 'คุณต้องเข้าสู่ระบบก่อนเขียนรีวิว'
      })
      return
    }
    
    if (!text.trim()) {
      toast({
        variant: 'destructive',
        title: 'กรุณาเขียนรีวิว',
        description: 'กรุณาเขียนรีวิวก่อนส่ง'
      })
      return
    }
    
    setLoading(true)
    
    try {
      // Get auth token
      const token = await user.getIdToken()
      
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type,
          shopId,
          shopName,
          productId,
          productName,
          orderId,
          rating,
          text,
          images
        })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review')
      }
      
      toast({
        title: '✅ รีวิวสำเร็จ!',
        description: 'ขอบคุณสำหรับรีวิวของคุณ'
      })
      
      // Reset form
      setRating(5)
      setText('')
      setImages([])
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error('Error submitting review:', error)
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: error.message || 'ไม่สามารถส่งรีวิวได้'
      })
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          เขียนรีวิว{type === 'shop' ? 'ร้านค้า' : 'สินค้า'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rating */}
          <div>
            <label className="block text-sm font-medium mb-2">
              คะแนน
            </label>
            <StarRating
              rating={rating}
              interactive
              onChange={setRating}
              size="lg"
            />
          </div>
          
          {/* Review Text */}
          <div>
            <label className="block text-sm font-medium mb-2">
              รีวิว
            </label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="แชร์ประสบการณ์ของคุณ..."
              rows={4}
              disabled={loading}
            />
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'กำลังส่ง...' : 'ส่งรีวิว'}
            </Button>
            
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                ยกเลิก
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
