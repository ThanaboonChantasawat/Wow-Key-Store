'use client'

import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { ShieldCheck, Trash2, Flag } from 'lucide-react'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/components/auth-context'
import { StarRating } from './star-rating'
import type { ShopReview, ProductReview } from '@/lib/review-types'

interface ReviewCardProps {
  review: ShopReview | ProductReview
  currentUserId?: string
  onDelete?: (reviewId: string) => void
}

export function ReviewCard({ review, currentUserId, onDelete }: ReviewCardProps) {
  const isOwner = currentUserId === review.userId
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDescription, setReportDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleReport = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'กรุณาเข้าสู่ระบบ',
        description: 'คุณต้องเข้าสู่ระบบก่อนทำการรายงาน',
      })
      return
    }

    if (!reportReason) {
      toast({
        variant: 'destructive',
        title: 'กรุณาเลือกเหตุผล',
        description: 'กรุณาเลือกเหตุผลในการรายงาน',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetType: 'review',
          targetId: review.id,
          reason: reportReason,
          description: reportDescription,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to report')
      }

      toast({
        title: '✅ รายงานสำเร็จ',
        description: data.message || 'ขอบคุณสำหรับการรายงาน ทีมงานจะตรวจสอบโดยเร็ว',
      })

      setShowReportDialog(false)
      setReportReason('')
      setReportDescription('')
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถส่งรายงานได้ กรุณาลองใหม่อีกครั้ง',
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <>
      <Card>
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Avatar */}
          <Avatar className="w-10 h-10">
            <AvatarImage src={review.userPhotoURL || undefined} />
            <AvatarFallback>
              {review.userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          {/* Content */}
          <div className="flex-1 space-y-2">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{review.userName}</span>
                  {review.verified && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <ShieldCheck className="w-3 h-3" />
                      <span>ซื้อแล้ว</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {format(new Date(review.createdAt), 'PPP', { locale: th })}
                </p>
              </div>
              
              {/* Delete button for owner */}
              {isOwner && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(review.id)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              
              {/* Report button for others */}
              {!isOwner && user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReportDialog(true)}
                  className="text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                >
                  <Flag className="w-4 h-4 mr-1" />
                  รายงาน
                </Button>
              )}
            </div>
            
            {/* Rating */}
            <StarRating rating={review.rating} size="sm" showNumber />
            
            {/* Review Text */}
            <p className="text-sm text-gray-700">{review.text}</p>
            
            {/* Images */}
            {review.images && review.images.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {review.images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`รีวิวรูปภาพ ${index + 1}`}
                    className="w-20 h-20 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Report Dialog */}
    <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>รายงานรีวิวนี้</DialogTitle>
          <DialogDescription>
            กรุณาเลือกเหตุผลและอธิบายปัญหาที่คุณพบ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>เหตุผลในการรายงาน</Label>
            <RadioGroup value={reportReason} onValueChange={setReportReason}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="spam" id="spam" />
                <Label htmlFor="spam" className="font-normal cursor-pointer">
                  สแปม หรือโฆษณา
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="offensive" id="offensive" />
                <Label htmlFor="offensive" className="font-normal cursor-pointer">
                  ใช้คำหยาบ หรือไม่เหมาะสม
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fake" id="fake" />
                <Label htmlFor="fake" className="font-normal cursor-pointer">
                  รีวิวปลอม หรือไม่จริง
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="harassment" id="harassment" />
                <Label htmlFor="harassment" className="font-normal cursor-pointer">
                  การล่วงละเมิด หรือคุกคาม
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other" className="font-normal cursor-pointer">
                  อื่นๆ
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">รายละเอียดเพิ่มเติม (ถ้ามี)</Label>
            <Textarea
              id="description"
              placeholder="อธิบายปัญหาเพิ่มเติม..."
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowReportDialog(false)}
            disabled={isSubmitting}
          >
            ยกเลิก
          </Button>
          <Button
            onClick={handleReport}
            disabled={isSubmitting || !reportReason}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isSubmitting ? 'กำลังส่ง...' : 'ส่งรายงาน'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
