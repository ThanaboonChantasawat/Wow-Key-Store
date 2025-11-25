// API Route: GET /api/orders/[orderId]/chat
// Get messages for an order

import { NextRequest, NextResponse } from 'next/server'
import { getOrderMessages } from '@/lib/order-chat-service'
import { verifyIdToken, adminDb } from '@/lib/firebase-admin-config'

export async function GET(
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

    // Get messages
    const result = await getOrderMessages(params.orderId, userId, userRole)

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Error in GET /api/orders/[orderId]/chat:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
