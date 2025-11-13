import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

/**
 * TEST MODE ONLY: Bypass payment for testing
 * This endpoint simulates successful payment
 */
export async function POST(request: NextRequest) {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'This endpoint is only available in development mode' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    console.log('🧪 [TEST] Bypassing payment for order:', orderId)
    console.log('🧪 [TEST] Request body:', JSON.stringify(body, null, 2))

    // Get order
    const orderDoc = await adminDb.collection('orders').doc(orderId).get()
    
    if (!orderDoc.exists) {
      console.error('❌ [TEST] Order not found:', orderId)
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const orderData = orderDoc.data()
    
    console.log('🧪 [TEST] Current order status:', {
      id: orderId,
      paymentStatus: orderData?.paymentStatus,
      status: orderData?.status,
      userId: orderData?.userId,
    })

    // Mark order as paid
    await adminDb.collection('orders').doc(orderId).update({
      paymentStatus: 'completed',
      paymentMethod: 'promptpay',
      paidAt: new Date(),
      testBypass: true, // Flag to indicate this was a test bypass
      updatedAt: new Date(),
    })

    console.log('✅ [TEST] Order marked as paid:', orderId)

    // Also update sub-orders if they exist
    if (orderData?.subOrders && Array.isArray(orderData.subOrders)) {
      const batch = adminDb.batch()
      
      for (const subOrderId of orderData.subOrders) {
        const subOrderRef = adminDb.collection('orders').doc(subOrderId)
        batch.update(subOrderRef, {
          paymentStatus: 'completed',
          paidAt: new Date(),
          testBypass: true,
          updatedAt: new Date(),
        })
      }
      
      await batch.commit()
      console.log(`✅ [TEST] ${orderData.subOrders.length} sub-orders marked as paid`)
    }

    return NextResponse.json({
      success: true,
      message: 'Payment bypassed successfully (TEST MODE)',
      orderId,
    })
  } catch (error: any) {
    console.error('❌ Error bypassing payment:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
