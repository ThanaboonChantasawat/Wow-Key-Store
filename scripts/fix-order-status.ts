/**
 * Script to fix orders that are missing status field
 * Run this once to migrate old orders
 */

import { adminDb } from '../lib/firebase-admin-config'

async function fixOrderStatus() {
  try {
    console.log('🔧 Starting order status fix...')

    // Get all orders
    const ordersRef = adminDb.collection('orders')
    const snapshot = await ordersRef.get()

    console.log(`📦 Found ${snapshot.size} orders`)

    let fixedCount = 0
    let alreadyHasStatus = 0

    const batch = adminDb.batch()
    let batchCount = 0
    const BATCH_LIMIT = 500

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

      // Update in batch
      batch.update(doc.ref, {
        status: newStatus,
        updatedAt: new Date(),
      })

      fixedCount++
      batchCount++

      // Commit batch every 500 updates
      if (batchCount >= BATCH_LIMIT) {
        await batch.commit()
        console.log(`✅ Committed batch of ${batchCount} updates`)
        batchCount = 0
      }
    }

    // Commit remaining updates
    if (batchCount > 0) {
      await batch.commit()
      console.log(`✅ Committed final batch of ${batchCount} updates`)
    }

    console.log(`\n📊 Summary:`)
    console.log(`   Total orders: ${snapshot.size}`)
    console.log(`   Already had status: ${alreadyHasStatus}`)
    console.log(`   Fixed: ${fixedCount}`)
    console.log(`\n✅ Done!`)

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

// Run the script
fixOrderStatus()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
