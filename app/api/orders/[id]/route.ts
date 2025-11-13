import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const orderId = params.id

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    console.log('Fetching order:', orderId)

    // Get order from Firestore
    const orderRef = adminDb.collection('orders').doc(orderId)
    const orderDoc = await orderRef.get()

    if (!orderDoc.exists) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const orderData = orderDoc.data()
    if (!orderData) {
      return NextResponse.json(
        { error: 'Order data is invalid' },
        { status: 500 }
      )
    }

    const order = {
      id: orderDoc.id,
      ...orderData,
      createdAt: orderData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: orderData.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    }

    console.log('Order found:', order.id)

    return NextResponse.json({
      success: true,
      order,
    })
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}
