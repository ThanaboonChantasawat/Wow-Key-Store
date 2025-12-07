import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'
import { verifyIdToken } from '@/lib/auth-helpers'

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
      const decodedToken = await verifyIdToken(request)
      if (!decodedToken) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      console.log('[Seller View] User ID:', decodedToken.uid)
      console.log('[Seller View] Order has shopId:', orderData?.shopId)
      console.log('[Seller View] Order has shops:', orderData?.shops?.length || 0)

      // Verify seller ownership
      let isOwner = false

      // Check 1: Direct shopId field
      if (orderData?.shopId) {
        const shopDoc = await adminDb.collection('shops').doc(orderData.shopId).get()
        if (shopDoc.exists) {
          const shopData = shopDoc.data()
          console.log('[Seller View] Shop userId:', shopData?.userId)
          if (shopData?.userId === decodedToken.uid) {
            isOwner = true
            console.log('[Seller View] Owner verified via shopId')
          }
        }
      }

      // Check 2: Cart orders with shops array
      if (!isOwner && orderData?.shops && Array.isArray(orderData.shops)) {
        for (const shop of orderData.shops) {
          const shopDoc = await adminDb.collection('shops').doc(shop.shopId).get()
          if (shopDoc.exists) {
            const shopData = shopDoc.data()
            if (shopData?.userId === decodedToken.uid) {
              isOwner = true
              console.log('[Seller View] Owner verified via shops array')
              break
            }
          }
        }
      }

      // Check 3: Check if user owns ANY shop that matches items in the order
      if (!isOwner && orderData?.items) {
        // Get all shops owned by this user
        const userShopsSnapshot = await adminDb
          .collection('shops')
          .where('userId', '==', decodedToken.uid)
          .get()
        
        const userShopIds = userShopsSnapshot.docs.map(doc => doc.id)
        console.log('[Seller View] User owns shops:', userShopIds)

        // Check if any item in the order belongs to user's shops
        for (const item of orderData.items) {
          if (item.shopId && userShopIds.includes(item.shopId)) {
            isOwner = true
            console.log('[Seller View] Owner verified via item shopId:', item.shopId)
            break
          }
        }
      }

      if (!isOwner) {
        console.log('[Seller View] Access denied - user does not own this order')
        return NextResponse.json(
          { error: 'You do not have permission to view this order' },
          { status: 403 }
        )
      }

      console.log('[Seller View] Access granted')
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
