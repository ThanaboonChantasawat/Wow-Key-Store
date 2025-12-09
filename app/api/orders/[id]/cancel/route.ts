import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'
import * as admin from 'firebase-admin'
// Note: Stripe is no longer used; keep optional lazy initialization if needed
// Initialize Omise lazily inside handler to avoid build-time errors

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const omise = require('omise')({ secretKey: process.env.OMISE_SECRET_KEY })
    const { userId, reason } = await request.json()
    const params = await context.params
    const orderId = params.id

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    console.log('🔄 Attempting to cancel order:', orderId)

    // Get order from Firestore
    const orderRef = adminDb.collection('orders').doc(orderId)
    const orderSnap = await orderRef.get()

    if (!orderSnap.exists) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const orderData = orderSnap.data()
    if (!orderData) {
      return NextResponse.json(
        { error: 'Order data is invalid' },
        { status: 500 }
      )
    }

    // Verify order belongs to user
    if (orderData.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: This order does not belong to you' },
        { status: 403 }
      )
    }

    // Check if order can be cancelled
    if (orderData.status === 'cancelled') {
      return NextResponse.json(
        { 
          error: 'Order already cancelled', 
          currentStatus: orderData.status
        },
        { status: 400 }
      )
    }

    if (orderData.status === 'completed') {
      return NextResponse.json(
        { 
          error: 'Cannot cancel completed order', 
          message: 'This order has already been completed and cannot be cancelled',
          currentStatus: orderData.status
        },
        { status: 400 }
      )
    }

    // Check if payment was completed - need to process refund
    let refundResult: { refundId?: string; amount?: number; status?: string; error?: boolean; message?: string } | null = null
    
    if (orderData.paymentStatus === 'completed') {
      console.log('💰 Payment was completed, processing refund...')
      
      // Check if this is an Omise payment or Stripe payment
      if (orderData.omiseChargeId) {
        // Omise refund
        try {
          console.log('� Processing Omise refund for charge:', orderData.omiseChargeId)
          
          const refund = await omise.charges.refund(orderData.omiseChargeId, {
            amount: orderData.totalAmount * 100, // Convert to satang
            metadata: {
              orderId,
              userId,
              shopId: orderData.shopId,
              cancelReason: reason || 'Customer requested cancellation',
            },
          })
          
          refundResult = {
            refundId: refund.id,
            amount: refund.amount / 100, // Convert back to THB
            status: refund.status || 'pending',
          }
          
          console.log('✅ Omise refund created:', refundResult)
        } catch (refundError: any) {
          console.error('❌ Omise refund error:', refundError)
          refundResult = {
            error: true,
            message: refundError.message || 'Failed to process Omise refund',
          }
        }
      } else if (orderData.paymentIntentId && stripe) {
        // Stripe refund (legacy orders)
        try {
          console.log('💳 Processing Stripe refund for payment intent:', orderData.paymentIntentId)
          
          const paymentIntent: any = await stripe.paymentIntents.retrieve(orderData.paymentIntentId, {
            expand: ['charges'],
          })
          
          const charges = paymentIntent.charges
          if (paymentIntent.status === 'succeeded' && charges?.data && charges.data.length > 0) {
            const chargeId = charges.data[0].id
            
            const refund = await stripe.refunds.create({
              charge: chargeId,
              amount: orderData.totalAmount * 100,
              reason: 'requested_by_customer',
              metadata: {
                orderId,
                userId,
                shopId: orderData.shopId,
                cancelReason: reason || 'Customer requested cancellation',
              },
            })
            
            refundResult = {
              refundId: refund.id,
              amount: refund.amount / 100,
              status: refund.status || undefined,
            }
            
            console.log('✅ Stripe refund created:', refundResult)
          } else {
            console.warn('⚠️ Payment intent not in succeeded state or no charges found')
          }
        } catch (refundError: any) {
          console.error('❌ Stripe refund error:', refundError)
          refundResult = {
            error: true,
            message: refundError.message,
          }
        }
      } else {
        console.warn('⚠️ No payment method found (no omiseChargeId or paymentIntentId)')
        // No refund needed - payment wasn't actually processed
      }
    }

    // Update order status to cancelled
    const updateData: any = {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelledBy: userId,
      cancelReason: reason || 'Customer requested cancellation',
      updatedAt: new Date(),
    }

    // Add refund information if applicable
    if (refundResult) {
      updateData.refund = refundResult
      if (refundResult.error) {
        updateData.refundStatus = 'failed'
        updateData.refundError = refundResult.message
      } else {
        updateData.refundStatus = refundResult.status // 'pending', 'succeeded', 'failed'
        updateData.refundId = refundResult.refundId
        updateData.refundAmount = refundResult.amount
      }
    }

    await orderRef.update(updateData)

    // Restore stock for cancelled items
    try {
      console.log('📦 Restoring stock for cancelled order:', orderId)
      const batch = adminDb.batch()
      let updateCount = 0

      // Helper to add stock update to batch
      const addStockRestore = (productId: string, quantity: number) => {
        if (!productId) return
        const productRef = adminDb.collection('products').doc(productId)
        batch.update(productRef, {
          stock: admin.firestore.FieldValue.increment(quantity),
          soldCount: admin.firestore.FieldValue.increment(-quantity)
        })
        updateCount++
      }

      // Case 1: Cart checkout order with shops array
      if (orderData.type === 'cart_checkout' && orderData.shops && Array.isArray(orderData.shops)) {
        for (const shop of orderData.shops) {
          if (shop.items && Array.isArray(shop.items)) {
            for (const item of shop.items) {
              const qty = item.quantity || 1
              addStockRestore(item.productId, qty)
            }
          }
        }
      }
      // Case 2: Direct order (if any)
      else if (orderData.items && Array.isArray(orderData.items)) {
        for (const item of orderData.items) {
          const qty = item.quantity || 1
          addStockRestore(item.productId, qty)
        }
      }

      if (updateCount > 0) {
        await batch.commit()
        console.log(`✅ Restored stock for ${updateCount} items`)
      }
    } catch (stockError) {
      console.error('❌ Failed to restore stock:', stockError)
      // Don't fail the cancellation if stock restore fails
    }

    console.log('✅ Order cancelled successfully:', orderId)

    const responseMessage = refundResult && !refundResult.error && refundResult.amount
      ? `Order cancelled and refund of ฿${refundResult.amount.toLocaleString()} has been processed`
      : orderData.paymentStatus === 'completed'
      ? 'Order cancelled but refund processing encountered an issue. Please contact support.'
      : 'Order cancelled successfully'

    return NextResponse.json({
      success: true,
      message: responseMessage,
      orderId,
      refund: refundResult,
      paymentWasCompleted: orderData.paymentStatus === 'completed',
    })
  } catch (error: any) {
    console.error('Error cancelling order:', error)
    return NextResponse.json(
      { 
        error: 'Failed to cancel order', 
        message: error.message || 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
