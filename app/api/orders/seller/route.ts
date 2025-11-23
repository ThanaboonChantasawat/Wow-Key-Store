import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'
import * as admin from 'firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const userId = searchParams.get('userId')
    const status = searchParams.get('status') || 'all' // Default to 'all' if not provided

    // Support both shopId and userId (convert userId to shopId)
    let finalShopId = shopId
    
    if (!finalShopId && userId) {
      finalShopId = `shop_${userId}`
    }

    if (!finalShopId) {
      return NextResponse.json(
        { error: 'Shop ID or User ID is required' },
        { status: 400 }
      )
    }

    console.log('Fetching orders for shop:', finalShopId, 'status:', status)

    // Get ALL orders (both direct orders with shopId and cart orders with shops array)
    const querySnapshot = await adminDb.collection('orders').get()
    
    // Filter orders that belong to this shop
    const filteredOrders: any[] = []
    const userIds = new Set<string>()
    const productIds = new Set<string>()

    querySnapshot.docs.forEach(doc => {
      const data = doc.data()
      
      // Check if this order belongs to this shop
      let belongsToShop = false
      let shopSpecificData = null
      
      // Case 1: Cart checkout order with shops array (CHECK THIS FIRST!)
      if (data.type === 'cart_checkout' && data.shops) {
        const shopData = data.shops.find((s: any) => s.shopId === finalShopId)
        if (shopData) {
          belongsToShop = true
          shopSpecificData = {
            shopId: shopData.shopId,
            shopName: shopData.shopName,
            totalAmount: shopData.amount,
            platformFee: shopData.platformFee,
            sellerAmount: shopData.sellerAmount,
            items: shopData.items || [],
          }
        }
      }
      // Case 2: Direct order with shopId field
      else if (data.shopId === finalShopId) {
        belongsToShop = true
        shopSpecificData = {
          shopId: data.shopId,
          shopName: data.shopName,
          totalAmount: data.totalAmount,
          platformFee: data.platformFee,
          sellerAmount: data.sellerAmount,
          items: data.items || [],
        }
      }
      
      if (!belongsToShop || !shopSpecificData) {
        return
      }
      
      // Apply status filter if specified
      if (status && status !== 'all' && data.status !== status) {
        return
      }
      
      // Filter out orders with pending payment (not yet paid)
      if (data.paymentStatus === 'pending' || data.paymentStatus === 'cancelled' || data.paymentStatus === 'expired') {
        return
      }

      if (data.userId) {
        userIds.add(data.userId)
      }

      // Collect product IDs
      if (shopSpecificData.items && Array.isArray(shopSpecificData.items)) {
        shopSpecificData.items.forEach((item: any) => {
          if (item.productId) productIds.add(item.productId)
          if (item.gameId) productIds.add(item.gameId)
          if (!item.productId && !item.gameId && item.id) productIds.add(item.id)
        })
      }

      filteredOrders.push({
        docId: doc.id,
        data,
        shopSpecificData
      })
    })

    // Fetch user profiles
    const userMap = new Map<string, any>()
    if (userIds.size > 0) {
      const userIdArray = Array.from(userIds)
      const chunks = []
      for (let i = 0; i < userIdArray.length; i += 10) {
        chunks.push(userIdArray.slice(i, i + 10))
      }
      
      for (const chunk of chunks) {
        try {
          const usersSnapshot = await adminDb.collection('users')
            .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
            .get()
          
          usersSnapshot.forEach(userDoc => {
            userMap.set(userDoc.id, userDoc.data())
          })
        } catch (err) {
          console.error('Error fetching user chunk:', err)
        }
      }
    }

    // Fetch product details
    const productMap = new Map<string, any>()
    if (productIds.size > 0) {
      const productIdArray = Array.from(productIds)
      const chunks = []
      for (let i = 0; i < productIdArray.length; i += 10) {
        chunks.push(productIdArray.slice(i, i + 10))
      }
      
      for (const chunk of chunks) {
        try {
          // Try fetching from products collection
          const productsSnapshot = await adminDb.collection('products')
            .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
            .get()
          
          productsSnapshot.forEach(doc => {
            productMap.set(doc.id, doc.data())
          })

          // Also try games collection if not found (or just fetch both)
          const gamesSnapshot = await adminDb.collection('games')
            .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
            .get()
            
          gamesSnapshot.forEach(doc => {
            if (!productMap.has(doc.id)) {
              productMap.set(doc.id, doc.data())
            }
          })
        } catch (err) {
          console.error('Error fetching product chunk:', err)
        }
      }
    }
    
    const orders = filteredOrders.map(({ docId, data, shopSpecificData }) => {
      const userProfile = userMap.get(data.userId)
      
      return {
        id: docId,
        userId: data.userId,
        status: data.status || 'pending',
        paymentStatus: data.paymentStatus,
        paymentMethod: data.paymentMethod,
        type: data.type || 'direct',
        // Use shop-specific data
        shopId: shopSpecificData.shopId,
        shopName: shopSpecificData.shopName,
        totalAmount: Number(shopSpecificData.totalAmount) || 0,
        platformFee: Number(shopSpecificData.platformFee) || 0,
        sellerAmount: Number(shopSpecificData.sellerAmount) || 0,
        items: (shopSpecificData.items || []).map((item: any) => {
          const productId = item.productId || item.gameId || item.id
          const productData = productId ? productMap.get(productId) : null
          
          // Determine the product name
          // 1. Start with existing name in the order item
          let finalName = item.productName || item.name || item.gameName;
          
          // 2. If name is missing or is the placeholder "สินค้าไม่ระบุชื่อ", try to use fetched product data
          if ((!finalName || finalName === 'สินค้าไม่ระบุชื่อ') && productData) {
            finalName = productData.name || productData.gameName || productData.title;
          }
          
          // 3. Final fallback
          if (!finalName) {
            finalName = 'สินค้าไม่ระบุชื่อ';
          }

          return {
            ...item,
            productName: finalName,
            price: Number(item.price) || 0,
            quantity: Number(item.quantity) || 1,
            image: item.image || productData?.images?.[0] || productData?.image || null
          }
        }),
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
        gameCodeDeliveredAt: data.gameCodeDeliveredAt?.toDate?.()?.toISOString() || data.gameCodeDeliveredAt || null,
        paidAt: data.paidAt?.toDate?.()?.toISOString() || data.paidAt || null,
        buyerConfirmed: data.buyerConfirmed || false,
        sellerNotes: data.sellerNotes || '',
        // Add user info from profile if not in order
        username: data.username || userProfile?.displayName || userProfile?.username || 'ลูกค้าทั่วไป',
        email: data.email || userProfile?.email || '-',
        userImage: userProfile?.photoURL || userProfile?.image || null,
      }
    })
    
    // Sort by creation date (newest first)
    orders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({
      success: true,
      orders,
    })
  } catch (error) {
    console.error('Error fetching seller orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
