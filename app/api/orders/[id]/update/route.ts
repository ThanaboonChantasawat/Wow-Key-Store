import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'
import admin from 'firebase-admin'
import { createNotification } from '@/lib/notification-service'

// Initialize Stripe lazily if needed (legacy)
const stripe = process.env.STRIPE_SECRET_KEY 
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const orderId = id
    const body = await request.json()
    const { 
      status, 
      email, 
      username, 
      password, 
      additionalInfo,
      notes,
      deliveredItems // New field for multiple items
    } = body

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    console.log('Updating order:', orderId, 'status:', status)

    // Get current order
    const orderRef = adminDb.collection('orders').doc(orderId)
    const orderDoc = await orderRef.get()

    if (!orderDoc.exists) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    // Update status if provided
    if (status) {
      updateData.status = status
    }

    // Track if any game account info is provided
    let hasGameAccountInfo = false

    // Update email if provided
    if (email !== undefined) {
      updateData.email = email
      hasGameAccountInfo = true
    }

    // Update username if provided
    if (username !== undefined) {
      updateData.username = username
      hasGameAccountInfo = true
    }

    // Update password if provided
    if (password !== undefined) {
      updateData.password = password
      hasGameAccountInfo = true
    }

    // Update additional info if provided
    if (additionalInfo !== undefined) {
      updateData.additionalInfo = additionalInfo
      hasGameAccountInfo = true
    }

    // Update deliveredItems if provided
    if (deliveredItems !== undefined && Array.isArray(deliveredItems)) {
      updateData.deliveredItems = deliveredItems
      if (deliveredItems.length > 0) {
        hasGameAccountInfo = true
      }
    }

    // Set delivery timestamp if any game account info is provided
    if (hasGameAccountInfo) {
      updateData.gameCodeDeliveredAt = admin.firestore.FieldValue.serverTimestamp()
      updateData.payoutStatus = 'pending' // รอผู้ซื้อยืนยัน
    }

    // Update notes if provided
    if (notes !== undefined) {
      updateData.sellerNotes = notes
    }

    // Handle Cancellation Logic (Refund & Stock Return)
    if (status === 'cancelled' && orderDoc.data()?.status !== 'cancelled') {
      console.log('🚫 Order is being cancelled by seller/admin:', orderId)
      const orderData = orderDoc.data()
      
      // 1. Process Refund if payment was completed
      if (orderData?.paymentStatus === 'completed') {
        console.log('💰 Payment was completed, processing refund...')
        const omise = require('omise')({ secretKey: process.env.OMISE_SECRET_KEY })
        let refundResult: { refundId?: string; amount?: number; status?: string; error?: boolean; message?: string } | null = null

        // Check if this is an Omise payment or Stripe payment
        if (orderData.omiseChargeId) {
          // Omise refund
          try {
            console.log('🔄 Processing Omise refund for charge:', orderData.omiseChargeId)
            
            const refund = await omise.charges.refund(orderData.omiseChargeId, {
              amount: Math.round(orderData.totalAmount * 100), // Convert to satang
              metadata: {
                orderId,
                userId: orderData.userId,
                shopId: orderData.shopId,
                cancelReason: notes || 'Seller cancelled order',
                cancelledBy: 'seller'
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
                amount: Math.round(orderData.totalAmount * 100),
                reason: 'requested_by_customer',
                metadata: {
                  orderId,
                  userId: orderData.userId,
                  shopId: orderData.shopId,
                  cancelReason: notes || 'Seller cancelled order',
                  cancelledBy: 'seller'
                },
              })
              
              refundResult = {
                refundId: refund.id,
                amount: refund.amount / 100,
                status: refund.status || undefined,
              }
              
              console.log('✅ Stripe refund created:', refundResult)
            }
          } catch (refundError: any) {
            console.error('❌ Stripe refund error:', refundError)
             refundResult = {
              error: true,
              message: refundError.message || 'Failed to process Stripe refund',
            }
          }
        }

        // Add refund info to updateData
        if (refundResult) {
          updateData.refund = refundResult
          if (refundResult.error) {
            updateData.refundStatus = 'failed'
            updateData.refundError = refundResult.message
          } else {
            updateData.refundStatus = refundResult.status
            updateData.refundId = refundResult.refundId
            updateData.refundAmount = refundResult.amount
          }
        }
      }

      // 2. Restore Stock
      try {
        console.log('📦 Restoring stock for cancelled order:', orderId)
        const batch = adminDb.batch()
        let updateCount = 0

        const addStockRestore = (productId: string, quantity: number) => {
          if (!productId) return
          const productRef = adminDb.collection('products').doc(productId)
          batch.update(productRef, {
            stock: admin.firestore.FieldValue.increment(quantity),
            soldCount: admin.firestore.FieldValue.increment(-quantity)
          })
          updateCount++
        }

        if (orderData?.type === 'cart_checkout' && orderData.shops && Array.isArray(orderData.shops)) {
          for (const shop of orderData.shops) {
            if (shop.items && Array.isArray(shop.items)) {
              for (const item of shop.items) {
                const qty = item.quantity || 1
                addStockRestore(item.productId, qty)
              }
            }
          }
        } else if (orderData?.items && Array.isArray(orderData.items)) {
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
      }
      
      // Add cancellation metadata
      updateData.cancelledAt = new Date()
      updateData.cancelledBy = 'seller' 
      updateData.cancelReason = notes || 'Seller cancelled order'
    }

    // Update the order
    await orderRef.update(updateData)

    console.log('Order updated successfully:', orderId)

    // 🔔 Send notification to buyer when game code is delivered
    if (hasGameAccountInfo) {
      try {
        const orderData = orderDoc.data()
        
        if (orderData && orderData.userId) {
          await createNotification(
            orderData.userId,
            'order_delivered',
            '📦 รหัสเกมของคุณถูกส่งแล้ว!',
            `รหัสเกมสำหรับคำสั่งซื้อ #${orderId.slice(-8)} ถูกส่งแล้ว กรุณาตรวจสอบและยืนยันการรับสินค้า`,
            `/receipt?orderId=${orderId}`
          )
        }
      } catch (notifError) {
        console.error("Error sending delivery notification:", notifError)
      }
    }

    // Get updated order
    const updatedOrderDoc = await orderRef.get()
    const updatedOrder = {
      id: updatedOrderDoc.id,
      ...updatedOrderDoc.data(),
      createdAt: updatedOrderDoc.data()?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: updatedOrderDoc.data()?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      gameCodeDeliveredAt: updatedOrderDoc.data()?.gameCodeDeliveredAt?.toDate?.()?.toISOString() || null,
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: 'Order updated successfully',
    })
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}
