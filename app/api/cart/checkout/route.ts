import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

interface CheckoutItem {
  productId: string
  shopId: string
  price: number
  name: string
}

interface GroupedOrder {
  shopId: string
  shopName: string
  items: CheckoutItem[]
  totalAmount: number
  platformFee: number
  sellerAmount: number
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== Cart Checkout API Called ===')
    const body = await request.json()
    console.log('Request body:', JSON.stringify(body, null, 2))
    
    const { items, userId, cartItemIds } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error('No items provided')
      return NextResponse.json(
        { error: 'No items provided' },
        { status: 400 }
      )
    }

    if (!userId) {
      console.error('No userId provided')
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    console.log(`Processing ${items.length} items for user ${userId}`)
    console.log('Cart item IDs:', cartItemIds)

    // Check if there's already a pending order with the same cart items (within last 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    const existingOrdersSnapshot = await adminDb.collection('orders')
      .where('userId', '==', userId)
      .where('paymentStatus', '==', 'pending')
      .where('type', '==', 'cart_checkout')
      .get()

    console.log(`Found ${existingOrdersSnapshot.size} pending cart orders for user`)

    for (const doc of existingOrdersSnapshot.docs) {
      const orderData = doc.data()
      const createdAt = new Date(orderData.createdAt)
      
      console.log(`Checking order ${doc.id.substring(0, 12)}:`, {
        createdAt: orderData.createdAt,
        age: Math.floor((Date.now() - createdAt.getTime()) / 1000) + 's',
        cartItemIds: orderData.cartItemIds,
      })
      
      // Check if order was created within last 10 minutes
      if (createdAt > tenMinutesAgo) {
        // Check if it has the same cart items
        const existingCartItemIds = orderData.cartItemIds || []
        
        // Sort both arrays for comparison
        const sortedExisting = [...existingCartItemIds].sort()
        const sortedNew = [...(cartItemIds || [])].sort()
        
        const hasSameItems = cartItemIds && 
          sortedExisting.length === sortedNew.length &&
          sortedExisting.every((id: string, index: number) => id === sortedNew[index])
        
        if (hasSameItems) {
          console.log('⚠️ DUPLICATE DETECTED! Found existing pending order:', doc.id)
          console.log('⚠️ Returning existing order instead of creating new one')
          
          // Calculate grand total and platform fee from shops
          const grandTotal = orderData.totalAmount || 0
          const totalPlatformFee = orderData.platformFee || 0
          const orders = orderData.shops?.map((shop: any) => ({
            shopId: shop.shopId,
            shopName: shop.shopName,
            items: shop.items || [],
            totalAmount: shop.amount || 0,
            platformFee: shop.platformFee || 0,
            sellerAmount: shop.sellerAmount || 0,
          })) || []
          
          return NextResponse.json({
            orderId: doc.id,
            orders,
            grandTotal,
            totalPlatformFee,
            isDuplicate: true, // Flag to indicate this was a duplicate
          })
        }
      }
    }

    console.log('✅ No duplicate found, creating new order...')

    // Group items by shop
    const shopGroups = new Map<string, GroupedOrder>()

    for (const item of items) {
      console.log(`Processing item:`, item)
      
      // Get shop details
      const shopRef = adminDb.collection('shops').doc(item.shopId)
      const shopDoc = await shopRef.get()

      if (!shopDoc.exists) {
        console.error(`Shop ${item.shopId} not found`)
        return NextResponse.json(
          { error: `Shop ${item.shopId} not found` },
          { status: 404 }
        )
      }

      const shopData = shopDoc.data()
      if (!shopData) {
        console.error(`Shop ${item.shopId} has invalid data`)
        return NextResponse.json(
          { error: `Shop ${item.shopId} data is invalid` },
          { status: 500 }
        )
      }

      console.log(`Shop data for ${item.shopId}:`, shopData.shopName)
      console.log(`Bank account check - bankAccountNumber: ${shopData.bankAccountNumber}, promptPayId: ${shopData.promptPayId}`)
      
      // Check if shop has bank account or PromptPay setup for payouts
      const hasBankAccount = shopData.bankAccountNumber || shopData.promptPayId
      if (!hasBankAccount) {
        console.error(`❌ Shop ${shopData.shopName} (${item.shopId}) has no payment method configured`)
        return NextResponse.json(
          { error: `ร้านค้า ${shopData.shopName} ยังไม่ได้ตั้งค่าการรับชำระเงิน กรุณาติดต่อผู้ขาย` },
          { status: 400 }
        )
      }
      
      console.log(`✅ Shop ${shopData.shopName} has payment method configured`)

      // Add to group
      if (!shopGroups.has(item.shopId)) {
        shopGroups.set(item.shopId, {
          shopId: item.shopId,
          shopName: shopData.shopName,
          items: [],
          totalAmount: 0,
          platformFee: 0,
          sellerAmount: 0,
        })
      }

      const group = shopGroups.get(item.shopId)!
      group.items.push(item)
      group.totalAmount += item.price
    }

    // Calculate fees for each group
    shopGroups.forEach((group) => {
      // Platform takes 3% fee
      group.platformFee = Math.round(group.totalAmount * 0.03)
      group.sellerAmount = group.totalAmount - group.platformFee
    })

    // Calculate grand total
    const grandTotal = Array.from(shopGroups.values()).reduce(
      (sum, group) => sum + group.totalAmount,
      0
    )
    const totalPlatformFee = Array.from(shopGroups.values()).reduce(
      (sum, group) => sum + group.platformFee,
      0
    )

    console.log('Grand total (THB):', grandTotal)
    console.log('Total platform fee (THB):', totalPlatformFee)

    // Create a main order document in Firestore
    const orderRef = adminDb.collection('orders').doc()
    const orderId = orderRef.id

    // For single shop orders, also set shopId and sellerAmount at root level
    // This makes it easier for balance queries
    const shopsArray = Array.from(shopGroups.values())
    const isSingleShop = shopsArray.length === 1
    const rootShopId = isSingleShop ? shopsArray[0].shopId : undefined
    const rootSellerAmount = isSingleShop ? shopsArray[0].sellerAmount : undefined

    const orderData: any = {
      id: orderId,
      userId,
      type: 'cart_checkout',
      shops: shopsArray.map(g => ({
        shopId: g.shopId,
        shopName: g.shopName,
        amount: g.totalAmount,
        platformFee: g.platformFee,
        sellerAmount: g.sellerAmount,
        items: g.items.map(i => ({
          productId: i.productId,
          name: i.name,
          price: i.price,
        })),
      })),
      totalAmount: grandTotal,
      platformFee: totalPlatformFee,
      paymentStatus: 'pending',
      paymentMethod: 'pending', // Will be updated when customer chooses payment method
      cartItemIds: cartItemIds || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Add root-level shopId and sellerAmount for single-shop orders
    if (isSingleShop && rootShopId) {
      orderData.shopId = rootShopId
      orderData.sellerAmount = rootSellerAmount
      console.log(`✅ Single shop order - added root shopId: ${rootShopId}, sellerAmount: ${rootSellerAmount}`)
    }

    await orderRef.set(orderData)
    console.log('Order created:', orderId)

    // DON'T clear cart items here - they will be cleared after successful payment
    // This allows users to go back without losing their cart

    return NextResponse.json({
      orderId,
      orders: Array.from(shopGroups.values()),
      grandTotal,
      totalPlatformFee,
    })
  } catch (error) {
    console.error('=== Cart Checkout API Error ===')
    console.error('Error details:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
