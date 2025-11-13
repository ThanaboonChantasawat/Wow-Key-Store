'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { MessageSquare, Mail, User, Clock, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

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
  repliedAt: string | null
  repliedBy: string | null
  adminReply: string | null
  adminNotes: string | null
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
  const [filter, setFilter] = useState<string>('all')
  const [replyText, setReplyText] = useState('')
  const [isSendingReply, setIsSendingReply] = useState(false)
  const [replies, setReplies] = useState<Reply[]>([])
  const [isLoadingReplies, setIsLoadingReplies] = useState(false)

  useEffect(() => {
    if (user) {
      fetchMessages()
    }
  }, [user, filter])

  useEffect(() => {
    if (selectedMessage) {
      fetchReplies(selectedMessage.id)
    } else {
      setReplies([])
    }
  }, [selectedMessage])

  const fetchMessages = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const token = await user.getIdToken()
      
      let url = '/api/support?limit=100'
      if (filter !== 'all') {
        url += `&status=${filter}`
      }

      const response = await fetch(url, {
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

  const updateStatus = async (messageId: string, newStatus: 'in-progress' | 'resolved' | 'closed') => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      
      const response = await fetch(`/api/support/${messageId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        // Update local state
        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId ? { ...msg, status: newStatus, updatedAt: new Date().toISOString() } : msg
          )
        )
        
        // Update selected message if it's the one being updated
        if (selectedMessage?.id === messageId) {
          setSelectedMessage(prev => prev ? { ...prev, status: newStatus, updatedAt: new Date().toISOString() } : null)
        }

        // Close modal after status update
        // setSelectedMessage(null)
      } else {
        const data = await response.json()
        toast({
          title: "❌ เกิดข้อผิดพลาด",
          description: data.error || 'ไม่สามารถอัปเดตสถานะได้',
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast({
        title: "❌ เกิดข้อผิดพลาด",
        description: 'ไม่สามารถอัปเดตสถานะได้ กรุณาลองใหม่อีกครั้ง',
        variant: "destructive",
      })
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
          isAdmin: true
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Add new reply to list
        setReplies(prev => [...prev, data.reply])
        
        // Update message last reply info
        setMessages(prev =>
          prev.map(msg =>
            msg.id === selectedMessage.id 
              ? { 
                  ...msg, 
                  lastReplyAt: data.reply.createdAt,
                  lastReplyBy: data.reply.authorEmail,
                  updatedAt: data.reply.createdAt,
                  status: 'in-progress'
                } 
              : msg
          )
        )
        
        if (selectedMessage) {
          setSelectedMessage({
            ...selectedMessage,
            lastReplyAt: data.reply.createdAt,
            lastReplyBy: data.reply.authorEmail,
            status: 'in-progress'
          })
        }
        
        setReplyText('')
        toast({
          title: "✅ ส่งข้อความสำเร็จ!",
          description: "ลูกค้าจะได้รับการแจ้งเตือนทางอีเมล",
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'general':
        return <MessageSquare className="w-4 h-4" />
      case 'account':
        return <User className="w-4 h-4" />
      case 'order':
        return <FileText className="w-4 h-4" />
      case 'report':
        return <AlertCircle className="w-4 h-4" />
      case 'appeal':
        return <XCircle className="w-4 h-4" />
      default:
        return <MessageSquare className="w-4 h-4" />
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
        <h2 className="text-2xl font-bold text-[#292d32] mb-2">ข้อความจากลูกค้า</h2>
        <p className="text-gray-600">จัดการข้อความและคำถามจากลูกค้า</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-[#ff9800] hover:bg-[#e08800]' : ''}
        >
          ทั้งหมด ({messages.length})
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          onClick={() => setFilter('pending')}
          className={filter === 'pending' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
        >
          🕐 รอดำเนินการ
        </Button>
        <Button
          variant={filter === 'in-progress' ? 'default' : 'outline'}
          onClick={() => setFilter('in-progress')}
          className={filter === 'in-progress' ? 'bg-blue-500 hover:bg-blue-600' : ''}
        >
          🔄 กำลังดำเนินการ
        </Button>
        <Button
          variant={filter === 'resolved' ? 'default' : 'outline'}
          onClick={() => setFilter('resolved')}
          className={filter === 'resolved' ? 'bg-green-500 hover:bg-green-600' : ''}
        >
          ✅ แก้ไขแล้ว
        </Button>
      </div>

      {/* Messages List */}
      <div className="space-y-4">
        {messages.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              ไม่มีข้อความ
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
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getCategoryIcon(message.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusBadge(message.status)}
                      <Badge variant="outline">{getCategoryLabel(message.category)}</Badge>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">{message.subject}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">{message.message}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{message.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        <span>{message.email}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{format(new Date(message.createdAt), 'dd MMM HH:mm', { locale: th })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedMessage && (
        <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                รายละเอียดข้อความ
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* Status & Category */}
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge(selectedMessage.status)}
                <Badge variant="outline">{getCategoryLabel(selectedMessage.category)}</Badge>
              </div>

              {/* Subject */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold text-lg text-gray-900">{selectedMessage.subject}</h3>
              </div>

              {/* Sender Info */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-blue-900">ผู้ส่ง</span>
                </div>
                <p className="text-sm text-gray-900 font-medium">{selectedMessage.name}</p>
                <p className="text-sm text-gray-600">{selectedMessage.email}</p>
                {selectedMessage.userId && (
                  <p className="text-xs text-gray-500 mt-1">User ID: {selectedMessage.userId}</p>
                )}
              </div>

              {/* Message */}
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-5 h-5 text-orange-600" />
                  <span className="font-semibold text-orange-900">ข้อความ</span>
                </div>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedMessage.message}</p>
              </div>

              {/* Timestamp */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <span className="font-medium text-purple-900">วันที่ส่ง: </span>
                  <span className="text-purple-800">
                    {format(new Date(selectedMessage.createdAt), 'PPpp', { locale: th })}
                  </span>
                </div>
              </div>

              {/* Conversation Thread */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
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
                              {reply.isAdmin ? '💼' : '👤'} {reply.authorName}
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
                    ✉️ ตอบกลับลูกค้า
                  </label>
                  <textarea
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff9800] focus:border-transparent resize-none"
                    rows={4}
                    placeholder="พิมพ์ข้อความตอบกลับที่นี่... (จะส่งอีเมลแจ้งเตือนไปยังลูกค้า)"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={isSendingReply}
                  />
                  <Button
                    className="w-full mt-3 bg-[#ff9800] hover:bg-[#e08800]"
                    onClick={sendReply}
                    disabled={!replyText.trim() || isSendingReply}
                  >
                    {isSendingReply ? '📤 กำลังส่ง...' : '📨 ส่งข้อความ'}
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 ลูกค้าจะได้รับอีเมลแจ้งเตือนเมื่อคุณส่งข้อความ
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  className="flex-1 bg-blue-500 hover:bg-blue-600"
                  onClick={() => updateStatus(selectedMessage.id, 'in-progress')}
                  disabled={selectedMessage.status === 'in-progress'}
                >
                  🔄 กำลังดำเนินการ
                </Button>
                <Button 
                  className="flex-1 bg-green-500 hover:bg-green-600"
                  onClick={() => updateStatus(selectedMessage.id, 'resolved')}
                  disabled={selectedMessage.status === 'resolved'}
                >
                  ✅ แก้ไขแล้ว
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => updateStatus(selectedMessage.id, 'closed')}
                  disabled={selectedMessage.status === 'closed'}
                >
                  🔒 ปิด
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
