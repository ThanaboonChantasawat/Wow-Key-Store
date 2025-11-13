import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

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

    // Get orders from Firestore using Admin SDK
    // Exclude cancelled and expired pending orders
    const ordersRef = adminDb.collection('orders')
    const q = ordersRef
      .where('userId', '==', userId)
    
    console.log('[Orders API] Executing Firestore query...')
    const querySnapshot = await q.get()
    console.log('[Orders API] Query returned', querySnapshot.size, 'orders (before filtering)')
    
    // Filter out cancelled, expired, and pending payment orders
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
      if (data.paymentStatus === 'cancelled' || data.status === 'cancelled') {
        console.log(`  ↳ Excluded: cancelled`)
        return false
      }
      
      // Exclude expired orders
      if (data.paymentStatus === 'expired') {
        console.log(`  ↳ Excluded: expired`)
        return false
      }
      
      // Exclude ALL pending payment orders (not paid yet)
      if (data.paymentStatus === 'pending') {
        console.log(`  ↳ Excluded: pending payment`)
        
        // Auto-expire old pending orders (older than 15 minutes)
        if (data.createdAt) {
          const createdAt = data.createdAt.toDate ? data.createdAt.toDate().getTime() : new Date(data.createdAt).getTime()
          
          if (createdAt < fifteenMinutesAgo) {
            console.log(`  ↳ Also marking as expired (old pending order)`)
            // Mark as expired (fire and forget - don't wait)
            adminDb.collection('orders').doc(doc.id).update({
              paymentStatus: 'expired',
              updatedAt: new Date().toISOString(),
            }).catch(err => console.error('Failed to mark order as expired:', err))
          }
        }
        
        // Don't show ANY pending payment orders
        return false
      }
      
      console.log(`  ↳ Included`)
      return true
    })
    
    console.log('[Orders API] After filtering:', filteredDocs.length, 'orders')
    
    // Fetch orders with game names
    const ordersWithGameNames = await Promise.all(
      filteredDocs.map(async (orderDoc) => {
        const data = orderDoc.data()
        console.log('[Orders API] Processing order:', orderDoc.id, 'type:', data.type)

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
          console.log('[Orders API] Processing cart order with', data.shops.length, 'shops')
          
          // Flatten all items from all shops
          const allItems = data.shops.flatMap((shop: any) => shop.items || [])
          
          itemsWithGameNames = await Promise.all(
            allItems.map(async (item: any) => {
              let gameName = null
              
              // Try to get game name from productId (cart items use productId)
              const gameId = item.productId || item.gameId
              if (gameId) {
                try {
                  let gameDoc = await adminDb.collection('games').doc(gameId).get()
                  if (!gameDoc.exists) {
                    gameDoc = await adminDb.collection('gamesList').doc(gameId).get()
                  }
                  if (gameDoc.exists) {
                    gameName = gameDoc.data()?.name
                  }
                } catch (err) {
                  console.error('[Orders API] Error fetching game:', gameId, err)
                }
              }
              
              return {
                ...item,
                gameId: gameId, // Normalize to gameId
                gameName
              }
            })
          )
        } 
        // Handle direct orders (with items array)
        else if (data.items) {
          console.log('[Orders API] Processing direct order with', data.items.length, 'items')
          
          itemsWithGameNames = await Promise.all(
            data.items.map(async (item: any) => {
              let gameName = null
              
              if (item.gameId) {
                try {
                  let gameDoc = await adminDb.collection('games').doc(item.gameId).get()
                  if (!gameDoc.exists) {
                    gameDoc = await adminDb.collection('gamesList').doc(item.gameId).get()
                  }
                  if (gameDoc.exists) {
                    gameName = gameDoc.data()?.name
                  }
                } catch (err) {
                  console.error('[Orders API] Error fetching game:', item.gameId, err)
                }
              }
              
              return {
                ...item,
                gameName
              }
            })
          )
        }
        
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
