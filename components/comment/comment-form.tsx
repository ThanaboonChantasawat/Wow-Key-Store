'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/components/auth-context'

interface CommentFormProps {
  type: 'shop' | 'product'
  shopId: string
  shopName: string
  productId?: string
  productName?: string
  parentId?: string
  onSuccess?: () => void
  onCancel?: () => void
  placeholder?: string
}

export function CommentForm({
  type,
  shopId,
  shopName,
  productId,
  productName,
  parentId,
  onSuccess,
  onCancel,
  placeholder = 'เขียนคอมเมนต์...'
}: CommentFormProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'กรุณาเข้าสู่ระบบ',
        description: 'คุณต้องเข้าสู่ระบบก่อนแสดงความคิดเห็น'
      })
      return
    }
    
    if (!text.trim()) {
      toast({
        variant: 'destructive',
        title: 'กรุณาเขียนคอมเมนต์',
        description: 'กรุณาเขียนคอมเมนต์ก่อนส่ง'
      })
      return
    }

    // Validate required fields based on type
    if (type === 'shop') {
      if (!shopId || !shopName) {
        console.error('Missing shop info:', { shopId, shopName })
        toast({
          variant: 'destructive',
          title: 'ข้อมูลไม่ครบถ้วน',
          description: 'ไม่พบข้อมูลร้านค้า กรุณาลองใหม่อีกครั้ง'
        })
        return
      }
    } else if (type === 'product') {
      if (!productId || !productName || !shopId || !shopName) {
        console.error('Missing product/shop info:', { 
          productId: productId || 'MISSING', 
          productName: productName || 'MISSING', 
          shopId: shopId || 'MISSING', 
          shopName: shopName || 'MISSING' 
        })
        toast({
          variant: 'destructive',
          title: 'ข้อมูลไม่ครบถ้วน',
          description: 'ไม่พบข้อมูลสินค้าหรือร้านค้า กรุณาลองใหม่อีกครั้ง'
        })
        return
      }
    }
    
    setLoading(true)
    
    try {
      // Get auth token
      const token = await user.getIdToken()
      
      const res = await fetch('/api/comments', {
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
          text,
          parentId
        })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit comment')
      }
      
      toast({
        title: '✅ ส่งคอมเมนต์สำเร็จ!',
        description: 'คอมเมนต์ของคุณถูกเผยแพร่แล้ว'
      })
      
      // Reset form
      setText('')
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error('Error submitting comment:', error)
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: error.message || 'ไม่สามารถส่งคอมเมนต์ได้'
      })
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        rows={parentId ? 2 : 3}
        disabled={loading}
        className="resize-none"
      />
      
      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={loading}
          >
            ยกเลิก
          </Button>
        )}
        
        <Button
          type="submit"
          size="sm"
          disabled={loading}
        >
          {loading ? 'กำลังส่ง...' : 'ส่งคอมเมนต์'}
        </Button>
      </div>
    </form>
  )
}
