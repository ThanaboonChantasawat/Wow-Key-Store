/**
 * Script to migrate violations count for users who have been reported
 * Run this once to update existing users with their violation counts
 */

import { adminDb } from '../lib/firebase-admin-config'

async function migrateViolations() {
  try {
    console.log('🚀 Starting violations migration...')

    // Get all approved reports (where content was deleted or user was banned)
    const reportsSnapshot = await adminDb
      .collection('reports')
      .where('status', '==', 'approved')
      .get()

    console.log(`📊 Found ${reportsSnapshot.docs.length} approved reports`)

    // Group reports by targetUserId to count violations per user
    const userViolations: Record<string, number> = {}

    reportsSnapshot.docs.forEach((doc) => {
      const report = doc.data()
      if (report.targetUserId) {
        userViolations[report.targetUserId] = (userViolations[report.targetUserId] || 0) + 1
      }
    })

    console.log(`👥 Found ${Object.keys(userViolations).length} users with violations`)

    // Update each user's violations count
    let updatedCount = 0
    for (const [userId, violations] of Object.entries(userViolations)) {
      try {
        // Get user data first to check if they exist
        const userDoc = await adminDb.collection('users').doc(userId).get()
        
        if (userDoc.exists) {
          await adminDb.collection('users').doc(userId).update({
            violations: violations,
            lastViolation: new Date()
          })
          
          const userData = userDoc.data()
          console.log(`✅ Updated user ${userData?.displayName || userId}: ${violations} violations`)
          updatedCount++
        } else {
          console.log(`⚠️  User ${userId} not found in database`)
        }
      } catch (error) {
        console.error(`❌ Error updating user ${userId}:`, error)
      }
    }

    console.log(`\n🎉 Migration complete!`)
    console.log(`📈 Updated ${updatedCount} users`)
    console.log(`📝 Total violations distributed: ${Object.values(userViolations).reduce((a, b) => a + b, 0)}`)

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

// Run the migration
migrateViolations()
  .then(() => {
    console.log('✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
