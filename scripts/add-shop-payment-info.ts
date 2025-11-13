import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
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

async function addPaymentInfoToShop(shopId: string) {
  try {
    console.log(`\n🔄 Adding payment info to shop: ${shopId}`)
    
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
    
    // Check if already has payment info
    if (shopData?.bankAccountNumber || shopData?.promptPayId) {
      console.log(`✅ Shop already has payment info configured`)
      return
    }
    
    // Add default PromptPay (example: phone number)
    const updateData = {
      promptPayId: '0812345678', // เปลี่ยนเป็นเบอร์จริงของเจ้าของร้าน
      bankAccountNumber: '1234567890', // เปลี่ยนเป็นเลขบัญชีจริง
      bankName: 'ธนาคารกรุงเทพ',
      bankAccountName: shopData?.shopName || 'เจ้าของร้าน',
      updatedAt: new Date(),
    }
    
    await shopRef.update(updateData)
    
    console.log(`✅ Successfully added payment info to shop ${shopData?.shopName}`)
    console.log(`📋 Updated data:`, updateData)
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Main execution
const shopId = process.argv[2]

if (!shopId) {
  console.log('Usage: npx tsx scripts/add-shop-payment-info.ts <shopId>')
  console.log('Example: npx tsx scripts/add-shop-payment-info.ts shop_rdC7c6sHzvZU4PzsA8oZxD6A9Vv2')
  process.exit(1)
}

addPaymentInfoToShop(shopId)
  .then(() => {
    console.log('\n✅ Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
