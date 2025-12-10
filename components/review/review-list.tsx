'use client'

import { useEffect, useState } from 'react'
import { ReviewCard } from './review-card'
import { StarRating } from './star-rating'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/components/auth-context'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { ShopReview, ProductReview, ReviewStats } from '@/lib/review-types'

interface ReviewListProps {
  type: 'shop' | 'product'
  shopId?: string
  productId?: string
  currentUserId?: string
  limit?: number
}

export function ReviewList({
  type,
  shopId,
  productId,
  currentUserId,
  limit = 50
}: ReviewListProps) {
  const [reviews, setReviews] = useState<(ShopReview | ProductReview)[]>([])
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()
  
  const fetchReviews = async () => {
    try {
      const params = new URLSearchParams({
        limit: limit.toString()
      })
      
      if (type === 'shop' && shopId) {
        params.append('shopId', shopId)
      } else if (type === 'product' && productId) {
        params.append('productId', productId)
      } else {
        // ไม่มี shopId หรือ productId ให้ข้าม
        console.warn('ReviewList: Missing shopId or productId', { type, shopId, productId })
        setLoading(false)
        return
      }
      
      const url = `/api/reviews?${params}`
      console.log('Fetching reviews from:', url)
      
      const res = await fetch(url)
      const data = await res.json()
      
      if (res.ok) {
        setReviews(data.reviews || [])
        setStats(data.stats || null)
      } else {
        console.error('Failed to fetch reviews:', data)
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchReviews()
  }, [type, shopId, productId, limit])
  
  const handleDelete = async (reviewId: string) => {
    setReviewToDelete(reviewId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!reviewToDelete) return
    
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'กรุณาเข้าสู่ระบบ',
        description: 'คุณต้องเข้าสู่ระบบก่อนลบรีวิว'
      })
      setDeleteDialogOpen(false)
      setReviewToDelete(null)
      return
    }

    try {
      const token = await user.getIdToken()
      
      const res = await fetch('/api/reviews', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reviewId: reviewToDelete, type })
      })
      
      if (res.ok) {
        toast({
          title: '✅ ลบรีวิวสำเร็จ',
          description: 'รีวิวของคุณถูกลบแล้ว'
        })
        fetchReviews()
      } else {
        throw new Error('Failed to delete review')
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: error.message || 'ไม่สามารถลบรีวิวได้'
      })
    } finally {
      setDeleteDialogOpen(false)
      setReviewToDelete(null)
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      {stats && stats.totalReviews > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-3xl font-bold">{stats.averageRating.toFixed(1)}</div>
              <StarRating rating={stats.averageRating} size="md" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-2">
                {stats.totalReviews} รีวิว
              </p>
              <div className="space-y-1">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = stats.ratingDistribution[star as keyof typeof stats.ratingDistribution]
                  const percentage = (count / stats.totalReviews) * 100
                  
                  return (
                    <div key={star} className="flex items-center gap-2 text-sm">
                      <span className="w-12">{star} ดาว</span>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-gray-600">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>ยังไม่มีรีวิว</p>
          <p className="text-sm">เป็นคนแรกที่รีวิว{type === 'shop' ? 'ร้านค้า' : 'สินค้า'}นี้!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              currentUserId={currentUserId}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบรีวิว</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ที่จะลบรีวิวนี้? การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReviewToDelete(null)}>
              ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              ลบรีวิว
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
