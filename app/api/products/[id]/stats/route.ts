import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

/**
 * GET /api/products/[id]/stats
 * Get product statistics (sales, views, rating)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    // Get product data
    const productDoc = await adminDb.collection('products').doc(id).get()

    if (!productDoc.exists) {
      // Try games collection for backward compatibility
      const gameDoc = await adminDb.collection('games').doc(id).get()
      if (!gameDoc.exists) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }
      const gameData = gameDoc.data()!
      
      return NextResponse.json({
        views: gameData.views || 0,
        sales: 0,
        rating: 0,
        reviewCount: 0,
        shopId: gameData.shopId || '',
        shopName: gameData.shopName || '',
      })
    }

    const productData = productDoc.data()!

    // If shopName is missing but shopId exists, fetch it
    let shopName = productData.shopName || ''
    if (!shopName && productData.shopId) {
      try {
        const shopDoc = await adminDb.collection('shops').doc(productData.shopId).get()
        if (shopDoc.exists) {
          shopName = shopDoc.data()?.shopName || ''
        }
      } catch (err) {
        console.error('Error fetching shop name for stats:', err)
      }
    }

    // Get total sales from orders
    const ordersSnapshot = await adminDb
      .collection('orders')
      .where('status', 'in', ['processing', 'completed'])
      .get()

    let totalSales = 0
    ordersSnapshot.docs.forEach((doc) => {
      const order = doc.data()
      // Loop through items to find matching productId
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          if (item.productId === id || item.gameId === id) {
            totalSales += item.quantity || 1
          }
        })
      }
    })

    // Get average rating from reviews
    const reviewsSnapshot = await adminDb
      .collection('reviews')
      .where('productId', '==', id)
      .get()

    let totalRating = 0
    let reviewCount = 0

    reviewsSnapshot.docs.forEach((doc) => {
      const review = doc.data()
      totalRating += review.rating || 0
      reviewCount++
    })

    const averageRating = reviewCount > 0 ? totalRating / reviewCount : 0

    return NextResponse.json({
      views: productData.views || 0,
      sales: totalSales,
      rating: averageRating,
      reviewCount,
      shopId: productData.shopId || '',
      shopName: shopName,
    })
  } catch (error: any) {
    console.error('Error getting product stats:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get product stats' },
      { status: 500 }
    )
  }
}
