import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'
import { checkUserBanStatus } from '@/lib/auth-helpers'
import admin from 'firebase-admin'
import { createNotification } from '@/lib/notification-service'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const { userId } = await req.json()

    if (!orderId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // ✅ Check if user is banned
    const banError = await checkUserBanStatus(userId)
    if (banError) {
      return NextResponse.json(
        { error: banError },
        { status: 403 }
      )
    }

    // Get order
    const orderRef = adminDb.collection('orders').doc(orderId)
    const orderDoc = await orderRef.get()

    if (!orderDoc.exists) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const orderData = orderDoc.data()

    // Verify this is the buyer
    if (orderData?.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized - not order owner' },
        { status: 403 }
      )
    }

    // Check if already confirmed
    if (orderData?.buyerConfirmed) {
      return NextResponse.json(
        { error: 'Order already confirmed' },
        { status: 400 }
      )
    }

    // Check if game code was delivered
    if (!orderData?.gameCodeDeliveredAt) {
      return NextResponse.json(
        { error: 'Cannot confirm - game code not delivered yet' },
        { status: 400 }
      )
    }

    // Update order with confirmation
    await orderRef.update({
      buyerConfirmed: true,
      buyerConfirmedAt: admin.firestore.FieldValue.serverTimestamp(),
      payoutStatus: 'ready', // Now seller can withdraw money
      status: 'completed', // Order is completed
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })

    // Update shop stats (totalSales and totalRevenue)
    if (orderData?.shopId) {
      const shopRef = adminDb.collection('shops').doc(orderData.shopId)
      await shopRef.update({
        totalSales: admin.firestore.FieldValue.increment(1),
        totalRevenue: admin.firestore.FieldValue.increment(orderData.totalAmount || 0),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    }

    console.log(`✅ Order ${orderId} confirmed by buyer ${userId}`)

    // 🔔 Notify seller - order confirmed by buyer
    try {
      if (orderData && orderData.shopId) {
        const shopDoc = await adminDb.collection('shops').doc(orderData.shopId).get()
        const shopData = shopDoc.data()
        
        if (shopData && shopData.ownerId) {
          await createNotification(
            shopData.ownerId,
            'order_confirmed',
            '✅ ลูกค้ายืนยันการรับสินค้าแล้ว',
            `ลูกค้ายืนยันการรับสินค้าสำหรับคำสั่งซื้อ #${orderId.slice(-8)} คุณสามารถถอนเงินได้แล้ว`,
            `/seller?tab=orders`
          )
        }
      }
    } catch (notifError) {
      console.error("Error sending order confirmation notification:", notifError)
    }

    return NextResponse.json({ 
      success: true,
      message: 'Order confirmed successfully. Seller can now withdraw payment.'
    })
  } catch (error) {
    console.error('Error confirming order:', error)
    return NextResponse.json(
      { error: 'Failed to confirm order' },
      { status: 500 }
    )
  }
}
