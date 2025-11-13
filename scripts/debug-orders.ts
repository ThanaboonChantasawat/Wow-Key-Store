import { adminDb } from '@/lib/firebase-admin-config'

async function debugOrders() {
  try {
    console.log('🔍 Debugging Orders Database...\n')

    // Get all orders (limit to 20)
    const ordersSnapshot = await adminDb.collection('orders')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get()

    console.log(`📦 Total orders found: ${ordersSnapshot.size}\n`)

    if (ordersSnapshot.size === 0) {
      console.log('❌ No orders found in the database!')
      console.log('💡 You need to:')
      console.log('   1. Create a product in a shop')
      console.log('   2. Buy that product')
      console.log('   3. Pay for it')
      console.log('   4. Seller sends game code')
      console.log('   5. Buyer confirms receipt')
      return
    }

    ordersSnapshot.docs.forEach((doc, index) => {
      const order = doc.data()
      console.log(`\n📦 Order ${index + 1}: ${doc.id}`)
      console.log(`   Shop ID: ${order.shopId}`)
      console.log(`   Status: ${order.status}`)
      console.log(`   Payment Status: ${order.paymentStatus}`)
      console.log(`   Buyer Confirmed: ${order.buyerConfirmed || false}`)
      console.log(`   Payout Status: ${order.payoutStatus || 'none'}`)
      console.log(`   Game Code Delivered: ${!!order.gameCodeDeliveredAt}`)
      console.log(`   Seller Amount: ฿${order.sellerAmount || 0}`)
      console.log(`   Total Amount: ฿${order.totalAmount || 0}`)
      console.log(`   Created: ${order.createdAt?.toDate?.() || 'N/A'}`)
    })

    // Check shops
    console.log('\n\n🏪 Checking Shops...')
    const shopsSnapshot = await adminDb.collection('shops')
      .limit(10)
      .get()
    
    console.log(`Total shops: ${shopsSnapshot.size}\n`)
    
    shopsSnapshot.docs.forEach((doc, index) => {
      const shop = doc.data()
      console.log(`${index + 1}. Shop: ${shop.shopName} (ID: ${doc.id})`)
      console.log(`   Owner: ${shop.ownerId}`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    process.exit(0)
  }
}

debugOrders()
