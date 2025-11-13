import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'
import Omise from 'omise'

/**
 * Admin API to sync payment status from Omise
 * This is useful when webhooks fail or orders get out of sync
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.OMISE_SECRET_KEY || !process.env.OMISE_PUBLIC_KEY) {
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      )
    }

    const omise = Omise({
      publicKey: process.env.OMISE_PUBLIC_KEY!,
      secretKey: process.env.OMISE_SECRET_KEY!,
    })
    const body = await request.json()
    const { orderId, userId } = body

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    console.log('[Sync Payment] Syncing order:', orderId)

    // Get order from Firestore
    const orderRef = adminDb.collection('orders').doc(orderId)
    const orderDoc = await orderRef.get()

    if (!orderDoc.exists) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const orderData = orderDoc.data()!

    // Check if user matches (security check)
    if (userId && orderData.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get charge ID
    const chargeId = orderData.promptPayChargeId || orderData.omiseChargeId

    if (!chargeId) {
      return NextResponse.json(
        { error: 'No charge ID found for this order' },
        { status: 400 }
      )
    }

    console.log('[Sync Payment] Checking charge:', chargeId)

    // Get charge status from Omise
    const charge = await omise.charges.retrieve(chargeId) as any

    console.log('[Sync Payment] Charge status:', charge.status, 'paid:', charge.paid)

    let updates: any = {}

    if (charge.paid && charge.status === 'successful') {
      // Payment is successful
      updates = {
        paymentStatus: 'completed',
        status: orderData.status || 'pending',
        paidAt: charge.paid_at ? new Date(charge.paid_at) : new Date(),
        updatedAt: new Date(),
      }

      // Update order
      await orderRef.update(updates)

      console.log('[Sync Payment] ✅ Order synced as paid:', orderId)

      return NextResponse.json({
        success: true,
        message: 'Order status synced successfully',
        orderId,
        paymentStatus: 'completed',
        chargeStatus: charge.status,
      })
    } else if (charge.status === 'failed') {
      // Payment failed
      updates = {
        paymentStatus: 'failed',
        updatedAt: new Date(),
      }

      await orderRef.update(updates)

      console.log('[Sync Payment] ❌ Order synced as failed:', orderId)

      return NextResponse.json({
        success: true,
        message: 'Order status synced successfully',
        orderId,
        paymentStatus: 'failed',
        chargeStatus: charge.status,
      })
    } else if (charge.status === 'expired') {
      // Payment expired
      updates = {
        paymentStatus: 'failed',
        status: 'cancelled',
        updatedAt: new Date(),
      }

      await orderRef.update(updates)

      console.log('[Sync Payment] ⏰ Order synced as expired:', orderId)

      return NextResponse.json({
        success: true,
        message: 'Order status synced successfully',
        orderId,
        paymentStatus: 'failed',
        chargeStatus: charge.status,
      })
    } else {
      // Still pending
      return NextResponse.json({
        success: true,
        message: 'Payment still pending',
        orderId,
        paymentStatus: 'pending',
        chargeStatus: charge.status,
      })
    }
  } catch (error: any) {
    console.error('[Sync Payment] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to sync payment status',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
