
import { NextRequest, NextResponse } from 'next/server'
import { markMessagesAsRead } from '@/lib/order-chat-service'
import { adminAuth, adminDb } from '@/lib/firebase-admin-config'

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
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
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Determine role
    const orderDoc = await adminDb.collection('orders').doc(params.id).get()
    const orderData = orderDoc.data()

    let userRole: 'buyer' | 'seller' = 'buyer'

    if (orderData?.shopId) {
      const shopDoc = await adminDb.collection('shops').doc(orderData.shopId).get()
      const shopData = shopDoc.data()
      if (shopData?.ownerId === userId) {
        userRole = 'seller'
      }
    }

    // Mark as read
    await markMessagesAsRead(params.id, userId, userRole)

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Error in POST /api/orders/[id]/chat/read:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
