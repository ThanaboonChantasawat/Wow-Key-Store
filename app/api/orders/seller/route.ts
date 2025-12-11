import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'
import * as admin from 'firebase-admin'

export async function GET(request: NextRequest) {
  try {
    console.log('[SELLER ORDERS API] Request received')
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const userId = searchParams.get('userId')
    const status = searchParams.get('status') || 'all' // Default to 'all' if not provided

    console.log('[SELLER ORDERS API] Params:', { shopId, userId, status })

    // Support both shopId and userId (convert userId to shopId)
    let finalShopId = shopId
    
    if (!finalShopId && userId) {
      finalShopId = `shop_${userId}`
      console.log('[SELLER ORDERS API] Converted userId to shopId:', finalShopId)
    }

    if (!finalShopId) {
      console.error('[SELLER ORDERS API] Missing shopId/userId')
      return NextResponse.json(
        { error: 'Shop ID or User ID is required' },
        { status: 400 }
      )
    }

    console.log('[SELLER ORDERS API] Fetching orders for shop:', finalShopId, 'status:', status)

    // Get ALL orders (both direct orders with shopId and cart orders with shops array)
    const querySnapshot = await adminDb.collection('orders').get()
    console.log('[SELLER ORDERS API] Total orders in database:', querySnapshot.size)
    
    // Filter orders that belong to this shop
    const filteredOrders: any[] = []
    const userIds = new Set<string>()
    const userEmails = new Set<string>()
    const productIds = new Set<string>()

    querySnapshot.docs.forEach(doc => {
      const data = doc.data()
      
      console.log(`[SELLER ORDERS API] Checking order ${doc.id}:`, {
        type: data.type,
        shopId: data.shopId,
        hasShopsArray: !!(data.shops && Array.isArray(data.shops)),
        shopsCount: data.shops?.length || 0,
        paymentStatus: data.paymentStatus,
        status: data.status
      })
      
      // Check if this order belongs to this shop
      let belongsToShop = false
      let shopSpecificData = null
      
      // Case 1: Cart checkout order with shops array (CHECK THIS FIRST!)
      if (data.type === 'cart_checkout' && data.shops && Array.isArray(data.shops)) {
        const shopData = data.shops.find((s: any) => s.shopId === finalShopId)
        console.log(`[SELLER ORDERS API] Order ${doc.id} cart_checkout: looking for shopId ${finalShopId} in shops array`, data.shops.map((s: any) => s.shopId))
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
          console.log(`[SELLER ORDERS API] Order ${doc.id} matched in shops array!`)
        } else {
          console.log(`[SELLER ORDERS API] Order ${doc.id} shopId not found in shops array`)
        }
      }
      // Case 2: Direct order with shopId field (ONLY if not already matched in Case 1)
      else if (!belongsToShop && data.shopId === finalShopId) {
        belongsToShop = true
        shopSpecificData = {
          shopId: data.shopId,
          shopName: data.shopName,
          totalAmount: data.totalAmount,
          platformFee: data.platformFee,
          sellerAmount: data.sellerAmount,
          items: data.items || [],
        }
        console.log(`[SELLER ORDERS API] Order ${doc.id} matched by direct shopId field`)
      }
      
      if (!belongsToShop || !shopSpecificData) {
        return
      }
      
      // Apply status filter if specified
      if (status && status !== 'all' && data.status !== status) {
        return
      }
      
      // REMOVED: Filter for payment status - show all orders regardless of payment status
      // Seller should see all orders including expired ones to handle customer inquiries
      // if (data.paymentStatus === 'pending' || data.paymentStatus === 'cancelled' || data.paymentStatus === 'expired') {
      //   console.log(`[DEBUG] Filtering out order ${doc.id} with paymentStatus: ${data.paymentStatus}`)
      //   return
      // }
      
      console.log(`[SELLER ORDERS API] Including order ${doc.id} with paymentStatus: ${data.paymentStatus || 'undefined'}, status: ${data.status || 'undefined'}`)

      if (data.userId) {
        userIds.add(data.userId)
        console.log(`[DEBUG] Order ${doc.id} has userId: ${data.userId}`)
      }

      if (data.email) {
        try {
          const emailStr = String(data.email).toLowerCase()
          if (emailStr) {
            userEmails.add(emailStr)
            console.log(`[DEBUG] Order ${doc.id} has email: ${emailStr}`)
          }
        } catch (e) {
          console.error('Error normalizing order email for user lookup:', e)
        }
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

    // Fetch user profiles by ID
    const userMap = new Map<string, any>()
    if (userIds.size > 0) {
      console.log(`[DEBUG] Fetching user profiles for ${userIds.size} user IDs:`, Array.from(userIds))
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
          
          console.log(`[DEBUG] Found ${usersSnapshot.size} user profiles by ID in this chunk`)
          usersSnapshot.forEach(userDoc => {
            const userData = userDoc.data()
            userMap.set(userDoc.id, userData)
            console.log(`[DEBUG] User ${userDoc.id}:`, {
              displayName: userData.displayName || 'N/A',
              email: userData.email || 'N/A'
            })
          })
        } catch (err) {
          console.error('Error fetching user chunk:', err)
        }
      }
    }

    // Fetch user profiles by email (for cases where UID changed, e.g. re-login with Google)
    const userEmailMap = new Map<string, any>()
    if (userEmails.size > 0) {
      console.log(`[DEBUG] Fetching user profiles for ${userEmails.size} emails:`, Array.from(userEmails))
      const emailArray = Array.from(userEmails)
      const chunks: string[][] = []
      for (let i = 0; i < emailArray.length; i += 10) {
        chunks.push(emailArray.slice(i, i + 10))
      }

      for (const chunk of chunks) {
        try {
          const usersSnapshot = await adminDb.collection('users')
            .where('email', 'in', chunk)
            .get()

          console.log(`[DEBUG] Found ${usersSnapshot.size} user profiles by email in this chunk`)
          usersSnapshot.forEach(userDoc => {
            const uData: any = userDoc.data() || {}
            if (uData.email) {
              try {
                const key = String(uData.email).toLowerCase()
                if (key && !userEmailMap.has(key)) {
                  userEmailMap.set(key, uData)
                  console.log(`[DEBUG] User by email ${key}:`, {
                    uid: userDoc.id,
                    displayName: uData.displayName || 'N/A',
                    email: uData.email || 'N/A'
                  })
                }
              } catch (e) {
                console.error('Error normalizing user email for email map:', e)
              }
            }
          })
        } catch (err) {
          console.error('Error fetching user-by-email chunk:', err)
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
      const uidProfile = userMap.get(data.userId) || null

      let emailKey: string | null = null
      // Only treat valid-looking emails (with @) as email keys
      if (data.email && typeof data.email === 'string' && data.email.includes('@')) {
        try {
          emailKey = String(data.email).toLowerCase()
        } catch (e) {
          console.error('Error normalizing order email when resolving profile for order', docId, e)
        }
      }

      const emailProfile = emailKey ? (userEmailMap.get(emailKey) || null) : null

      const uidProfileFound = !!uidProfile
      const emailProfileFound = !!emailProfile

      const uidHasInfo = !!(uidProfile && (uidProfile.displayName || uidProfile.email))
      const emailHasInfo = !!(emailProfile && (emailProfile.displayName || emailProfile.email))

      let userProfile: any = null

      // 1) If we have a good email-based profile for this order, use it.
      if (emailHasInfo) {
        userProfile = emailProfile
      } else if (uidHasInfo) {
        // 2) Otherwise, use UID profile ONLY if it matches this order's email
        //    (when an email is present and valid). This prevents using the
        //    seller's profile for a different buyer email.
        let orderEmailStr = ''
        let uidEmailStr = ''

        if (data.email && typeof data.email === 'string' && data.email.includes('@')) {
          orderEmailStr = data.email.toLowerCase()
        }
        if (uidProfile.email && typeof uidProfile.email === 'string') {
          uidEmailStr = uidProfile.email.toLowerCase()
        }

        if (!orderEmailStr || !uidEmailStr || orderEmailStr === uidEmailStr) {
          userProfile = uidProfile
        }
      } else if (emailProfile) {
        // 3) Fallback: email profile without displayName/email
        userProfile = emailProfile
      } else if (uidProfile) {
        // 4) Fallback: UID profile without displayName/email
        userProfile = uidProfile
      }

      const profileDisplayName = userProfile?.displayName || null
      const profileEmail = userProfile?.email || null

      // Debug user resolution for all orders
      if (!userProfile) {
        console.warn(`[DEBUG] No user profile resolved for order ${docId}`, {
          userId: data.userId || null,
          orderEmail: data.email || null,
          uidProfileFound,
          emailProfileFound,
        })
      } else {
        console.log(`[DEBUG] Buyer profile resolved for order ${docId}`, {
          userId: data.userId || null,
          orderEmail: data.email || null,
          uidProfileFound,
          emailProfileFound,
          profileDisplayName,
          profileEmail,
        })
      }
      
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

          // Determine image
          let finalImage = item.image || item.productImage || item.coverImage;
          
          // If no image on item, try to find it in product data
          if (!finalImage && productData) {
            if (productData.images && Array.isArray(productData.images) && productData.images.length > 0) {
              finalImage = productData.images[0];
            } else if (productData.image) {
              finalImage = productData.image;
            } else if (productData.coverImage) {
              finalImage = productData.coverImage;
            }
          }
          
          // Debug log for first item of first order
          if (filteredOrders.length > 0 && filteredOrders[0].docId === docId && item === shopSpecificData.items[0]) {
             console.log(`[DEBUG] Item Image Resolution:`, {
                itemId: item.id,
                itemName: finalName,
                hasItemImage: !!item.image,
                hasProductData: !!productData,
                finalImageValue: finalImage || 'NULL/UNDEFINED',
                productImages: productData?.images || 'N/A',
                productImage: productData?.image || 'N/A',
                productCover: productData?.coverImage || 'N/A'
             });
          }

          return {
            ...item,
            productName: finalName,
            price: Number(item.price) || 0,
            quantity: Number(item.quantity) || 1,
            image: finalImage || null
          }
        }),
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
        gameCodeDeliveredAt: data.gameCodeDeliveredAt?.toDate?.()?.toISOString() || data.gameCodeDeliveredAt || null,
        paidAt: data.paidAt?.toDate?.()?.toISOString() || data.paidAt || null,
        buyerConfirmed: data.buyerConfirmed || false,
        sellerNotes: data.sellerNotes || '',
        // Add buyer info - profile comes from users collection (by UID or email fallback)
        // Username: displayName from users; fallback to generic label only
        buyerUsername: profileDisplayName || 'ผู้ซื้อ',
        // Email: email from users; fallback to '-' if missing
        buyerEmail: profileEmail || '-',
        userImage: userProfile?.photoURL || userProfile?.image || userProfile?.avatarUrl || null,
        // Legacy fields for backward compatibility (same values)
        username: profileDisplayName || 'ผู้ซื้อ',
        email: profileEmail || '-',
      }
    })
    
    console.log('[SELLER ORDERS API] Filtered orders count:', filteredOrders.length)
    console.log('[SELLER ORDERS API] Final orders count after mapping:', orders.length)
    
    // Sort by creation date (newest first)
    orders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    console.log('[SELLER ORDERS API] Returning orders:', orders.length)
    return NextResponse.json({
      success: true,
      orders,
    })
  } catch (error) {
    console.error('[SELLER ORDERS API] Error fetching seller orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
