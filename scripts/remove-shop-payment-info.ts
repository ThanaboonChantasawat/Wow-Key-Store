import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import * as path from 'path'
import * as fs from 'fs'

// Initialize Firebase Admin
const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json')
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ serviceAccountKey.json not found')
  process.exit(1)
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount)
  })
}

const db = getFirestore()

async function removePaymentInfoFromShop(shopId: string) {
  try {
    console.log(`\n🔄 Removing payment info from shop: ${shopId}`)
    
    const shopRef = db.collection('shops').doc(shopId)
    const shopDoc = await shopRef.get()
    
    if (!shopDoc.exists) {
      console.error(`❌ Shop ${shopId} not found`)
      return
    }
    
    const shopData = shopDoc.data()
    console.log(`📋 Current shop data:`, {
      shopName: shopData?.shopName,
      bankAccountNumber: shopData?.bankAccountNumber,
      promptPayId: shopData?.promptPayId,
    })
    
    // Remove payment info fields
    await shopRef.update({
      promptPayId: FieldValue.delete(),
      bankAccountNumber: FieldValue.delete(),
      bankName: FieldValue.delete(),
      bankAccountName: FieldValue.delete(),
      bankBranch: FieldValue.delete(),
      updatedAt: new Date(),
    })
    
    console.log(`✅ Successfully removed payment info from shop ${shopData?.shopName}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Main execution
const shopId = process.argv[2]

if (!shopId) {
  console.log('Usage: npx tsx scripts/remove-shop-payment-info.ts <shopId>')
  console.log('Example: npx tsx scripts/remove-shop-payment-info.ts shop_rdC7c6sHzvZU4PzsA8oZxD6A9Vv2')
  process.exit(1)
}

removePaymentInfoFromShop(shopId)
  .then(() => {
    console.log('\n✅ Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
