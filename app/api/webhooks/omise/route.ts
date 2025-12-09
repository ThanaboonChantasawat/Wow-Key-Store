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

      // Get all order IDs (support multi-shop checkout)
      const orderIdsJson = metadata?.orderIds
      const allOrderIds: string[] = orderIdsJson ? JSON.parse(orderIdsJson) : [orderId]
      
      console.log('📦 Updating orders:', allOrderIds)

      // Collect cart item IDs from all orders
      const allCartItemIds = new Set<string>()
      let userId: string | null = null

      // Process all orders
      for (const currentOrderId of allOrderIds) {
        const orderRef = adminDb.collection('orders').doc(currentOrderId)
        const orderDoc = await orderRef.get()

        if (!orderDoc.exists) {
          console.error('❌ Order not found:', currentOrderId)
          continue
        }

        const orderData = orderDoc.data()
        
        // Collect userId (same for all orders)
        if (!userId && orderData?.userId) {
          userId = orderData.userId
        }
        
        // Collect cart item IDs
        if (orderData?.cartItemIds && Array.isArray(orderData.cartItemIds)) {
          orderData.cartItemIds.forEach((id: string) => allCartItemIds.add(id))
        }

        // Prevent double processing
        if (orderData?.paymentStatus === 'completed') {
          console.log('⚠️ Order already completed:', currentOrderId)
          continue
        }

        // Update order
        await orderRef.update({
          paymentStatus: 'completed',
          status: 'processing',
          omiseChargeId: chargeId,
          omiseStatus: status,
          omisePaid: paid,
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })

        console.log('✅ Order updated:', currentOrderId)
      }

      // Update stock for ALL purchased items across all orders
      try {
        console.log('📦 [WEBHOOK] Updating stock for purchased items across all orders...')
        console.log('📋 [WEBHOOK] Processing', allOrderIds.length, 'orders for stock updates')
        const batch = adminDb.batch()
        let updateCount = 0

        // Helper to add stock update to batch
        const addStockUpdate = async (productId: string, quantity: number, orderContext: string) => {
          if (!productId) {
            console.warn(`⚠️ [WEBHOOK] No productId provided for ${orderContext}`)
            return
          }
          
          const productRef = adminDb.collection('products').doc(productId)
          const productDoc = await productRef.get()
          
          if (!productDoc.exists) {
            console.warn(`⚠️ [WEBHOOK] Product ${productId} not found, skipping stock update (${orderContext})`)
            return
          }
          
          const productData = productDoc.data()
          const currentStock = productData?.stock
          const productName = productData?.name || 'Unknown'
          
          // Skip stock update for unlimited items
          if (currentStock === 'unlimited' || currentStock === -1) {
            console.log(`ℹ️ [WEBHOOK] Product "${productName}" (${productId}) has unlimited stock, updating soldCount only (${orderContext})`)
            // Still update soldCount
            batch.update(productRef, {
              soldCount: admin.firestore.FieldValue.increment(quantity)
            })
            updateCount++
            return
          }
          
          // For numbered stock, decrement and update soldCount
          if (typeof currentStock === 'number') {
            const newStock = currentStock - quantity
            console.log(`📦 [WEBHOOK] "${productName}" (${productId}): ${currentStock} -> ${newStock} (qty: ${quantity}) (${orderContext})`)
            batch.update(productRef, {
              stock: admin.firestore.FieldValue.increment(-quantity),
              soldCount: admin.firestore.FieldValue.increment(quantity)
            })
            updateCount++
          } else {
            console.warn(`⚠️ [WEBHOOK] Product ${productId} has invalid stock type: ${typeof currentStock} (${orderContext})`)
          }
        }

        // Process all orders to update stock
        for (const currentOrderId of allOrderIds) {
          console.log(`🔍 [WEBHOOK] Processing order ${currentOrderId} for stock updates...`)
          const orderDoc = await adminDb.collection('orders').doc(currentOrderId).get()
          if (!orderDoc.exists) {
            console.warn(`⚠️ [WEBHOOK] Order ${currentOrderId} not found, skipping`)
            continue
          }
          
          const orderData = orderDoc.data()
          console.log(`📄 [WEBHOOK] Order ${currentOrderId} type:`, orderData.type || 'N/A', 'shops:', orderData.shops?.length, 'items:', orderData.items?.length)
          
          // Case 1: Cart checkout order with shops array (legacy format)
          if (orderData.type === 'cart_checkout' && orderData.shops && Array.isArray(orderData.shops)) {
            console.log(`🏪 [WEBHOOK] Processing legacy format with ${orderData.shops.length} shops`)
            for (const shop of orderData.shops) {
              if (shop.items && Array.isArray(shop.items)) {
                for (const item of shop.items) {
                  const qty = item.quantity || 1
                  console.log(`🔢 [WEBHOOK] Legacy item quantity: ${item.quantity} → using: ${qty}`, item)
                  await addStockUpdate(item.productId, qty, `Order ${currentOrderId} - Legacy Shop ${shop.shopId}`)
                }
              }
            }
          }
          // Case 2: New format - direct items array
          else if (orderData.items && Array.isArray(orderData.items)) {
            console.log(`📦 [WEBHOOK] Processing new format with ${orderData.items.length} items`)
            for (const item of orderData.items) {
              const qty = item.quantity || 1
              console.log(`🔢 [WEBHOOK] New format item quantity: ${item.quantity} → using: ${qty}`, item)
              await addStockUpdate(item.productId, qty, `Order ${currentOrderId} - Shop ${orderData.shopId}`)
            }
          } else {
            console.warn(`⚠️ [WEBHOOK] Order ${currentOrderId} has no recognizable items format`)
          }
        }

        if (updateCount > 0) {
          await batch.commit()
          console.log(`✅ [WEBHOOK] Stock updated for ${updateCount} products across ${allOrderIds.length} orders`)
        } else {
          console.warn(`⚠️ [WEBHOOK] No stock updates were made (updateCount: 0)`)
        }
      } catch (stockError) {
        console.error('❌ Failed to update stock:', stockError)
        // Don't fail the webhook, just log error
      }

      // 🔔 Notify buyer - payment successful (use first order for user info)
      try {
        const firstOrderDoc = await adminDb.collection('orders').doc(allOrderIds[0]).get()
        const firstOrderData = firstOrderDoc.data()
        
        if (firstOrderData && firstOrderData.userId) {
          const message = allOrderIds.length > 1 
            ? `การชำระเงินสำหรับ ${allOrderIds.length} คำสั่งซื้อเสร็จสมบูรณ์แล้ว`
            : `การชำระเงินสำหรับคำสั่งซื้อ #${allOrderIds[0].slice(-8)} เสร็จสมบูรณ์แล้ว`
          
          await createNotification(
            firstOrderData.userId,
            'payment_received',
            '💳 การชำระเงินสำเร็จ',
            message,
            `/profile?tab=orders`
          )
        }
      } catch (notifError) {
        console.error("Error sending payment notification to buyer:", notifError)
      }

      // 🔔 Notify sellers - new orders
      try {
        const notifiedSellers = new Set<string>()
        
        for (const currentOrderId of allOrderIds) {
          const orderDoc = await adminDb.collection('orders').doc(currentOrderId).get()
          if (!orderDoc.exists) continue
          
          const orderData = orderDoc.data()
          
          // For new format orders (single shop per order)
          if (orderData.shopId) {
            const shopDoc = await adminDb.collection('shops').doc(orderData.shopId).get()
            const shopData = shopDoc.data()
            
            if (shopData && shopData.ownerId && !notifiedSellers.has(shopData.ownerId)) {
              await createNotification(
                shopData.ownerId,
                'new_order',
                '🛒 คุณมีคำสั่งซื้อใหม่!',
                `มีคำสั่งซื้อใหม่สำหรับร้าน "${orderData.shopName}" จำนวนเงิน ${orderData.sellerAmount} บาท`,
                `/seller?tab=orders`
              )
              notifiedSellers.add(shopData.ownerId)
            }
          }

          // For legacy cart checkout orders (multiple shops in one order)
          if (orderData.shops && Array.isArray(orderData.shops)) {
            for (const shop of orderData.shops) {
              if (shop.shopId) {
                const shopDoc = await adminDb.collection('shops').doc(shop.shopId).get()
                const shopData = shopDoc.data()
                
                if (shopData && shopData.ownerId && !notifiedSellers.has(shopData.ownerId)) {
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

      // Clear cart items after successful payment (for all orders)
      if (userId && allCartItemIds.size > 0) {
        try {
          console.log('🧹 Clearing cart items for user:', userId, 'items:', Array.from(allCartItemIds))
          
          const batch = adminDb.batch()
          let deletedCount = 0
          
          for (const itemId of allCartItemIds) {
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
