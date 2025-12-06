import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'
import admin from 'firebase-admin'
import { processSellerPayoutViaOmise } from '@/lib/omise-transfer-service'
import { createNotification } from '@/lib/notification-service'

/**
 * Omise Webhook Handler
 * Handle payment notifications from Omise
 * 
 * Events handled:
 * - charge.complete: Payment completed successfully
 * - charge.failed: Payment failed
 * - charge.expired: Payment QR code expired
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('🔔 Omise Webhook received:', {
      event: body.key,
      objectType: body.data?.object,
      chargeId: body.data?.id,
    })

    const eventType = body.key
    const chargeData = body.data

    if (!chargeData || chargeData.object !== 'charge') {
      console.log('⚠️ Webhook is not for a charge, ignoring')
      return NextResponse.json({ received: true })
    }

    const chargeId = chargeData.id
    const status = chargeData.status
    const paid = chargeData.paid
    const metadata = chargeData.metadata || {}
    const orderId = metadata.orderId

    console.log('📱 Charge details:', {
      chargeId,
      status,
      paid,
      orderId,
      event: eventType,
    })

    // Handle charge.complete event (payment successful)
    if (eventType === 'charge.complete' && paid && status === 'successful') {
      console.log('✅ Payment successful:', chargeId)
        
      if (!orderId) {
        console.error('❌ No orderId in charge metadata')
        return NextResponse.json({ received: true })
      }

      // Update order status
      const orderRef = adminDb.collection('orders').doc(orderId)
      const orderDoc = await orderRef.get()

      if (!orderDoc.exists) {
        console.error('❌ Order not found:', orderId)
        return NextResponse.json({ received: true })
      }

      const orderData = orderDoc.data()

      // Prevent double processing
      if (orderData?.paymentStatus === 'completed') {
        console.log('⚠️ Order already completed:', orderId)
        return NextResponse.json({ received: true })
      }

      // Update main order
      await orderRef.update({
        paymentStatus: 'completed',
        status: 'pending',
        omiseChargeId: chargeId,
        omiseStatus: status,
        omisePaid: paid,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      console.log('✅ Main order updated:', orderId)

      // Update stock for purchased items
      try {
        console.log('📦 Updating stock for purchased items...')
        const batch = adminDb.batch()
        let updateCount = 0

        // Helper to add stock update to batch
        const addStockUpdate = (productId: string, quantity: number) => {
          if (!productId) return
          const productRef = adminDb.collection('products').doc(productId)
          batch.update(productRef, {
            stock: admin.firestore.FieldValue.increment(-quantity),
            soldCount: admin.firestore.FieldValue.increment(quantity)
          })
          updateCount++
        }

        // Case 1: Cart checkout order with shops array
        if (orderData.type === 'cart_checkout' && orderData.shops && Array.isArray(orderData.shops)) {
          for (const shop of orderData.shops) {
            if (shop.items && Array.isArray(shop.items)) {
              for (const item of shop.items) {
                const qty = item.quantity || 1
                addStockUpdate(item.productId, qty)
              }
            }
          }
        }
        // Case 2: Direct order (if any)
        else if (orderData.items && Array.isArray(orderData.items)) {
          for (const item of orderData.items) {
            const qty = item.quantity || 1
            addStockUpdate(item.productId, qty)
          }
        }

        if (updateCount > 0) {
          await batch.commit()
          console.log(`✅ Updated stock for ${updateCount} items`)
        }
      } catch (stockError) {
        console.error('❌ Failed to update stock:', stockError)
        // Don't fail the webhook, just log error
      }

      // 🔔 Notify buyer - payment successful
      try {
        if (orderData && orderData.userId) {
          await createNotification(
            orderData.userId,
            'payment_received',
            '💳 การชำระเงินสำเร็จ',
            `การชำระเงินสำหรับคำสั่งซื้อ #${orderId.slice(-8)} เสร็จสมบูรณ์แล้ว`,
            `/receipt?orderId=${orderId}`
          )
        }
      } catch (notifError) {
        console.error("Error sending payment notification to buyer:", notifError)
      }

      // 🔔 Notify sellers - new order
      try {
        if (orderData) {
          // For direct orders (single shop)
          if (orderData.shopId) {
            const shopDoc = await adminDb.collection('shops').doc(orderData.shopId).get()
            const shopData = shopDoc.data()
            
            if (shopData && shopData.ownerId) {
              await createNotification(
                shopData.ownerId,
                'new_order',
                '🛒 คุณมีคำสั่งซื้อใหม่!',
                `มีคำสั่งซื้อใหม่สำหรับร้าน "${orderData.shopName}" จำนวนเงิน ${orderData.sellerAmount} บาท`,
                `/seller?tab=orders`
              )
            }
          }

          // For cart checkout orders (multiple shops)
          if (orderData.shops && Array.isArray(orderData.shops)) {
            for (const shop of orderData.shops) {
              if (shop.shopId) {
                const shopDoc = await adminDb.collection('shops').doc(shop.shopId).get()
                const shopData = shopDoc.data()
                
                if (shopData && shopData.ownerId) {
                  await createNotification(
                    shopData.ownerId,
                    'new_order',
                    '🛒 คุณมีคำสั่งซื้อใหม่!',
                    `มีคำสั่งซื้อใหม่สำหรับร้าน "${shop.shopName}" จำนวนเงิน ${shop.sellerAmount} บาท`,
                    `/seller?tab=orders`
                  )
                }
              }
            }
          }
        }
      } catch (notifError) {
        console.error("Error sending order notifications to sellers:", notifError)
      }

      // Auto-transfer money to sellers immediately
      try {
        console.log('💰 Processing auto-transfer to sellers...')

        if (!orderData) {
          console.error('❌ Order data not found for auto-transfer')
          throw new Error('Order data not found')
        }

        // For direct orders (single shop)
        if (orderData.shopId && orderData.sellerAmount) {
          const sellerAmount = Number(orderData.sellerAmount)
          
          if (sellerAmount > 0) {
            console.log(`💸 Transferring ${sellerAmount} THB to shop ${orderData.shopId}`)
            
            const transferResult = await processSellerPayoutViaOmise(
              orderData.shopId,
              sellerAmount,
              orderId,
              `Auto-payout for order ${orderId} - ${orderData.shopName || 'Shop'}`
            )

            if (transferResult.success) {
              console.log('✅ Auto-transfer successful:', transferResult.transferId)
              
              // Update order with transfer info
              await orderRef.update({
                sellerPaid: true,
                sellerPaidAt: admin.firestore.FieldValue.serverTimestamp(),
                omiseTransferId: transferResult.transferId,
                transferStatus: transferResult.status,
              })
            } else {
              console.error('❌ Auto-transfer failed:', transferResult.message)
              // Log error but don't fail webhook
              await adminDb.collection('transfer_errors').add({
                orderId,
                shopId: orderData.shopId,
                amount: sellerAmount,
                error: transferResult.message,
                timestamp: new Date(),
              })
            }
          }
        }

        // For cart checkout orders (multiple shops)
        if (orderData.shops && Array.isArray(orderData.shops)) {
          console.log(`💸 Processing transfers for ${orderData.shops.length} shops...`)
          
          for (const shop of orderData.shops) {
            const sellerAmount = Number(shop.sellerAmount) || 0
            
            if (sellerAmount > 0 && shop.shopId) {
              console.log(`💸 Transferring ${sellerAmount} THB to shop ${shop.shopId}`)
              
              const transferResult = await processSellerPayoutViaOmise(
                shop.shopId,
                sellerAmount,
                orderId,
                `Auto-payout for order ${orderId} - ${shop.shopName || 'Shop'}`
              )

              if (transferResult.success) {
                console.log(`✅ Transfer successful for shop ${shop.shopId}:`, transferResult.transferId)
              } else {
                console.error(`❌ Transfer failed for shop ${shop.shopId}:`, transferResult.message)
                // Log error but continue with other shops
                await adminDb.collection('transfer_errors').add({
                  orderId,
                  shopId: shop.shopId,
                  amount: sellerAmount,
                  error: transferResult.message,
                  timestamp: new Date(),
                })
              }
            }
          }
          
          // Mark main order as seller paid
          await orderRef.update({
            sellerPaid: true,
            sellerPaidAt: admin.firestore.FieldValue.serverTimestamp(),
          })
        }

        console.log('✅ Auto-transfer process completed')
      } catch (transferError: any) {
        console.error('❌ Auto-transfer error:', transferError)
        // Log error but don't fail the webhook
        await adminDb.collection('transfer_errors').add({
          orderId,
          error: transferError.message || 'Unknown transfer error',
          timestamp: new Date(),
        })
      }

      // Clear cart items after successful payment
      if (orderData?.cartItemIds && Array.isArray(orderData.cartItemIds) && orderData.cartItemIds.length > 0) {
        try {
          const userId = orderData.userId
          console.log('🧹 Clearing cart items for user:', userId, 'items:', orderData.cartItemIds)
          
          const batch = adminDb.batch()
          let deletedCount = 0
          
          for (const itemId of orderData.cartItemIds) {
            // Cart uses individual documents with pattern: {userId}_{itemId}
            const cartItemRef = adminDb.collection('cart').doc(`${userId}_${itemId}`)
            batch.delete(cartItemRef)
            deletedCount++
          }
          
          await batch.commit()
          console.log(`✅ Cleared ${deletedCount} items from cart after successful payment`)
        } catch (cartError) {
          console.error('⚠️ Failed to clear cart items:', cartError)
          // Don't fail the webhook if cart clearing fails
        }
      }

      // Clear sessionStorage items (will be handled by frontend after redirect)
      
      // Update sub-orders if they exist
      if (orderData?.subOrders && Array.isArray(orderData.subOrders)) {
        const batch = adminDb.batch()
        
        for (const subOrderId of orderData.subOrders) {
          const subOrderRef = adminDb.collection('orders').doc(subOrderId)
          batch.update(subOrderRef, {
            paymentStatus: 'completed',
            status: 'pending',
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          })
        }
        
        await batch.commit()
        console.log(`✅ ${orderData.subOrders.length} sub-orders updated`)
      }

      // TODO: Send confirmation email
      // TODO: Notify seller
      
    } else if (eventType === 'charge.failed' || (eventType === 'charge.complete' && status === 'failed')) {
      console.log('❌ Payment failed:', chargeId)
      
      if (orderId) {
        await adminDb.collection('orders').doc(orderId).update({
          paymentStatus: 'failed',
          omiseChargeId: chargeId,
          omiseFailureCode: chargeData.failure_code,
          paymentFailureReason: chargeData.failure_message || 'Payment failed',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        console.log('✅ Order marked as failed:', orderId)
      }
      
    } else if (eventType === 'charge.expired' || (eventType === 'charge.complete' && status === 'expired')) {
      console.log('⏰ Payment expired:', chargeId)
      
      if (orderId) {
        await adminDb.collection('orders').doc(orderId).update({
          paymentStatus: 'expired',
          omiseChargeId: chargeId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        console.log('✅ Order marked as expired:', orderId)
      }
    } else {
      console.log(`ℹ️ Unhandled charge status: ${status} for event: ${eventType}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('❌ Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
