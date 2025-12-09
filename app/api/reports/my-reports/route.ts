import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get all reports by this user
    const snapshot = await adminDb
      .collection('reports')
      .where('reporterId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get()

    const reports = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data()
        
        // Fetch product details if productId exists
        let productImage = null
        let productName = data.productName || null
        
        if (data.productId) {
          console.log('🔍 Fetching product:', data.productId)
          const productDoc = await adminDb.collection('products').doc(data.productId).get()
          if (productDoc.exists) {
            const productData = productDoc.data()
            productImage = productData?.images?.[0] || productData?.imageUrl || null
            productName = productName || productData?.name || null
            console.log('📦 Product found:', { name: productName, image: productImage })
          } else {
            console.log('❌ Product not found:', data.productId)
          }
        }

        // Fetch shop details if shopId or shopOwnerId exists
        let shopImage = null
        let shopName = data.shopName || null
        
        if (data.shopId) {
          console.log('🔍 Fetching shop by ID:', data.shopId)
          const shopDoc = await adminDb.collection('shops').doc(data.shopId).get()
          if (shopDoc.exists) {
            const shopData = shopDoc.data()
            shopImage = shopData?.avatar || shopData?.logoUrl || null
            shopName = shopName || shopData?.shopName || null
            console.log('🏪 Shop found:', { name: shopName, image: shopImage })
          } else {
            console.log('❌ Shop not found:', data.shopId)
          }
        } else if (data.shopOwnerId) {
          // Try to find shop by owner ID
          const shopId = `shop_${data.shopOwnerId}`
          console.log('🔍 Fetching shop by owner ID:', shopId)
          const shopDoc = await adminDb.collection('shops').doc(shopId).get()
          if (shopDoc.exists) {
            const shopData = shopDoc.data()
            shopImage = shopData?.avatar || shopData?.logoUrl || null
            shopName = shopName || shopData?.shopName || null
            console.log('🏪 Shop found by owner:', { name: shopName, image: shopImage })
          } else {
            console.log('❌ Shop not found by owner:', shopId)
          }
        }

        // Fetch target user details
        let targetUserImage = null
        if (data.targetUserId) {
          const userDoc = await adminDb.collection('users').doc(data.targetUserId).get()
          if (userDoc.exists) {
            const userData = userDoc.data()
            targetUserImage = userData?.photoURL || null
          }
        }

        return {
          id: doc.id,
          reporterId: data.reporterId,
          reporterName: data.reporterName,
          targetType: data.targetType,
          targetId: data.targetId,
          targetUserId: data.targetUserId,
          targetUserName: data.targetUserName,
          targetUserImage,
          targetContent: data.targetContent,
          productId: data.productId || null,
          productName,
          productImage,
          shopId: data.shopId || null,
          shopName,
          shopImage,
          shopOwnerId: data.shopOwnerId || null,
          reason: data.reason,
          description: data.description || '',
          status: data.status,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date(data.createdAt).toISOString(),
          reviewedAt: data.reviewedAt?.toDate?.()?.toISOString() || null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date(data.updatedAt).toISOString(),
          reviewedBy: data.reviewedBy || null,
          adminNote: data.adminNote || null,
          actionTaken: data.resolution || data.actionTaken || null,
        }
      })
    )

    return NextResponse.json({ reports })
  } catch (error: any) {
    console.error('Error fetching user reports:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reports' },
      { status: 500 }
    )
  }
}
