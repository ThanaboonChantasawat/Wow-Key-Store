"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MessageCircle, Send, Loader2, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-context"
import { OrderMessage } from "@/lib/order-chat-types"
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/components/firebase-config'

interface OrderChatDialogProps {
  orderId: string
  orderNumber: string
  isOpen: boolean
  onClose: () => void
  userRole: 'buyer' | 'seller'
}

export function OrderChatDialog({
  orderId,
  orderNumber,
  isOpen,
  onClose,
  userRole
}: OrderChatDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<OrderMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Real-time messages listener
  useEffect(() => {
    if (isOpen && orderId) {
      setLoading(true)
      
      // Subscribe to messages
      const q = query(
        collection(db, 'orders', orderId, 'messages'),
        orderBy('createdAt', 'asc')
      )

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const newMessages = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
          }
        }) as OrderMessage[]
        
        setMessages(newMessages)
        setLoading(false)
        
        // Mark as read when messages loaded
        markAsRead()
      }, (error) => {
        console.error("Error fetching messages:", error)
        setLoading(false)
      })

      return () => unsubscribe()
    }
  }, [isOpen, orderId])

  const markAsRead = async () => {
    if (!user) return
    try {
      const token = await user.getIdToken()
      await fetch(`/api/orders/${orderId}/chat/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!user || !newMessage.trim()) return

    try {
      setSending(true)

      const token = await user.getIdToken()
      const response = await fetch(`/api/orders/${orderId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: newMessage.trim()
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'เกิดข้อผิดพลาด')
      }

      setNewMessage('')
      // No need to reload, onSnapshot will handle it
    } catch (error: any) {
      console.error('Error sending message:', error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: 'ไม่สามารถส่งข้อความได้ กรุณาลองใหม่อีกครั้ง',
        variant: "destructive"
      })
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] h-[600px] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-600" />
              แชทคำสั่งซื้อ {orderNumber}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>ยังไม่มีข้อความ เริ่มแชทได้เลย!</p>
            </div>
          ) : (
            <>
              {messages.map((message) => {
                const isOwnMessage = message.senderId === user?.uid
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        isOwnMessage
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {!isOwnMessage && (
                        <p className="text-xs font-semibold mb-1">
                          {message.senderName}
                          <span className="ml-2 text-xs opacity-70">
                            ({message.senderRole === 'seller' ? 'ผู้ขาย' : 'ผู้ซื้อ'})
                          </span>
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.message}
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        {new Date(message.createdAt).toLocaleString('th-TH', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: 'short'
                        })}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="px-6 py-4 border-t">
          <div className="flex gap-2">
            <textarea
              className="flex-1 px-3 py-2 border rounded-md resize-none"
              placeholder="พิมพ์ข้อความ... (กด Enter เพื่อส่ง)"
              rows={2}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sending}
            />
            <Button
              onClick={handleSendMessage}
              disabled={sending || !newMessage.trim()}
              className="bg-blue-600 hover:bg-blue-700 self-end"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            ข้อความจะถูกบันทึกเป็นหลักฐานในกรณีมีข้อพิพาท
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
