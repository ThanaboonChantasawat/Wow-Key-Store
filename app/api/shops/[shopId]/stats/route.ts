import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

/**
 * GET /api/shops/[shopId]/stats
 * ดึงสถิติของร้านค้า
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { shopId } = await params

    if (!shopId) {
      return NextResponse.json({ error: 'กรุณาระบุร้านค้าที่ต้องการ' }, { status: 400 })
    }

    // Get shop data
    const shopDoc = await adminDb.collection('shops').doc(shopId).get()

    if (!shopDoc.exists) {
      return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 })
    }

    const shopData = shopDoc.data()!

    // Use totalProducts and totalSales from shop document (already calculated)
    const totalProducts = shopData.totalProducts || 0
    const totalSales = shopData.totalSales || 0
    const totalRevenue = shopData.totalRevenue || 0

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
    console.error('เกิดข้อผิดพลาดในการดึงสถิติร้านค้า:', error)
    return NextResponse.json(
      { error: error.message || 'ไม่สามารถดึงสถิติร้านค้าได้' },
      { status: 500 }
    )
  }
}
