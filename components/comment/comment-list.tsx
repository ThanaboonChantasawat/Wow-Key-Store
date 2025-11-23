'use client'

import { useEffect, useState } from 'react'
import { CommentCard } from './comment-card'
import { CommentForm } from './comment-form'
import { useToast } from '@/hooks/use-toast'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ShopComment, ProductComment } from '@/lib/comment-types'
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
} from "@/components/ui/alert-dialog"

interface CommentListProps {
  type: 'shop' | 'product'
  shopId: string
  shopName: string
  productId?: string
  productName?: string
  currentUserId?: string
  showForm?: boolean
}

const COMMENTS_PER_PAGE = 10

export function CommentList({
  type,
  shopId,
  shopName,
  productId,
  productName,
  currentUserId,
  showForm = true
}: CommentListProps) {
  const [comments, setComments] = useState<(ShopComment | ProductComment)[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()
  
  const fetchComments = async () => {
    try {
      const params = new URLSearchParams({
        limit: '1000' // Fetch all to handle pagination on client
      })
      
      if (type === 'shop') {
        params.append('shopId', shopId)
      } else if (type === 'product' && productId) {
        params.append('productId', productId)
      }
      
      const res = await fetch(`/api/comments?${params}`)
      const data = await res.json()
      
      if (res.ok) {
        setComments(data.comments || [])
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchComments()
  }, [type, shopId, productId])
  
  const handleDelete = (commentId: string) => {
    setCommentToDelete(commentId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!commentToDelete || !user) return

    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/comments', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ commentId: commentToDelete, type })
      })
      
      if (res.ok) {
        toast({
          title: '✅ ลบคอมเมนต์สำเร็จ',
          description: 'คอมเมนต์ของคุณถูกลบแล้ว'
        })
        // Refresh comments
        fetchComments()
      } else {
        throw new Error('Failed to delete comment')
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: error.message || 'ไม่สามารถลบคอมเมนต์ได้'
      })
    } finally {
      setDeleteDialogOpen(false)
      setCommentToDelete(null)
    }
  }

  // Pagination
  const totalPages = Math.ceil(comments.length / COMMENTS_PER_PAGE)
  const startIndex = (currentPage - 1) * COMMENTS_PER_PAGE
  const endIndex = startIndex + COMMENTS_PER_PAGE
  const currentComments = comments.slice(startIndex, endIndex)

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    // Scroll to top of comments section
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
      {/* Comment Form */}
      {showForm && currentUserId && (
        <>
          <div>
            <h3 className="font-semibold mb-4">แสดงความคิดเห็น</h3>
            <CommentForm
              type={type}
              shopId={shopId}
              shopName={shopName}
              productId={productId}
              productName={productName}
              onSuccess={() => {
                fetchComments()
                setCurrentPage(1) // Reset to first page after new comment
              }}
            />
          </div>
          <Separator />
        </>
      )}
      
      {/* Comments List */}
      <div>
        <h3 className="font-semibold mb-4">
          ความคิดเห็น ({comments.length})
        </h3>
        
        {comments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>ยังไม่มีความคิดเห็น</p>
            <p className="text-sm">เป็นคนแรกที่แสดงความคิดเห็น!</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {currentComments.map((comment) => (
                <CommentCard
                  key={comment.id}
                  comment={comment}
                  type={type}
                  shopId={shopId}
                  shopName={shopName}
                  productId={productId}
                  productName={productName}
                  currentUserId={currentUserId}
                  onDelete={handleDelete}
                  onReplySuccess={fetchComments}
                />
            ))}
            </div>

            {/* Pagination - Steam Style */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  ก่อนหน้า
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page and pages around current
                    const showPage = 
                      page === 1 || 
                      page === totalPages || 
                      (page >= currentPage - 1 && page <= currentPage + 1)

                    if (!showPage) {
                      // Show ellipsis
                      if (page === currentPage - 2 || page === currentPage + 2) {
                        return (
                          <span key={page} className="px-2 text-gray-400">
                            ...
                          </span>
                        )
                      }
                      return null
                    }

                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className={
                          currentPage === page
                            ? "bg-[#ff9800] hover:bg-[#f57c00] text-white min-w-[36px]"
                            : "min-w-[36px]"
                        }
                      >
                        {page}
                      </Button>
                    )
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="gap-1"
                >
                  ถัดไป
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Page Info */}
            {totalPages > 1 && (
              <div className="text-center text-sm text-gray-500 mt-2">
                แสดง {startIndex + 1}-{Math.min(endIndex, comments.length)} จาก {comments.length} ความคิดเห็น
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Comment Alert Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบคอมเมนต์</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบคอมเมนต์นี้? การกระทำนี้ไม่สามารถย้อนคืนได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              ลบคอมเมนต์
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
