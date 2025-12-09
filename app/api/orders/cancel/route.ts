import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'
import admin from 'firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    console.log('🚫 Canceling order:', orderId)

    const orderRef = adminDb.collection('orders').doc(orderId)
    const orderDoc = await orderRef.get()

    if (!orderDoc.exists) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const orderData = orderDoc.data()

    // Only allow canceling pending orders
    if (orderData?.paymentStatus !== 'pending') {
      console.log('⚠️ Order is not pending, cannot cancel:', orderData?.paymentStatus)
      return NextResponse.json(
        { error: 'Only pending orders can be canceled' },
        { status: 400 }
      )
    }

    // Update order status to cancelled
    await orderRef.update({
      paymentStatus: 'cancelled',
      status: 'cancelled',
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    console.log('✅ Order cancelled:', orderId)

    // Restore stock for cancelled items (only for pending orders - stock wasn't deducted yet)
    // Note: For completed orders, use the /api/orders/[id]/cancel route which handles refunds
    try {
      console.log('📦 [CANCEL] Restoring stock for cancelled pending order:', orderId)
      const batch = adminDb.batch()
      let updateCount = 0

      // Helper to add stock restore to batch
      const addStockRestore = async (productId: string, quantity: number, itemName: string) => {
        if (!productId) return
        
        const productRef = adminDb.collection('products').doc(productId)
        const productDoc = await productRef.get()
        
        if (!productDoc.exists) {
          console.warn(`⚠️ [CANCEL] Product ${productId} not found, skipping stock restore`)
          return
        }
        
        const currentStock = productDoc.data()?.stock
        
        // Skip unlimited stock items
        if (currentStock === 'unlimited' || currentStock === -1) {
          console.log(`ℹ️ [CANCEL] Product "${itemName}" has unlimited stock, skipping restore`)
          return
        }
        
        // Restore numbered stock
        if (typeof currentStock === 'number') {
          console.log(`📦 [CANCEL] Restoring stock for "${itemName}" (${productId}): +${quantity}`)
          batch.update(productRef, {
            stock: admin.firestore.FieldValue.increment(quantity),
            soldCount: admin.firestore.FieldValue.increment(-quantity)
          })
          updateCount++
        }
      }

      // Case 1: Cart checkout order with shops array (legacy format)
      if (orderData.type === 'cart_checkout' && orderData.shops && Array.isArray(orderData.shops)) {
        console.log(`🏪 [CANCEL] Processing legacy format with ${orderData.shops.length} shops`)
        for (const shop of orderData.shops) {
          if (shop.items && Array.isArray(shop.items)) {
            for (const item of shop.items) {
              const qty = item.quantity || 1
              await addStockRestore(item.productId, qty, item.name || 'Unknown')
            }
          }
        }
      }
      // Case 2: Direct order with items array (new format)
      else if (orderData.items && Array.isArray(orderData.items)) {
        console.log(`📦 [CANCEL] Processing new format with ${orderData.items.length} items`)
        for (const item of orderData.items) {
          const qty = item.quantity || 1
          await addStockRestore(item.productId, qty, item.name || 'Unknown')
        }
      } else {
        console.warn('⚠️ [CANCEL] Order has no items to restore stock for')
      }

      if (updateCount > 0) {
        await batch.commit()
        console.log(`✅ [CANCEL] Restored stock for ${updateCount} items`)
      } else {
        console.log('ℹ️ [CANCEL] No stock to restore (unlimited items or no items)')
      }
    } catch (stockError) {
      console.error('❌ [CANCEL] Failed to restore stock:', stockError)
      // Don't fail the cancellation if stock restore fails
    }

    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully',
    })
  } catch (error) {
    console.error('Cancel order error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel order' },
      { status: 500 }
    )
  }
}
