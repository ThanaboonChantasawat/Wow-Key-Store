import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

interface CheckoutItem {
  productId: string
  shopId: string
  price: number
  name: string
  quantity: number
}

interface GroupedOrder {
  shopId: string
  sellerId: string
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
        // Check if it has the same cart items AND same shops
        const existingCartItemIds = orderData.cartItemIds || []
        
        // Sort both arrays for comparison
        const sortedExisting = [...existingCartItemIds].sort()
        const sortedNew = [...(cartItemIds || [])].sort()
        
        const hasSameItems = cartItemIds && 
          sortedExisting.length === sortedNew.length &&
          sortedExisting.every((id: string, index: number) => id === sortedNew[index])
        
        // IMPORTANT: For multi-shop orders, also check if they have the same shops
        // to avoid treating separate shop orders as duplicates
        let hasSameShops = true
        if (orderData.shopId) {
          // New format: single shop per order - duplicate only if exact same shop
          const newShopIds = new Set(items.map(item => item.shopId))
          hasSameShops = newShopIds.size === 1 && newShopIds.has(orderData.shopId)
        }
        
        if (hasSameItems && hasSameShops) {
          console.log('⚠️ DUPLICATE DETECTED! Found existing pending order:', doc.id)
          console.log('⚠️ Returning existing order instead of creating new one')
          
          // For old format (single order with shops array), return as is
          if (orderData.shops && Array.isArray(orderData.shops)) {
            const grandTotal = orderData.totalAmount || 0
            const totalPlatformFee = orderData.platformFee || 0
            const orders = orderData.shops.map((shop: any) => ({
              orderId: doc.id, // Use same orderId since it's combined
              shopId: shop.shopId,
              shopName: shop.shopName,
              items: shop.items || [],
              totalAmount: shop.amount || 0,
              platformFee: shop.platformFee || 0,
              sellerAmount: shop.sellerAmount || 0,
            }))
            
            return NextResponse.json({
              orderIds: [doc.id],
              orders,
              grandTotal,
              totalPlatformFee,
            })
          }
          
          // For new format (separate orders), find all related orders
          const relatedOrders = await adminDb.collection('orders')
            .where('userId', '==', userId)
            .where('paymentStatus', '==', 'pending')
            .where('type', '==', 'cart_checkout')
            .get()
          
          const ordersList = relatedOrders.docs
            .filter(d => {
              const data = d.data()
              const orderCreatedAt = new Date(data.createdAt)
              return orderCreatedAt > tenMinutesAgo
            })
            .map(d => {
              const data = d.data()
              return {
                orderId: d.id,
                shopId: data.shopId,
                shopName: data.shopName,
                items: data.items || [],
                totalAmount: data.totalAmount || 0,
                platformFee: data.platformFee || 0,
                sellerAmount: data.sellerAmount || 0,
              }
            })
          
          const grandTotal = ordersList.reduce((sum, o) => sum + o.totalAmount, 0)
          const totalPlatformFee = ordersList.reduce((sum, o) => sum + o.platformFee, 0)
          
          return NextResponse.json({
            orderIds: ordersList.map(o => o.orderId),
            orders: ordersList,
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

      // Check product stock
      const productRef = adminDb.collection('products').doc(item.productId)
      const productDoc = await productRef.get()
      
      if (!productDoc.exists) {
        return NextResponse.json(
          { error: `ไม่พบสินค้า: ${item.name}` },
          { status: 404 }
        )
      }
      
      const productData = productDoc.data()
      const currentStock = productData?.stock
      const requestQty = item.quantity || 1

      // Check if stock is sufficient (skip if unlimited/-1)
      if (currentStock !== 'unlimited' && currentStock !== -1) {
        if (typeof currentStock === 'number' && currentStock < requestQty) {
          return NextResponse.json(
            { error: `สินค้า "${item.name}" มีไม่เพียงพอ (เหลือ ${currentStock} ชิ้น)` },
            { status: 400 }
          )
        }
      }
      
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
      
      // Check if shop has VALID bank account or PromptPay setup for payouts using the new bankAccounts array
      const bankAccounts = shopData.bankAccounts || []
      const hasVerifiedAccount = bankAccounts.some((acc: any) => acc.isEnabled && acc.verificationStatus === 'verified')
      
      console.log(`Checking payment setup for shop ${shopData.shopName}:`)
      console.log(`  - Bank Accounts array:`, bankAccounts.length)
      console.log(`  - Has verified account:`, hasVerifiedAccount)
      
      // Fallback to legacy check if no new accounts found (for backward compatibility)
      const hasLegacyBankAccount = shopData.bankAccountNumber && 
                                  shopData.bankAccountNumber.trim() !== '' &&
                                  shopData.bankName && 
                                  shopData.bankName.trim() !== '' &&
                                  shopData.bankAccountName && 
                                  shopData.bankAccountName.trim() !== ''
      
      console.log(`  - Legacy bank account:`, hasLegacyBankAccount)
      
      const hasLegacyPromptPay = shopData.promptPayId && 
                                shopData.promptPayId.trim() !== ''
      
      console.log(`  - Legacy PromptPay:`, hasLegacyPromptPay)
      console.log(`    • PromptPay ID:`, shopData.promptPayId || 'Not set')

      const isValidShop = hasVerifiedAccount || hasLegacyBankAccount || hasLegacyPromptPay
      
      console.log(`  - Final validation:`, isValidShop ? '✅ PASSED' : '❌ FAILED')
      
      if (!isValidShop) {
        console.error(`❌ Shop ${shopData.shopName} (${item.shopId}) has no valid payment method configured`)
        return NextResponse.json(
          { error: `ร้านค้า ${shopData.shopName} ยังไม่ได้ตั้งค่าบัญชีรับเงินที่สมบูรณ์ กรุณาติดต่อผู้ขาย` },
          { status: 400 }
        )
      }
      
      console.log(`✅ Shop ${shopData.shopName} has valid payment method configured`)

      // Add to group
      if (!shopGroups.has(item.shopId)) {
        shopGroups.set(item.shopId, {
          shopId: item.shopId,
          sellerId: shopData.ownerId,
          shopName: shopData.shopName,
          items: [],
          totalAmount: 0,
          platformFee: 0,
          sellerAmount: 0,
        })
      }

      const group = shopGroups.get(item.shopId)!
      group.items.push(item)
      group.totalAmount += item.price * (item.quantity || 1)
    }

    // Calculate fees for each group
    shopGroups.forEach((group) => {
      // Platform takes 5% fee (to cover Credit Card fees ~3.9% and PromptPay ~1.65%)
      group.platformFee = Math.round(group.totalAmount * 0.05)
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

    // Create SEPARATE order documents for EACH shop
    const shopsArray = Array.from(shopGroups.values())
    const createdOrders: any[] = []
    
    console.log(`Creating ${shopsArray.length} separate orders (one per shop)`)

    for (const shop of shopsArray) {
      const orderRef = adminDb.collection('orders').doc()
      const orderId = orderRef.id

      const orderData: any = {
        id: orderId,
        userId,
        shopId: shop.shopId,
        shopName: shop.shopName,
        sellerId: shop.sellerId,
        type: 'cart_checkout',
        items: shop.items.map(i => ({
          productId: i.productId,
          name: i.name,
          price: i.price,
          quantity: i.quantity || 1,
        })),
        totalAmount: shop.totalAmount,
        platformFee: shop.platformFee,
        sellerAmount: shop.sellerAmount,
        paymentStatus: 'pending',
        status: 'pending',
        paymentMethod: 'pending', // Will be updated when customer chooses payment method
        cartItemIds: cartItemIds || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await orderRef.set(orderData)
      console.log(`✅ Order created for shop ${shop.shopName}:`, orderId)
      
      createdOrders.push({
        orderId,
        shopId: shop.shopId,
        shopName: shop.shopName,
        items: shop.items,
        totalAmount: shop.totalAmount,
        platformFee: shop.platformFee,
        sellerAmount: shop.sellerAmount,
      })
    }

    // DON'T clear cart items here - they will be cleared after successful payment
    // This allows users to go back without losing their cart

    return NextResponse.json({
      orderIds: createdOrders.map(o => o.orderId), // Return array of order IDs
      orders: createdOrders,
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
