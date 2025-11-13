import { adminDb } from '../lib/firebase-admin-config'

async function updateReviewStats() {
  console.log('🔄 Starting review stats update...')

  try {
    // Get all reviews
    const reviewsSnapshot = await adminDb.collection('reviews').get()
    console.log(`📊 Found ${reviewsSnapshot.size} total reviews`)

    // Group by shop and product
    const shopReviews = new Map<string, number[]>()
    const productReviews = new Map<string, number[]>()

    reviewsSnapshot.forEach(doc => {
      const data = doc.data()
      
      if (data.type === 'shop' && data.shopId) {
        if (!shopReviews.has(data.shopId)) {
          shopReviews.set(data.shopId, [])
        }
        shopReviews.get(data.shopId)!.push(data.rating || 0)
      }
      
      if (data.type === 'product' && data.productId) {
        if (!productReviews.has(data.productId)) {
          productReviews.set(data.productId, [])
        }
        productReviews.get(data.productId)!.push(data.rating || 0)
      }
    })

    console.log(`\n🏪 Updating ${shopReviews.size} shops...`)
    let shopCount = 0
    
    for (const [shopId, ratings] of shopReviews.entries()) {
      const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length
      
      await adminDb.collection('shops').doc(shopId).update({
        rating: avgRating,
        reviewCount: ratings.length,
        updatedAt: new Date()
      })
      
      shopCount++
      console.log(`  ✅ Shop ${shopId}: ${avgRating.toFixed(2)} (${ratings.length} reviews)`)
    }

    console.log(`\n📦 Updating ${productReviews.size} products...`)
    let productCount = 0
    
    for (const [productId, ratings] of productReviews.entries()) {
      const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length
      
      await adminDb.collection('products').doc(productId).update({
        rating: avgRating,
        reviewCount: ratings.length,
        updatedAt: new Date()
      })
      
      productCount++
      console.log(`  ✅ Product ${productId}: ${avgRating.toFixed(2)} (${ratings.length} reviews)`)
    }

    console.log(`\n✨ Review stats update completed!`)
    console.log(`   - ${shopCount} shops updated`)
    console.log(`   - ${productCount} products updated`)
    
  } catch (error) {
    console.error('❌ Error updating review stats:', error)
    throw error
  }
}

// Run the update
updateReviewStats()
  .then(() => {
    console.log('\n🎉 All done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error)
    process.exit(1)
  })
