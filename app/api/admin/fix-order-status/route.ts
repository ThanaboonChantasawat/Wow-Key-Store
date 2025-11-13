import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

/**
 * API to fix orders that are missing status field
 * GET /api/admin/fix-order-status
 */
export async function GET() {
  try {
    console.log('🔧 Starting order status fix...')

    // Get all orders
    const ordersRef = adminDb.collection('orders')
    const snapshot = await ordersRef.get()

    console.log(`📦 Found ${snapshot.size} orders`)

    let fixedCount = 0
    let alreadyHasStatus = 0
    const updates: Promise<any>[] = []

    for (const doc of snapshot.docs) {
      const data = doc.data()

      // Skip if already has status
      if (data.status) {
        alreadyHasStatus++
        continue
      }

      // Determine status based on existing data
      let newStatus = 'pending' // default

      if (data.paymentStatus === 'completed') {
        // If payment is completed but no delivery yet
        if (!data.gameCodeDeliveredAt) {
          newStatus = 'pending' // Waiting for seller to deliver
        } else if (data.gameCodeDeliveredAt && !data.buyerConfirmed) {
          newStatus = 'processing' // Delivered, waiting for buyer confirmation
        } else if (data.buyerConfirmed) {
          newStatus = 'completed' // Buyer confirmed
        }
      } else if (data.paymentStatus === 'failed') {
        newStatus = 'cancelled'
      }

      // Update document
      updates.push(
        doc.ref.update({
          status: newStatus,
          updatedAt: new Date(),
        })
      )

      fixedCount++
    }

    // Execute all updates
    await Promise.all(updates)

    const summary = {
      total: snapshot.size,
      alreadyHadStatus: alreadyHasStatus,
      fixed: fixedCount,
    }

    console.log(`\n📊 Summary:`, summary)
    console.log(`✅ Done!`)

    return NextResponse.json({
      success: true,
      message: 'Order status fix completed',
      ...summary,
    })
  } catch (error: any) {
    console.error('❌ Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fix order status' },
      { status: 500 }
    )
  }
}
