import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'
import { getUserDisputes } from '@/lib/dispute-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    console.log('[Orders API] Fetching orders for user:', userId)

    // Fetch user disputes first
    const disputes = await getUserDisputes(userId)
    console.log(`[Orders API] Found ${disputes.length} disputes for user ${userId}`)
    disputes.forEach(d => console.log(`  - Dispute for order ${d.orderId}: ${d.status}`))
    
    const disputeMap = new Map(disputes.map(d => [d.orderId, d.status]))

    // Get orders from Firestore using Admin SDK
    // Exclude cancelled and expired pending orders
    const ordersRef = adminDb.collection('orders')
    const q = ordersRef
      .where('userId', '==', userId)
    
    console.log('[Orders API] Executing Firestore query...')
    const querySnapshot = await q.get()
    console.log('[Orders API] Query returned', querySnapshot.size, 'orders (before filtering)')
    
    // Filter out cancelled, expired, and very old pending payment orders
    const now = Date.now()
    const fifteenMinutesAgo = now - (15 * 60 * 1000) // 15 minutes in milliseconds
    
    const filteredDocs = querySnapshot.docs.filter(doc => {
      const data = doc.data()
      
      console.log(`[Orders API] Checking order ${doc.id.substring(0, 12)}:`, {
        paymentStatus: data.paymentStatus,
        status: data.status,
        createdAt: data.createdAt,
      })
      
      // Exclude cancelled orders
      // if (data.paymentStatus === 'cancelled' || data.status === 'cancelled') {
      //   console.log(`  ↳ Excluded: cancelled`)
      //   return false
      // }
      
      // Exclude expired orders
      if (data.paymentStatus === 'expired') {
        console.log(`  ↳ Excluded: expired`)
        return false
      }
      
      // For pending payment orders, only exclude if older than 15 minutes
      if (data.paymentStatus === 'pending') {
        if (data.createdAt) {
          const createdAt = data.createdAt.toDate ? data.createdAt.toDate().getTime() : new Date(data.createdAt).getTime()
          
          if (createdAt < fifteenMinutesAgo) {
            console.log(`  ↳ Excluded: old pending payment (>15 min), marking as expired`)
            // Mark as expired (fire and forget - don't wait)
            adminDb.collection('orders').doc(doc.id).update({
              paymentStatus: 'expired',
              updatedAt: new Date().toISOString(),
            }).catch(err => console.error('Failed to mark order as expired:', err))
            return false
          } else {
            console.log(`  ↳ Included: recent pending payment (<15 min)`)
            return true
          }
        }
      }
      
      console.log(`  ↳ Included`)
      return true
    })
    
    console.log('[Orders API] After filtering:', filteredDocs.length, 'orders')
    
    // Collect all unique game IDs first for batch fetching
    const allGameIds = new Set<string>()
    filteredDocs.forEach(orderDoc => {
      const data = orderDoc.data()
      if (data.type === 'cart_checkout' && data.shops) {
        data.shops.forEach((shop: any) => {
          (shop.items || []).forEach((item: any) => {
            const gameId = item.productId || item.gameId
            if (gameId) allGameIds.add(gameId)
          })
        })
      } else if (data.items) {
        data.items.forEach((item: any) => {
          if (item.gameId) allGameIds.add(item.gameId)
        })
      }
    })

    // Batch fetch all games
    const gameCache = new Map<string, string>()
    if (allGameIds.size > 0) {
      const gameIdArray = Array.from(allGameIds)
      // Firestore 'in' query限制10個，所以要分批
      for (let i = 0; i < gameIdArray.length; i += 10) {
        const batch = gameIdArray.slice(i, i + 10)
        try {
          const [gamesSnapshot, gamesListSnapshot] = await Promise.all([
            adminDb.collection('games').where(admin.firestore.FieldPath.documentId(), 'in', batch).get(),
            adminDb.collection('gamesList').where(admin.firestore.FieldPath.documentId(), 'in', batch).get()
          ])
          
          gamesSnapshot.forEach(doc => {
            gameCache.set(doc.id, doc.data()?.name || null)
          })
          gamesListSnapshot.forEach(doc => {
            if (!gameCache.has(doc.id)) {
              gameCache.set(doc.id, doc.data()?.name || null)
            }
          })
        } catch (err) {
          console.error('[Orders API] Error batch fetching games:', err)
        }
      }
    }
    
    // Fetch orders with game names (using cache)
    const ordersWithGameNames = await Promise.all(
      filteredDocs.map(async (orderDoc) => {
        const data = orderDoc.data()

        // Normalize timestamps soแต่ละคำสั่งซื้อมีเวลาเป็นของตัวเอง ไม่ใช้ new Date() เดียวกันหมด
        let createdAtIso: string
        let updatedAtIso: string
        let gameCodeDeliveredAtIso: string | null = null

        // createdAt
        if (data.createdAt?.toDate) {
          createdAtIso = data.createdAt.toDate().toISOString()
        } else if (typeof data.createdAt === 'string') {
          const d = new Date(data.createdAt)
          createdAtIso = isNaN(d.getTime())
            ? orderDoc.createTime?.toDate().toISOString() ?? new Date().toISOString()
            : d.toISOString()
        } else {
          createdAtIso = orderDoc.createTime?.toDate().toISOString() ?? new Date().toISOString()
        }

        // updatedAt
        if (data.updatedAt?.toDate) {
          updatedAtIso = data.updatedAt.toDate().toISOString()
        } else if (typeof data.updatedAt === 'string') {
          const d = new Date(data.updatedAt)
          updatedAtIso = isNaN(d.getTime())
            ? (orderDoc.updateTime?.toDate().toISOString() ?? createdAtIso)
            : d.toISOString()
        } else if (orderDoc.updateTime) {
          updatedAtIso = orderDoc.updateTime.toDate().toISOString()
        } else {
          updatedAtIso = createdAtIso
        }

        // gameCodeDeliveredAt
        if (data.gameCodeDeliveredAt?.toDate) {
          gameCodeDeliveredAtIso = data.gameCodeDeliveredAt.toDate().toISOString()
        } else if (typeof data.gameCodeDeliveredAt === 'string') {
          const d = new Date(data.gameCodeDeliveredAt)
          gameCodeDeliveredAtIso = isNaN(d.getTime()) ? null : d.toISOString()
        } else {
          gameCodeDeliveredAtIso = null
        }

        let itemsWithGameNames = []
        
        // Handle cart orders (with shops array)
        if (data.type === 'cart_checkout' && data.shops) {
          // Flatten all items from all shops and use cache
          const allItems = data.shops.flatMap((shop: any) => shop.items || [])
          
          itemsWithGameNames = allItems.map((item: any) => {
            const gameId = item.productId || item.gameId
            const gameName = gameId ? (gameCache.get(gameId) || null) : null
            
            return {
              ...item,
              gameId: gameId,
              gameName
            }
          })
        } 
        // Handle direct orders (with items array)
        else if (data.items) {
          itemsWithGameNames = data.items.map((item: any) => {
            const gameName = item.gameId ? (gameCache.get(item.gameId) || null) : null
            
            return {
              ...item,
              gameName
            }
          })
        }
        
        // Check dispute status
        const disputeStatus = disputeMap.get(orderDoc.id)

        return {
          id: orderDoc.id,
          ...data,
          // Set default status if missing
          status: data.status || (data.paymentStatus === 'completed' ? 'pending' : 'pending'),
          paymentStatus: data.paymentStatus || 'pending',
          items: itemsWithGameNames,
          createdAt: createdAtIso,
          updatedAt: updatedAtIso,
          gameCodeDeliveredAt: gameCodeDeliveredAtIso,
          hasDispute: !!disputeStatus,
          disputeStatus: disputeStatus,
        }
      })
    )
    
    // Sort in JavaScript instead of Firestore
    ordersWithGameNames.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    console.log(`[Orders API] Returning ${ordersWithGameNames.length} orders`)

    return NextResponse.json({
      success: true,
      orders: ordersWithGameNames,
    })
  } catch (error: any) {
    console.error('[Orders API] Error fetching orders:', error)
    console.error('[Orders API] Error message:', error?.message)
    console.error('[Orders API] Error code:', error?.code)
    return NextResponse.json(
      { 
        error: 'Failed to fetch orders',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
