import { adminDb } from '@/lib/firebase-admin-config'

async function fixOrdersShopId() {
  try {
    console.log('🔧 Fixing orders with missing shopId and sellerAmount...\n')

    // Get all orders with undefined shopId
    const ordersSnapshot = await adminDb.collection('orders')
      .get()

    let fixedCount = 0
    let skippedCount = 0

    for (const doc of ordersSnapshot.docs) {
      const order = doc.data()
      
      if (order.shopId === undefined || order.shopId === null) {
        console.log(`\n📦 Fixing Order: ${doc.id}`)
        console.log(`   Current shopId: ${order.shopId}`)
        console.log(`   Total Amount: ฿${order.totalAmount}`)
        
        // Try to get shopId from items
        let foundShopId = null
        
        if (order.items && Array.isArray(order.items) && order.items.length > 0) {
          const firstItem = order.items[0]
          if (firstItem.shopId) {
            foundShopId = firstItem.shopId
          }
        }

        // If still not found, try from shops array
        if (!foundShopId && order.shops && Array.isArray(order.shops) && order.shops.length > 0) {
          const firstShop = order.shops[0]
          if (firstShop.shopId) {
            foundShopId = firstShop.shopId
          }
        }

        if (foundShopId) {
          // Calculate sellerAmount (95% of total after 5% platform fee)
          const totalAmount = Number(order.totalAmount) || 0
          const platformFee = totalAmount * 0.05
          const sellerAmount = totalAmount - platformFee

          const updateData: any = {
            shopId: foundShopId,
            sellerAmount: sellerAmount,
            platformFee: platformFee
          }

          await doc.ref.update(updateData)
          
          console.log(`   ✅ Updated:`)
          console.log(`      shopId: ${foundShopId}`)
          console.log(`      sellerAmount: ฿${sellerAmount}`)
          console.log(`      platformFee: ฿${platformFee}`)
          
          fixedCount++
        } else {
          console.log(`   ⚠️ Could not find shopId in items or shops`)
          skippedCount++
        }
      } else {
        skippedCount++
      }
    }

    console.log(`\n\n✅ Fixed ${fixedCount} orders`)
    console.log(`⏭️ Skipped ${skippedCount} orders (already have shopId or couldn't fix)`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    process.exit(0)
  }
}

fixOrdersShopId()
