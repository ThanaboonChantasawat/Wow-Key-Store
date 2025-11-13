import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const userId = searchParams.get('userId')
    const status = searchParams.get('status') // 'all', 'pending', 'processing', 'completed', 'cancelled'

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
    
    console.log(`Total orders in database: ${querySnapshot.size}`)
    
    // Filter orders that belong to this shop
    let orders = querySnapshot.docs
      .map(doc => {
        const data = doc.data()
        
        // Check if this order belongs to this shop
        let belongsToShop = false
        let shopSpecificData = null
        
        // Case 1: Direct order with shopId field
        if (data.shopId === finalShopId) {
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
        // Case 2: Cart checkout order with shops array
        else if (data.type === 'cart_checkout' && data.shops) {
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
        
        if (!belongsToShop) {
          return null
        }

        // shopSpecificData should exist if belongsToShop is true
        if (!shopSpecificData) {
          console.error('❌ shopSpecificData is null despite belongsToShop being true')
          return null
        }
        
        // Apply status filter if specified
        if (status && status !== 'all' && data.status !== status) {
          return null
        }
        
        // Filter out orders with pending payment (not yet paid)
        if (data.paymentStatus === 'pending' || data.paymentStatus === 'cancelled' || data.paymentStatus === 'expired') {
          return null
        }
        
        return {
          id: doc.id,
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
          items: (shopSpecificData.items || []).map((item: any) => ({
            ...item,
            price: Number(item.price) || 0,
            quantity: Number(item.quantity) || 1,
          })),
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
          gameCodeDeliveredAt: data.gameCodeDeliveredAt?.toDate?.()?.toISOString() || data.gameCodeDeliveredAt || null,
          paidAt: data.paidAt?.toDate?.()?.toISOString() || data.paidAt || null,
          buyerConfirmed: data.buyerConfirmed || false,
          sellerNotes: data.sellerNotes || '',
        }
      })
      .filter(order => order !== null)
    
    // Sort by creation date (newest first)
    orders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    console.log(`Found ${orders.length} orders for shop ${finalShopId} (after filtering)`)
    if (orders.length > 0) {
      console.log('Sample order:', {
        id: orders[0].id,
        type: orders[0].type,
        status: orders[0].status,
        paymentStatus: orders[0].paymentStatus,
        totalAmount: orders[0].totalAmount,
      })
    }

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
