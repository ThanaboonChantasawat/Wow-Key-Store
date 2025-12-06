// Order Chat Service
// Handles real-time messaging between buyer and seller

import { adminDb } from './firebase-admin-config'
import { OrderMessage, OrderChat, SendMessageRequest } from './order-chat-types'
import { createNotification } from './notification-service'

/**
 * Send a message in order chat
 */
export async function sendOrderMessage(
  userId: string,
  userRole: 'buyer' | 'seller',
  data: SendMessageRequest
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // ตรวจสอบว่า Order มีอยู่จริง
    const orderDoc = await adminDb.collection('orders').doc(data.orderId).get()
    
    if (!orderDoc.exists) {
      return { success: false, error: 'ไม่พบคำสั่งซื้อ' }
    }

    const orderData = orderDoc.data()

    // ตรวจสอบสิทธิ์
    let isBuyer = false
    let isSeller = false

    if (userRole === 'buyer' && orderData?.userId === userId) {
      isBuyer = true
    }

    if (userRole === 'seller' && orderData?.shopId) {
      const shopDoc = await adminDb.collection('shops').doc(orderData.shopId).get()
      const shopData = shopDoc.data()
      if (shopData?.ownerId === userId) {
        isSeller = true
      }
    }

    if (!isBuyer && !isSeller) {
      return { success: false, error: 'คุณไม่มีสิทธิ์ในการส่งข้อความ' }
    }

    // ดึงข้อมูลผู้ส่ง
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()

    const message: Omit<OrderMessage, 'id'> = {
      orderId: data.orderId,
      senderId: userId,
      senderName: userData?.displayName || 'User',
      senderRole: userRole,
      message: data.message,
      attachments: data.attachments || [],
      isRead: false,
      createdAt: new Date()
    }

    // บันทึกข้อความ
    const messageRef = await adminDb
      .collection('orders')
      .doc(data.orderId)
      .collection('messages')
      .add(message)

    // อัพเดทสถานะ Chat
    const chatRef = adminDb.collection('orderChats').doc(data.orderId)
    const chatDoc = await chatRef.get()

    if (chatDoc.exists) {
      // อัพเดท Chat ที่มีอยู่
      const updates: any = {
        lastMessageAt: new Date(),
        updatedAt: new Date()
      }

      if (isBuyer) {
        updates.sellerUnreadCount = (chatDoc.data()?.sellerUnreadCount || 0) + 1
      } else {
        updates.buyerUnreadCount = (chatDoc.data()?.buyerUnreadCount || 0) + 1
      }

      await chatRef.update(updates)
    } else {
      // สร้าง Chat ใหม่
      const chat: OrderChat = {
        orderId: data.orderId,
        buyerId: orderData.userId,
        sellerId: orderData.sellerId || '',
        shopId: orderData.shopId,
        messages: [],
        lastMessageAt: new Date(),
        buyerUnreadCount: isSeller ? 1 : 0,
        sellerUnreadCount: isBuyer ? 1 : 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Get seller ID
      if (orderData.shopId) {
        const shopDoc = await adminDb.collection('shops').doc(orderData.shopId).get()
        const shopData = shopDoc.data()
        if (shopData?.ownerId) {
          chat.sellerId = shopData.ownerId
        }
      }

      await chatRef.set(chat)
    }

    // Determine recipient ID
    let recipientId = ''
    
    if (isBuyer) {
      // If sender is buyer, recipient is seller
      if (chatDoc.exists && chatDoc.data()?.sellerId) {
        recipientId = chatDoc.data()?.sellerId
      } else if (orderData.sellerId) {
        recipientId = orderData.sellerId
      } else if (orderData.shopId) {
        // Fallback: fetch shop owner again if needed (though we did it above for new chat)
        // We can reuse the logic if we refactor, but for now let's just fetch if we don't have it
        const shopDoc = await adminDb.collection('shops').doc(orderData.shopId).get()
        const shopData = shopDoc.data()
        if (shopData?.ownerId) {
          recipientId = shopData.ownerId
        }
      }
    } else {
      // If sender is seller, recipient is buyer
      recipientId = orderData.userId
    }

    if (recipientId) {
      const link = isBuyer ? '/seller' : '/profile?tab=my-orders'
      
      await createNotification(
        recipientId,
        'info',
        'ข้อความใหม่ในคำสั่งซื้อ',
        `${userData?.displayName || 'ผู้ใช้'}: ${data.message.substring(0, 50)}${data.message.length > 50 ? '...' : ''}`,
        link
      )
    }

    console.log(`✅ Sent message in order ${data.orderId}`)

    return { success: true, messageId: messageRef.id }

  } catch (error: any) {
    console.error('Error sending order message:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get messages for an order
 */
export async function getOrderMessages(
  orderId: string,
  userId: string,
  userRole: 'buyer' | 'seller'
): Promise<{ success: boolean; messages?: OrderMessage[]; error?: string }> {
  try {
    // ตรวจสอบสิทธิ์
    const orderDoc = await adminDb.collection('orders').doc(orderId).get()
    
    if (!orderDoc.exists) {
      return { success: false, error: 'ไม่พบคำสั่งซื้อ' }
    }

    const orderData = orderDoc.data()

    let hasAccess = false

    if (userRole === 'buyer' && orderData?.userId === userId) {
      hasAccess = true
    }

    if (userRole === 'seller' && orderData?.shopId) {
      const shopDoc = await adminDb.collection('shops').doc(orderData.shopId).get()
      const shopData = shopDoc.data()
      if (shopData?.ownerId === userId) {
        hasAccess = true
      }
    }

    if (!hasAccess) {
      return { success: false, error: 'คุณไม่มีสิทธิ์ดูข้อความ' }
    }

    // ดึงข้อความ
    const messagesSnapshot = await adminDb
      .collection('orders')
      .doc(orderId)
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .get()

    const messages: OrderMessage[] = messagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
    })) as OrderMessage[]

    // อัพเดทสถานะอ่านแล้ว
    const chatRef = adminDb.collection('orderChats').doc(orderId)
    const updates: any = {}

    if (userRole === 'buyer') {
      updates.buyerUnreadCount = 0
    } else {
      updates.sellerUnreadCount = 0
    }

    await chatRef.update(updates)

    return { success: true, messages }

  } catch (error: any) {
    console.error('Error getting order messages:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(
  orderId: string,
  userId: string,
  userRole: 'buyer' | 'seller'
): Promise<{ success: boolean }> {
  try {
    const chatRef = adminDb.collection('orderChats').doc(orderId)
    const updates: any = {}

    if (userRole === 'buyer') {
      updates.buyerUnreadCount = 0
    } else {
      updates.sellerUnreadCount = 0
    }

    await chatRef.update(updates)

    return { success: true }

  } catch (error) {
    console.error('Error marking messages as read:', error)
    return { success: false }
  }
}

/**
 * Get unread message count for user
 */
export async function getUnreadMessageCount(
  userId: string,
  userRole: 'buyer' | 'seller'
): Promise<number> {
  try {
    const field = userRole === 'buyer' ? 'buyerId' : 'sellerId'
    const countField = userRole === 'buyer' ? 'buyerUnreadCount' : 'sellerUnreadCount'

    const chatsSnapshot = await adminDb
      .collection('orderChats')
      .where(field, '==', userId)
      .get()

    let totalUnread = 0

    chatsSnapshot.docs.forEach(doc => {
      const data = doc.data()
      totalUnread += data[countField] || 0
    })

    return totalUnread

  } catch (error) {
    console.error('Error getting unread message count:', error)
    return 0
  }
}
