import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'
import admin from 'firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    console.log('🚫 Canceling order:', orderId)

    const orderRef = adminDb.collection('orders').doc(orderId)
    const orderDoc = await orderRef.get()

    if (!orderDoc.exists) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const orderData = orderDoc.data()

    // Only allow canceling pending orders
    if (orderData?.paymentStatus !== 'pending') {
      console.log('⚠️ Order is not pending, cannot cancel:', orderData?.paymentStatus)
      return NextResponse.json(
        { error: 'Only pending orders can be canceled' },
        { status: 400 }
      )
    }

    // Update order status to cancelled
    await orderRef.update({
      paymentStatus: 'cancelled',
      status: 'cancelled',
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    console.log('✅ Order cancelled:', orderId)

    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully',
    })
  } catch (error) {
    console.error('Cancel order error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel order' },
      { status: 500 }
    )
  }
}
