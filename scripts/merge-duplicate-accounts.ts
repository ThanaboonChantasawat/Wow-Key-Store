// Script: Merge duplicate accounts (same email, different providers)
// Run this script to merge Google accounts into Email/Password accounts

import admin from 'firebase-admin'
import { readFileSync } from 'fs'
import { join } from 'path'

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    readFileSync(join(process.cwd(), 'serviceAccountKey.json'), 'utf-8')
  )
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })
}

const adminDb = admin.firestore()

interface UserData {
  uid: string
  email: string
  displayName?: string
  photoURL?: string
  createdAt: any
}

async function mergeDuplicateAccounts(dryRun: boolean = true) {
  try {
    console.log('🔍 Searching for duplicate accounts...')
    console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no changes)' : '⚠️  LIVE RUN (will make changes)'}`)

    // 1. Get all users from Firestore
    const usersSnapshot = await adminDb.collection('users').get()
    
    // 2. Group by email
    const emailMap = new Map<string, UserData[]>()
    
    usersSnapshot.forEach(doc => {
      const data = doc.data()
      if (data.email) {
        const existing = emailMap.get(data.email) || []
        existing.push({
          uid: doc.id,
          email: data.email,
          displayName: data.displayName,
          photoURL: data.photoURL,
          createdAt: data.createdAt
        })
        emailMap.set(data.email, existing)
      }
    })

    // 3. Find duplicates (same email, multiple UIDs)
    const duplicates = Array.from(emailMap.entries())
      .filter(([_, users]) => users.length > 1)
    
    console.log(`📊 Found ${duplicates.length} emails with multiple accounts\n`)

    if (duplicates.length === 0) {
      console.log('✅ No duplicate accounts found!')
      return { success: true, merged: 0 }
    }

    let totalMerged = 0

    // 4. For each duplicate, merge data
    for (const [email, users] of duplicates) {
      console.log(`\n${'='.repeat(80)}`)
      console.log(`📧 Email: ${email}`)
      console.log(`   Accounts found: ${users.length}`)
      
      // Sort by creation date (oldest first = primary account)
      const sortedUsers = users.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt)
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt)
        return dateA.getTime() - dateB.getTime()
      })

      const primaryAccount = sortedUsers[0]
      const duplicateAccounts = sortedUsers.slice(1)

      console.log(`\n   ✅ PRIMARY Account (keep):`)
      console.log(`      UID: ${primaryAccount.uid}`)
      console.log(`      Name: ${primaryAccount.displayName || 'N/A'}`)
      console.log(`      Created: ${(primaryAccount.createdAt?.toDate?.() || new Date(primaryAccount.createdAt)).toISOString()}`)

      console.log(`\n   ⚠️  DUPLICATE Accounts (will merge):`)
      duplicateAccounts.forEach((dup, idx) => {
        console.log(`      ${idx + 1}. UID: ${dup.uid}`)
        console.log(`         Name: ${dup.displayName || 'N/A'}`)
        console.log(`         Created: ${(dup.createdAt?.toDate?.() || new Date(dup.createdAt)).toISOString()}`)
      })

      // Merge each duplicate into primary
      for (const duplicateAccount of duplicateAccounts) {
        console.log(`\n   🔄 Merging ${duplicateAccount.uid} → ${primaryAccount.uid}...`)
        
        try {
          await mergeUserData(primaryAccount.uid, duplicateAccount.uid, dryRun)
          totalMerged++
        } catch (error: any) {
          console.error(`   ❌ Error merging ${duplicateAccount.uid}:`, error.message)
        }
      }
    }

    console.log(`\n${'='.repeat(80)}`)
    console.log(`\n✅ Merge completed!`)
    console.log(`   Total accounts merged: ${totalMerged}`)
    
    if (dryRun) {
      console.log(`\n⚠️  This was a DRY RUN - no actual changes were made`)
      console.log(`   Run with --live flag to apply changes`)
    }

    return { success: true, merged: totalMerged }

  } catch (error) {
    console.error('❌ Error:', error)
    return { success: false, merged: 0 }
  }
}

/**
 * Merge all data from duplicate user to primary user
 */
async function mergeUserData(primaryUid: string, duplicateUid: string, dryRun: boolean) {
  const batch = adminDb.batch()
  let operations = 0

  // 1. Merge Orders
  console.log(`      📦 Merging orders...`)
  const ordersSnapshot = await adminDb
    .collection('orders')
    .where('userId', '==', duplicateUid)
    .get()
  
  console.log(`         Found ${ordersSnapshot.size} orders`)
  
  if (!dryRun) {
    ordersSnapshot.forEach(doc => {
      batch.update(doc.ref, { userId: primaryUid })
      operations++
    })
  }

  // 2. Merge Favorites
  console.log(`      ⭐ Merging favorites...`)
  const favoritesSnapshot = await adminDb
    .collection('favorites')
    .where('userId', '==', duplicateUid)
    .get()
  
  console.log(`         Found ${favoritesSnapshot.size} favorites`)
  
  if (!dryRun) {
    favoritesSnapshot.forEach(doc => {
      batch.update(doc.ref, { userId: primaryUid })
      operations++
    })
  }

  // 3. Merge Reviews
  console.log(`      ⭐ Merging reviews...`)
  const reviewsSnapshot = await adminDb
    .collection('reviews')
    .where('userId', '==', duplicateUid)
    .get()
  
  console.log(`         Found ${reviewsSnapshot.size} reviews`)
  
  if (!dryRun) {
    reviewsSnapshot.forEach(doc => {
      batch.update(doc.ref, { userId: primaryUid })
      operations++
    })
  }

  // 4. Merge Cart
  console.log(`      🛒 Merging cart...`)
  const cartSnapshot = await adminDb
    .collection('carts')
    .where('userId', '==', duplicateUid)
    .get()
  
  console.log(`         Found ${cartSnapshot.size} cart items`)
  
  if (!dryRun) {
    cartSnapshot.forEach(doc => {
      batch.update(doc.ref, { userId: primaryUid })
      operations++
    })
  }

  // 5. Merge Notifications
  console.log(`      🔔 Merging notifications...`)
  const notificationsSnapshot = await adminDb
    .collection('notifications')
    .where('userId', '==', duplicateUid)
    .get()
  
  console.log(`         Found ${notificationsSnapshot.size} notifications`)
  
  if (!dryRun) {
    notificationsSnapshot.forEach(doc => {
      batch.update(doc.ref, { userId: primaryUid })
      operations++
    })
  }

  // 6. Merge Shop ownership (if applicable)
  console.log(`      🏪 Checking shops...`)
  const shopsSnapshot = await adminDb
    .collection('shops')
    .where('ownerId', '==', duplicateUid)
    .get()
  
  console.log(`         Found ${shopsSnapshot.size} shops`)
  
  if (!dryRun) {
    shopsSnapshot.forEach(doc => {
      batch.update(doc.ref, { ownerId: primaryUid })
      operations++
    })
  }

  // 7. Delete duplicate user profile
  console.log(`      🗑️  Deleting duplicate user profile...`)
  if (!dryRun) {
    const duplicateUserRef = adminDb.collection('users').doc(duplicateUid)
    batch.delete(duplicateUserRef)
    operations++
  }

  // Commit all changes
  if (!dryRun && operations > 0) {
    console.log(`      💾 Committing ${operations} changes...`)
    await batch.commit()
    console.log(`      ✅ Merge completed!`)
  } else if (dryRun) {
    console.log(`      ℹ️  Would commit ${operations} changes (dry run)`)
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const isLiveRun = args.includes('--live') || args.includes('-l')

console.log('\n' + '='.repeat(80))
console.log('🔄 Account Merge Script')
console.log('='.repeat(80) + '\n')

if (!isLiveRun) {
  console.log('⚠️  Running in DRY RUN mode (no changes will be made)')
  console.log('   Use --live or -l flag to apply changes\n')
}

// Run the script
mergeDuplicateAccounts(!isLiveRun)
  .then(result => {
    console.log(`\n${'='.repeat(80)}`)
    console.log('✅ Script finished')
    console.log(`   Success: ${result.success}`)
    console.log(`   Accounts merged: ${result.merged}`)
    console.log('='.repeat(80) + '\n')
    process.exit(0)
  })
  .catch(err => {
    console.error('❌ Fatal error:', err)
    process.exit(1)
  })
