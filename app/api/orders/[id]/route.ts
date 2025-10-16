import { NextRequest, NextResponse } from 'next/server'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/components/firebase-config'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    console.log('Fetching order:', orderId)

    // Get order from Firestore
    const orderRef = doc(db, 'orders', orderId)
    const orderDoc = await getDoc(orderRef)

    if (!orderDoc.exists()) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const orderData = orderDoc.data()
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
