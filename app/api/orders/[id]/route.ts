import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'
import { verifyAuth } from '@/lib/auth-helpers'

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

    // Check if request includes sellerView query parameter for seller verification
    const { searchParams } = new URL(request.url)
    const sellerView = searchParams.get('sellerView') === 'true'

    if (sellerView) {
      // Verify authentication for seller view
      const user = await verifyAuth(request)
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      // Verify seller ownership
      let isOwner = false

      // For cart orders (with shops array)
      if (orderData?.shops && Array.isArray(orderData.shops)) {
        for (const shop of orderData.shops) {
          const shopDoc = await adminDb.collection('shops').doc(shop.shopId).get()
          if (shopDoc.exists && shopDoc.data()?.userId === user.uid) {
            isOwner = true
            break
          }
        }
      } 
      // For direct orders (with shopId)
      else if (orderData?.shopId) {
        const shopDoc = await adminDb.collection('shops').doc(orderData.shopId).get()
        if (shopDoc.exists && shopDoc.data()?.userId === user.uid) {
          isOwner = true
        }
      }

      if (!isOwner) {
        return NextResponse.json(
          { error: 'You do not have permission to view this order' },
          { status: 403 }
        )
      }
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
