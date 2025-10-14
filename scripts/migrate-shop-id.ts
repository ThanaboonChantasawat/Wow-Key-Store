/**
 * Migration script to update shopId in user profiles
 * Run this once to update existing users who have shops
 */

import { db } from "@/components/firebase-config"
import { collection, getDocs, doc, updateDoc } from "firebase/firestore"

export async function migrateShopIdToUsers() {
  try {
    console.log("Starting shopId migration...")
    
    // Get all shops
    const shopsRef = collection(db, "shops")
    const shopsSnapshot = await getDocs(shopsRef)
    
    let updated = 0
    let errors = 0
    
    // Update each user with their shopId
    for (const shopDoc of shopsSnapshot.docs) {
      const shopData = shopDoc.data()
      const { ownerId, shopId } = shopData
      
      if (!ownerId || !shopId) {
        console.log(`Skipping shop ${shopDoc.id} - missing ownerId or shopId`)
        continue
      }
      
      try {
        const userRef = doc(db, "users", ownerId)
        await updateDoc(userRef, {
          shopId: shopId,
          isSeller: true,
          role: "seller"
        })
        updated++
        console.log(`✓ Updated user ${ownerId} with shopId ${shopId}`)
      } catch (error) {
        errors++
        console.error(`✗ Error updating user ${ownerId}:`, error)
      }
    }
    
    console.log(`\nMigration complete!`)
    console.log(`- Updated: ${updated}`)
    console.log(`- Errors: ${errors}`)
    console.log(`- Total shops: ${shopsSnapshot.size}`)
    
    return { updated, errors, total: shopsSnapshot.size }
  } catch (error) {
    console.error("Migration failed:", error)
    throw error
  }
}
