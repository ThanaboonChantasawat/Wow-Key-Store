// Order Chat System Types

export interface OrderMessage {
  id: string
  orderId: string
  senderId: string
  senderName: string
  senderRole: 'buyer' | 'seller' | 'admin'
  message: string
  attachments?: string[]  // URLs ของไฟล์แนบ (screenshots)
  isRead: boolean
  createdAt: Date
}

export interface OrderChat {
  orderId: string
  buyerId: string
  sellerId: string
  shopId: string
  messages: OrderMessage[]
  lastMessageAt: Date
  buyerUnreadCount: number
  sellerUnreadCount: number
  createdAt: Date
  updatedAt: Date
}

export interface SendMessageRequest {
  orderId: string
  message: string
  attachments?: string[]
}
