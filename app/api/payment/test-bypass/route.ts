import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'
import * as admin from 'firebase-admin'

/**
 * TEST MODE ONLY: Bypass payment for testing
 * This endpoint simulates successful payment
 */
export async function POST(request: NextRequest) {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'This endpoint is only available in development mode' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { orderId, orderIds } = body

    // Support both single orderId and multiple orderIds
    const orderIdsList = orderIds || (orderId ? [orderId] : [])
    
    if (orderIdsList.length === 0) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    console.log('🧪 [TEST] Bypassing payment for orders:', orderIdsList)
    console.log('🧪 [TEST] Request body:', JSON.stringify(body, null, 2))

    // Process all orders
    for (const currentOrderId of orderIdsList) {
      // Get order
      const orderDoc = await adminDb.collection('orders').doc(currentOrderId).get()
      
      if (!orderDoc.exists) {
        console.error('❌ [TEST] Order not found:', currentOrderId)
        continue
      }

      const orderData = orderDoc.data()
      
      console.log('🧪 [TEST] Current order status:', {
        id: currentOrderId,
        paymentStatus: orderData?.paymentStatus,
        status: orderData?.status,
        userId: orderData?.userId,
      })

      // Mark order as paid
      await adminDb.collection('orders').doc(currentOrderId).update({
        paymentStatus: 'completed',
        status: 'processing',
        paymentMethod: 'promptpay',
        paidAt: new Date(),
        testBypass: true, // Flag to indicate this was a test bypass
        updatedAt: new Date(),
      })

      console.log('✅ [TEST] Order marked as paid:', currentOrderId)
    }

    // Update stock for ALL purchased items across all orders (TEST MODE)
    try {
      console.log('📦 [TEST-BYPASS] Updating stock for purchased items across all orders...')
      console.log('📋 [TEST-BYPASS] Processing', orderIdsList.length, 'orders for stock updates')
      const batch = adminDb.batch()
      let updateCount = 0

      // Helper to add stock update to batch
      const addStockUpdate = async (productId: string, quantity: number, orderContext: string) => {
        if (!productId) {
          console.warn(`⚠️ [TEST-BYPASS] No productId provided for ${orderContext}`)
          return
        }
        
        const productRef = adminDb.collection('products').doc(productId)
        const productDoc = await productRef.get()
        
        if (!productDoc.exists) {
          console.warn(`⚠️ [TEST-BYPASS] Product ${productId} not found (${orderContext})`)
          return
        }
        
        const productData = productDoc.data()
        const currentStock = productData?.stock
        const productName = productData?.name || 'Unknown'
        
        // Skip unlimited stock
        if (currentStock === 'unlimited' || currentStock === -1) {
          console.log(`ℹ️ [TEST-BYPASS] Product "${productName}" has unlimited stock, updating soldCount only (${orderContext})`)
          batch.update(productRef, {
            soldCount: admin.firestore.FieldValue.increment(quantity)
          })
          updateCount++
          return
        }
        
        // Decrement numbered stock
        if (typeof currentStock === 'number') {
          const newStock = currentStock - quantity
          console.log(`📦 [TEST-BYPASS] "${productName}" (${productId}): ${currentStock} -> ${newStock} (qty: ${quantity}) (${orderContext})`)
          batch.update(productRef, {
            stock: admin.firestore.FieldValue.increment(-quantity),
            soldCount: admin.firestore.FieldValue.increment(quantity)
          })
          updateCount++
        } else {
          console.warn(`⚠️ [TEST-BYPASS] Product ${productId} has invalid stock type: ${typeof currentStock} (${orderContext})`)
        }
      }

      // Process all orders
      for (const currentOrderId of orderIdsList) {
        console.log(`🔍 [TEST-BYPASS] Processing order ${currentOrderId} for stock updates...`)
        const orderDoc = await adminDb.collection('orders').doc(currentOrderId).get()
        if (!orderDoc.exists) {
          console.warn(`⚠️ [TEST-BYPASS] Order ${currentOrderId} not found, skipping`)
          continue
        }
        
        const orderData = orderDoc.data()
        console.log(`📄 [TEST-BYPASS] Order ${currentOrderId} type:`, orderData?.type || 'N/A', 'shops:', orderData?.shops?.length, 'items:', orderData?.items?.length)

        // Case 1: Cart checkout order with shops array (legacy)
        if (orderData?.type === 'cart_checkout' && orderData.shops && Array.isArray(orderData.shops)) {
          console.log(`🏪 [TEST-BYPASS] Processing legacy format with ${orderData.shops.length} shops`)
          for (const shop of orderData.shops) {
            if (shop.items && Array.isArray(shop.items)) {
              for (const item of shop.items) {
                const qty = item.quantity || 1
                console.log(`🔢 [TEST-BYPASS] Item quantity from order: ${item.quantity} → using: ${qty}`, item)
                await addStockUpdate(item.productId, qty, `Order ${currentOrderId} - Legacy Shop ${shop.shopId}`)
              }
            }
          }
        }
        // Case 2: Direct order with items array (new format)
        else if (orderData?.items && Array.isArray(orderData.items)) {
          console.log(`📦 [TEST-BYPASS] Processing new format with ${orderData.items.length} items`)
          for (const item of orderData.items) {
            const qty = item.quantity || 1
            console.log(`🔢 [TEST-BYPASS] Item quantity from order: ${item.quantity} → using: ${qty}`, item)
            await addStockUpdate(item.productId, qty, `Order ${currentOrderId} - Shop ${orderData.shopId}`)
          }
        } else {
          console.warn(`⚠️ [TEST-BYPASS] Order ${currentOrderId} has no recognizable items format`)
        }
      }

      if (updateCount > 0) {
        await batch.commit()
        console.log(`✅ [TEST-BYPASS] Updated stock for ${updateCount} items across ${orderIdsList.length} orders`)
      } else {
        console.warn(`⚠️ [TEST-BYPASS] No stock updates were made (updateCount: 0)`)
      }
    } catch (stockError) {
      console.error('❌ [TEST] Failed to update stock:', stockError)
    }

    // Clear cart items after successful payment (TEST MODE)
    // Use first order to get cart info
    const firstOrderDoc = await adminDb.collection('orders').doc(orderIdsList[0]).get()
    const firstOrderData = firstOrderDoc.data()
    
    if (firstOrderData?.cartItemIds && Array.isArray(firstOrderData.cartItemIds) && firstOrderData.cartItemIds.length > 0) {
      try {
        const userId = firstOrderData.userId
        console.log('🧹 [TEST] Clearing cart items for user:', userId, 'items:', firstOrderData.cartItemIds)
        
        const batch = adminDb.batch()
        let deletedCount = 0
        
        for (const itemId of firstOrderData.cartItemIds) {
          // Cart uses individual documents with pattern: {userId}_{itemId}
          const cartItemRef = adminDb.collection('cart').doc(`${userId}_${itemId}`)
          batch.delete(cartItemRef)
          deletedCount++
        }
        
        await batch.commit()
        console.log(`✅ [TEST] Cleared ${deletedCount} items from cart`)
      } catch (cartError) {
        console.error('⚠️ [TEST] Failed to clear cart items:', cartError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment bypassed successfully (TEST MODE)',
      orderId: orderIdsList[0],
      orderIds: orderIdsList,
    })
  } catch (error: any) {
    console.error('❌ Error bypassing payment:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
