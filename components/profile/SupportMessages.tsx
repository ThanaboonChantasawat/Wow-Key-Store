'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { MessageSquare, Clock, Send } from 'lucide-react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import Link from 'next/link'

interface SupportMessage {
  id: string
  name: string
  email: string
  subject: string
  category: string
  message: string
  userId: string | null
  status: 'pending' | 'in-progress' | 'resolved' | 'closed'
  createdAt: string
  updatedAt: string
  lastReplyAt?: string
  lastReplyBy?: string
}

interface Reply {
  id: string
  message: string
  isAdmin: boolean
  authorEmail: string
  authorName: string
  authorId: string | null
  createdAt: string
}

export function SupportMessagesContent() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMessage, setSelectedMessage] = useState<SupportMessage | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [isLoadingReplies, setIsLoadingReplies] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [isSendingReply, setIsSendingReply] = useState(false)

  useEffect(() => {
    if (user) {
      fetchMyMessages()
    }
  }, [user])

  useEffect(() => {
    if (selectedMessage) {
      fetchReplies(selectedMessage.id)
    } else {
      setReplies([])
    }
  }, [selectedMessage])

  const fetchMyMessages = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const token = await user.getIdToken()
      
      const response = await fetch(`/api/support?userId=${user.uid}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Error fetching support messages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchReplies = async (messageId: string) => {
    if (!user) return

    try {
      setIsLoadingReplies(true)
      const token = await user.getIdToken()
      
      const response = await fetch(`/api/support/${messageId}/replies`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setReplies(data.replies || [])
      }
    } catch (error) {
      console.error('Error fetching replies:', error)
    } finally {
      setIsLoadingReplies(false)
    }
  }

  const sendReply = async () => {
    if (!user || !selectedMessage || !replyText.trim()) return

    try {
      setIsSendingReply(true)
      const token = await user.getIdToken()
      
      const response = await fetch(`/api/support/${selectedMessage.id}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          message: replyText.trim(),
          isAdmin: false
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Add new reply to list
        setReplies(prev => [...prev, data.reply])
        
        // Update message
        setMessages(prev =>
          prev.map(msg =>
            msg.id === selectedMessage.id 
              ? { 
                  ...msg, 
                  lastReplyAt: data.reply.createdAt,
                  lastReplyBy: data.reply.authorEmail,
                  updatedAt: data.reply.createdAt
                } 
              : msg
          )
        )
        
        setReplyText('')
        toast({
          title: "✅ ส่งข้อความสำเร็จ!",
          description: "ทีมงานจะได้รับการแจ้งเตือนทางอีเมล",
        })
      } else {
        const data = await response.json()
        toast({
          title: "❌ เกิดข้อผิดพลาด",
          description: data.error || 'ไม่สามารถส่งข้อความได้',
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error sending reply:', error)
      toast({
        title: "❌ เกิดข้อผิดพลาด",
        description: 'ไม่สามารถส่งข้อความได้ กรุณาลองใหม่อีกครั้ง',
        variant: "destructive",
      })
    } finally {
      setIsSendingReply(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500">🕐 รอดำเนินการ</Badge>
      case 'in-progress':
        return <Badge className="bg-blue-500">🔄 กำลังดำเนินการ</Badge>
      case 'resolved':
        return <Badge className="bg-green-500">✅ แก้ไขแล้ว</Badge>
      case 'closed':
        return <Badge className="bg-gray-500">🔒 ปิด</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'general': '💬 คำถามทั่วไป',
      'account': '👤 บัญชีและการเข้าสู่ระบบ',
      'order': '📦 คำสั่งซื้อและการชำระเงิน',
      'report': '⚠️ รายงานปัญหา/การละเมิด',
      'appeal': '🙏 ยื่นอุทธรณ์',
      'other': '❓ อื่นๆ'
    }
    return labels[category] || category
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#ff9800] mx-auto mb-4"></div>
        <p className="text-gray-600">กำลังโหลด...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#292d32] mb-2">ข้อความ</h2>
        <p className="text-gray-600">ดูประวัติและติดตามสถานะข้อความที่ส่งไปยังทีมงาน</p>
      </div>

      {/* Messages List */}
      <div className="space-y-4">
        {messages.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">คุณยังไม่มีข้อความที่ส่งไป</p>
              <Link href="/support">
                <Button className="bg-[#ff9800] hover:bg-[#e08800]">
                  ติดต่อทีมงาน
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          messages.map((message) => (
            <Card 
              key={message.id}
              className="hover:shadow-lg transition-all cursor-pointer border-l-4"
              style={{
                borderLeftColor: 
                  message.status === 'pending' ? '#eab308' :
                  message.status === 'in-progress' ? '#3b82f6' :
                  message.status === 'resolved' ? '#22c55e' : '#6b7280'
              }}
              onClick={() => setSelectedMessage(message)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusBadge(message.status)}
                      <Badge variant="outline">{getCategoryLabel(message.category)}</Badge>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">{message.subject}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">{message.message}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{format(new Date(message.createdAt), 'dd MMM HH:mm', { locale: th })}</span>
                      </div>
                      {message.lastReplyAt && (
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          <span>ตอบกลับล่าสุด: {format(new Date(message.lastReplyAt), 'dd MMM HH:mm', { locale: th })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Conversation Modal */}
      {selectedMessage && (
        <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                {selectedMessage.subject}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedMessage.status)}
                <Badge variant="outline">{getCategoryLabel(selectedMessage.category)}</Badge>
              </div>

              {/* Original Message */}
              <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-orange-600" />
                  <span className="font-semibold text-orange-900">ข้อความเริ่มต้น</span>
                  <span className="text-xs text-gray-500 ml-auto">
                    {format(new Date(selectedMessage.createdAt), 'PPp', { locale: th })}
                  </span>
                </div>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedMessage.message}</p>
              </div>

              {/* Conversation Thread */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  💬 การสนทนา ({replies.length} ข้อความ)
                </h3>
                
                {isLoadingReplies ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff9800] mx-auto"></div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto mb-4">
                    {replies.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">ยังไม่มีการตอบกลับ</p>
                    ) : (
                      replies.map((reply) => (
                        <div
                          key={reply.id}
                          className={`p-4 rounded-lg ${
                            reply.isAdmin
                              ? 'bg-blue-50 border-l-4 border-blue-500 ml-4'
                              : 'bg-orange-50 border-l-4 border-orange-500 mr-4'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-sm">
                              {reply.isAdmin ? '💼 ทีมงาน' : '👤 ' + reply.authorName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {format(new Date(reply.createdAt), 'PPp', { locale: th })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">{reply.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Reply Form */}
              {selectedMessage.status !== 'closed' && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block font-semibold text-gray-900 mb-2">
                    💬 ตอบกลับทีมงาน
                  </label>
                  <textarea
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff9800] focus:border-transparent resize-none"
                    rows={4}
                    placeholder="พิมพ์ข้อความของคุณที่นี่..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={isSendingReply}
                  />
                  <Button
                    className="w-full mt-3 bg-[#ff9800] hover:bg-[#e08800]"
                    onClick={sendReply}
                    disabled={!replyText.trim() || isSendingReply}
                  >
                    {isSendingReply ? (
                      <>📤 กำลังส่ง...</>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        ส่งข้อความ
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 ทีมงานจะได้รับการแจ้งเตือนทางอีเมลเมื่อคุณส่งข้อความ
                  </p>
                </div>
              )}

              {selectedMessage.status === 'closed' && (
                <div className="bg-gray-100 p-4 rounded-lg text-center">
                  <p className="text-gray-600">🔒 การสนทนานี้ถูกปิดแล้ว</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
