'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { MessageCircle, Trash2, Flag } from 'lucide-react'
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
import { CommentForm } from './comment-form'
import type { ShopComment, ProductComment } from '@/lib/comment-types'

interface CommentCardProps {
  comment: ShopComment | ProductComment
  type: 'shop' | 'product'
  shopId: string
  shopName: string
  productId?: string
  productName?: string
  currentUserId?: string
  onDelete?: (commentId: string) => void
  onReplySuccess?: () => void
  level?: number
}

export function CommentCard({
  comment,
  type,
  shopId,
  shopName,
  productId,
  productName,
  currentUserId,
  onDelete,
  onReplySuccess,
  level = 0
}: CommentCardProps) {
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDescription, setReportDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const isOwner = currentUserId === comment.userId
  const canReply = level < 2 // Only allow 2 levels of nesting
  const { user } = useAuth()
  const { toast } = useToast()

  const handleReplySuccess = () => {
    setShowReplyForm(false)
    if (onReplySuccess) {
      onReplySuccess()
    }
  }

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
          targetType: 'comment',
          targetId: comment.id,
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
        description: error.message || 'ไม่สามารถส่งรายงานได้',
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <div className={level > 0 ? 'ml-8 mt-3' : ''}>
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            {/* Avatar */}
            <Avatar className="w-8 h-8">
              <AvatarImage src={comment.userPhotoURL || undefined} />
              <AvatarFallback>
                {comment.userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            {/* Content */}
            <div className="flex-1 space-y-2">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-medium text-sm">{comment.userName}</span>
                  <p className="text-xs text-gray-500">
                    {format(new Date(comment.createdAt), 'PPp', { locale: th })}
                  </p>
                </div>
                
                <div className="flex gap-1">
                  {/* Delete button for owner */}
                  {isOwner && onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(comment.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 h-6 px-2"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                  
                  {/* Report button for others */}
                  {!isOwner && user && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowReportDialog(true)}
                      className="text-orange-500 hover:text-orange-600 hover:bg-orange-50 h-6 px-2"
                    >
                      <Flag className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Comment Text */}
              <p className="text-sm text-gray-700">{comment.text}</p>
              
              {/* Images */}
              {comment.images && comment.images.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {comment.images.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`คอมเมนต์รูปภาพ ${index + 1}`}
                      className="w-16 h-16 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                    />
                  ))}
                </div>
              )}
              
              {/* Reply Button */}
              {canReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="text-xs h-6 px-2 text-gray-600 hover:text-gray-900"
                >
                  <MessageCircle className="w-3 h-3 mr-1" />
                  ตอบกลับ
                </Button>
              )}
              
              {/* Reply Form */}
              {showReplyForm && (
                <div className="mt-3">
                  <CommentForm
                    type={type}
                    shopId={shopId}
                    shopName={shopName}
                    productId={productId}
                    productName={productName}
                    parentId={comment.id}
                    onSuccess={handleReplySuccess}
                    onCancel={() => setShowReplyForm(false)}
                    placeholder="เขียนคำตอบ..."
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3 mt-3">
          {comment.replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              type={type}
              shopId={shopId}
              shopName={shopName}
              productId={productId}
              productName={productName}
              currentUserId={currentUserId}
              onDelete={onDelete}
              onReplySuccess={onReplySuccess}
              level={level + 1}
            />
          ))}
        </div>
      )}
      
      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>รายงานความคิดเห็นนี้</DialogTitle>
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
                  <RadioGroupItem value="misinformation" id="misinformation" />
                  <Label htmlFor="misinformation" className="font-normal cursor-pointer">
                    ข้อมูลเท็จ หรือหลอกลวง
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
    </div>
  )
}
