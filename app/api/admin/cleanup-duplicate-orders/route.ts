import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

/**
 * Admin API to cleanup duplicate pending orders
 * Keeps the most recent order and deletes older duplicates
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, dryRun = true } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    console.log(`[Cleanup] ${dryRun ? 'DRY RUN:' : 'EXECUTING:'} Cleaning up duplicate orders for user:`, userId)

    // Get all orders for this user
    const ordersSnapshot = await adminDb
      .collection('orders')
      .where('userId', '==', userId)
      .get()

    const orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as any[]

    console.log(`[Cleanup] Found ${orders.length} total orders`)

    // Group orders by cartItemIds (to find duplicates from same cart)
    const orderGroups = new Map<string, any[]>()

    for (const order of orders) {
      const cartItemIds = (order as any).cartItemIds || []
      if (cartItemIds.length === 0) continue

      // Create a key from sorted cart item IDs
      const key = [...cartItemIds].sort().join(',')
      
      if (!orderGroups.has(key)) {
        orderGroups.set(key, [])
      }
      orderGroups.get(key)!.push(order)
    }

    const duplicatesFound: any[] = []
    const ordersToDelete: string[] = []

    // Find duplicate groups
    for (const [key, groupOrders] of orderGroups.entries()) {
      if (groupOrders.length > 1) {
        // Sort by createdAt (newest first)
        groupOrders.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime()
          const dateB = new Date(b.createdAt || 0).getTime()
          return dateB - dateA
        })

        const [newest, ...duplicates] = groupOrders

        duplicatesFound.push({
          cartItemsKey: key,
          totalCount: groupOrders.length,
          keepOrder: {
            id: newest.id.substring(0, 12),
            createdAt: newest.createdAt,
            paymentStatus: newest.paymentStatus,
            status: newest.status,
          },
          duplicateOrders: duplicates.map(d => ({
            id: d.id.substring(0, 12),
            createdAt: d.createdAt,
            paymentStatus: d.paymentStatus,
            status: d.status,
          })),
        })

        // Only delete pending/failed duplicates (don't touch completed ones)
        for (const dup of duplicates) {
          if (dup.paymentStatus === 'pending' || dup.paymentStatus === 'failed') {
            ordersToDelete.push(dup.id)
          } else {
            console.log(`[Cleanup] Skipping order ${dup.id} - paymentStatus: ${dup.paymentStatus}`)
          }
        }
      }
    }

    console.log(`[Cleanup] Found ${duplicatesFound.length} duplicate groups`)
    console.log(`[Cleanup] Will delete ${ordersToDelete.length} orders`)

    if (!dryRun && ordersToDelete.length > 0) {
      // Delete duplicate orders in batches
      const batchSize = 500
      for (let i = 0; i < ordersToDelete.length; i += batchSize) {
        const batch = adminDb.batch()
        const batchOrders = ordersToDelete.slice(i, i + batchSize)
        
        for (const orderId of batchOrders) {
          const orderRef = adminDb.collection('orders').doc(orderId)
          batch.delete(orderRef)
        }
        
        await batch.commit()
        console.log(`[Cleanup] Deleted batch ${i / batchSize + 1}`)
      }

      console.log(`[Cleanup] ✅ Deleted ${ordersToDelete.length} duplicate orders`)
    }

    return NextResponse.json({
      success: true,
      dryRun,
      summary: {
        totalOrders: orders.length,
        duplicateGroups: duplicatesFound.length,
        ordersToDelete: ordersToDelete.length,
      },
      duplicatesFound,
      message: dryRun 
        ? 'Dry run completed. Set dryRun=false to actually delete duplicates.'
        : `Successfully deleted ${ordersToDelete.length} duplicate orders`,
    })
  } catch (error: any) {
    console.error('[Cleanup] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to cleanup duplicate orders',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
