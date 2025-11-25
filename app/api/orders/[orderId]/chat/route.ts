// API Route: POST /api/orders/[orderId]/chat
// Send a message in order chat

import { NextRequest, NextResponse } from 'next/server'
import { sendOrderMessage } from '@/lib/order-chat-service'
import { verifyIdToken, adminDb } from '@/lib/firebase-admin-config'

export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await verifyIdToken(token)
    const userId = decodedToken.uid

    // Parse request body
    const body = await request.json()
    const { message, attachments } = body

    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: 'ข้อความต้องไม่เป็นค่าว่าง' },
        { status: 400 }
      )
    }

    // ตรวจสอบ role
    const orderDoc = await adminDb.collection('orders').doc(params.orderId).get()
    const orderData = orderDoc.data()

    let userRole: 'buyer' | 'seller' = 'buyer'

    if (orderData?.shopId) {
      const shopDoc = await adminDb.collection('shops').doc(orderData.shopId).get()
      const shopData = shopDoc.data()
      if (shopData?.ownerId === userId) {
        userRole = 'seller'
      }
    }

    // Send message
    const result = await sendOrderMessage(userId, userRole, {
      orderId: params.orderId,
      message: message.trim(),
      attachments: attachments || []
    })

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Error in POST /api/orders/[orderId]/chat:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
