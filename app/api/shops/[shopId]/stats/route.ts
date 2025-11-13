import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

/**
 * GET /api/shops/[shopId]/stats
 * Get shop statistics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { shopId } = await params

    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 })
    }

    // Get shop data
    const shopDoc = await adminDb.collection('shops').doc(shopId).get()

    if (!shopDoc.exists) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    const shopData = shopDoc.data()!

    // Get total products from both collections
    const gamesSnapshot = await adminDb
      .collection('games')
      .where('shopId', '==', shopId)
      .where('status', '==', 'active')
      .get()

    const productsSnapshot = await adminDb
      .collection('products')
      .where('shopId', '==', shopId)
      .where('status', '==', 'active')
      .get()

    const totalProducts = gamesSnapshot.size + productsSnapshot.size

    // Get total sales from orders
    const ordersSnapshot = await adminDb
      .collection('orders')
      .where('shopId', '==', shopId)
      .where('status', 'in', ['completed', 'shipped', 'delivered'])
      .get()

    let totalSales = 0
    let totalRevenue = 0

    ordersSnapshot.docs.forEach((doc) => {
      const order = doc.data()
      totalSales += order.items?.length || 0
      totalRevenue += order.totalAmount || 0
    })

    // Get average rating from shop reviews
    const reviewsSnapshot = await adminDb
      .collection('reviews')
      .where('shopId', '==', shopId)
      .where('type', '==', 'shop')
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
      shopId: shopId,
      shopName: shopData.shopName || shopData.name || '',
      shopLogo: shopData.logoUrl || shopData.logo || '',
      shopDescription: shopData.description || '',
      ownerId: shopData.ownerId || '',
      totalProducts,
      totalSales,
      totalRevenue,
      rating: averageRating,
      reviewCount,
      createdAt: shopData.createdAt?.toDate?.()?.toISOString() || null,
    })
  } catch (error: any) {
    console.error('Error getting shop stats:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get shop stats' },
      { status: 500 }
    )
  }
}
