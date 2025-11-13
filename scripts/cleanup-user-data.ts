/**
 * Cleanup User Data Script
 * ลบข้อมูลผู้ใช้ทั้งหมดที่เกี่ยวข้อง สำหรับการทดสอบระบบใหม่
 * 
 * ⚠️ WARNING: สคริปต์นี้จะลบข้อมูลถาวร ใช้ด้วยความระมัดระวัง!
 * 
 * วิธีใช้งาน:
 * 1. ลบข้อมูลผู้ใช้ทั้งหมด: npx tsx scripts/cleanup-user-data.ts --all
 * 2. ลบข้อมูลผู้ใช้เฉพาะคน: npx tsx scripts/cleanup-user-data.ts --userId=<USER_ID>
 * 3. ลบข้อมูลผู้ใช้หลายคน: npx tsx scripts/cleanup-user-data.ts --userIds=<ID1>,<ID2>,<ID3>
 * 4. แสดงรายการผู้ใช้: npx tsx scripts/cleanup-user-data.ts --list
 */

import admin from 'firebase-admin'
import * as path from 'path'
import * as fs from 'fs'

// Load environment variables
import * as dotenv from 'dotenv'
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json')
  
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ ไม่พบไฟล์ serviceAccountKey.json')
    console.error('   กรุณาวางไฟล์ serviceAccountKey.json ไว้ที่ root ของโปรเจค')
    process.exit(1)
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
  })
  
  console.log(`✅ เชื่อมต่อ Firebase Project: ${serviceAccount.project_id}\n`)
}

const adminDb = admin.firestore()

interface CleanupOptions {
  all?: boolean
  userId?: string
  userIds?: string[]
  list?: boolean
  dryRun?: boolean
}

/**
 * แสดงรายการผู้ใช้ทั้งหมด
 */
async function listAllUsers() {
  console.log('📋 รายการผู้ใช้ทั้งหมด:')
  console.log('─'.repeat(80))

  const usersSnapshot = await adminDb.collection('users').get()
  
  if (usersSnapshot.empty) {
    console.log('ไม่มีผู้ใช้ในระบบ')
    return []
  }

  const users: any[] = []
  for (const doc of usersSnapshot.docs) {
    const data = doc.data()
    users.push({
      id: doc.id,
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || 'N/A',
    })
  }

  console.table(users)
  console.log(`\n✅ พบผู้ใช้ทั้งหมด: ${users.length} คน\n`)
  
  return users.map(u => u.id)
}

/**
 * ลบข้อมูลผู้ใช้ทั้งหมดที่เกี่ยวข้อง
 */
async function cleanupUserData(userId: string, dryRun: boolean = false): Promise<boolean> {
  try {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`🗑️  ${dryRun ? '[DRY RUN] ' : ''}กำลังลบข้อมูลของผู้ใช้: ${userId}`)
    console.log('='.repeat(80))

    // 1. ดึงข้อมูลผู้ใช้
    const userDoc = await adminDb.collection('users').doc(userId).get()
    if (!userDoc.exists) {
      console.log(`⚠️  ไม่พบผู้ใช้ ID: ${userId}`)
      return false
    }

    const userData = userDoc.data()
    console.log(`👤 ผู้ใช้: ${userData?.displayName || userData?.email || userId}`)
    console.log(`📧 อีเมล: ${userData?.email}`)
    console.log(`👔 บทบาท: ${userData?.role || 'buyer'}`)

    if (dryRun) {
      console.log('\n🔍 [DRY RUN] แสดงข้อมูลที่จะถูกลบ (ไม่มีการลบจริง):')
    }

    const batch = adminDb.batch()
    let deleteCount = 0

    // 2. ลบ Orders (คำสั่งซื้อ)
    console.log('\n📦 กำลังตรวจสอบ Orders...')
    const ordersSnapshot = await adminDb.collection('orders')
      .where('userId', '==', userId)
      .get()
    
    console.log(`   พบ ${ordersSnapshot.size} คำสั่งซื้อ`)
    if (!dryRun) {
      ordersSnapshot.forEach(doc => {
        batch.delete(doc.ref)
        deleteCount++
      })
    }

    // 3. ลบ Cart (ตะกร้าสินค้า)
    console.log('\n🛒 กำลังตรวจสอบ Cart...')
    const cartSnapshot = await adminDb.collection('cart')
      .where('userId', '==', userId)
      .get()
    
    console.log(`   พบ ${cartSnapshot.size} สินค้าในตะกร้า`)
    if (!dryRun) {
      cartSnapshot.forEach(doc => {
        batch.delete(doc.ref)
        deleteCount++
      })
    }

    // 4. ลบ Favorites (รายการโปรด)
    console.log('\n⭐ กำลังตรวจสอบ Favorites...')
    const favoritesSnapshot = await adminDb.collection('favorites')
      .where('userId', '==', userId)
      .get()
    
    console.log(`   พบ ${favoritesSnapshot.size} รายการโปรด`)
    if (!dryRun) {
      favoritesSnapshot.forEach(doc => {
        batch.delete(doc.ref)
        deleteCount++
      })
    }

    // 5. ลบ Shop (ร้านค้า) ถ้ามี
    console.log('\n🏪 กำลังตรวจสอบ Shop...')
    const shopsSnapshot = await adminDb.collection('shops')
      .where('ownerId', '==', userId)
      .get()
    
    if (shopsSnapshot.empty) {
      console.log('   ไม่มีร้านค้า')
    } else {
      for (const shopDoc of shopsSnapshot.docs) {
        const shopId = shopDoc.id
        const shopData = shopDoc.data()
        console.log(`   พบร้านค้า: ${shopData.shopName} (${shopId})`)

        // ลบ Products ของร้านนี้
        const productsSnapshot = await adminDb.collection('products')
          .where('shopId', '==', shopId)
          .get()
        
        console.log(`   - พบ ${productsSnapshot.size} สินค้า`)
        if (!dryRun) {
          productsSnapshot.forEach(doc => {
            batch.delete(doc.ref)
            deleteCount++
          })
        }

        // ลบร้านค้า
        if (!dryRun) {
          batch.delete(shopDoc.ref)
          deleteCount++
        }
      }
    }

    // 6. ลบ Products ที่ผู้ใช้สร้าง (กรณีไม่มีร้าน)
    console.log('\n📱 กำลังตรวจสอบ Products...')
    const productsSnapshot = await adminDb.collection('products')
      .where('userId', '==', userId)
      .get()
    
    if (productsSnapshot.size > 0) {
      console.log(`   พบ ${productsSnapshot.size} สินค้า`)
      if (!dryRun) {
        productsSnapshot.forEach(doc => {
          batch.delete(doc.ref)
          deleteCount++
        })
      }
    } else {
      console.log('   ไม่มีสินค้า')
    }

    // 7. ลบ Issues/Reports
    console.log('\n⚠️  กำลังตรวจสอบ Issues...')
    const issuesSnapshot = await adminDb.collection('issues')
      .where('userId', '==', userId)
      .get()
    
    console.log(`   พบ ${issuesSnapshot.size} รายงานปัญหา`)
    if (!dryRun) {
      issuesSnapshot.forEach(doc => {
        batch.delete(doc.ref)
        deleteCount++
      })
    }

    // 8. ลบ User Profile
    console.log('\n👤 กำลังลบ User Profile...')
    if (!dryRun) {
      batch.delete(userDoc.ref)
      deleteCount++
    }

    // 9. Commit batch
    if (!dryRun && deleteCount > 0) {
      console.log(`\n💾 กำลังบันทึกการลบข้อมูล (${deleteCount} รายการ)...`)
      await batch.commit()
      console.log('✅ ลบข้อมูลสำเร็จ!')
    } else if (dryRun) {
      console.log(`\n🔍 [DRY RUN] จะมีการลบข้อมูลทั้งหมด: ${deleteCount + ordersSnapshot.size + cartSnapshot.size + favoritesSnapshot.size + shopsSnapshot.size} รายการ`)
    }

    // 10. ลบผู้ใช้จาก Firebase Auth (optional)
    console.log('\n🔐 Firebase Authentication:')
    try {
      await admin.auth().deleteUser(userId)
      console.log('   ✅ ลบผู้ใช้จาก Firebase Auth สำเร็จ')
    } catch (authError: any) {
      if (authError.code === 'auth/user-not-found') {
        console.log('   ⚠️  ไม่พบผู้ใช้ใน Firebase Auth')
      } else {
        console.log(`   ⚠️  ไม่สามารถลบจาก Firebase Auth: ${authError.message}`)
      }
    }

    console.log(`\n${'='.repeat(80)}`)
    console.log(`✅ เสร็จสิ้นการลบข้อมูลของผู้ใช้: ${userId}`)
    console.log('='.repeat(80))

    return true
  } catch (error: any) {
    console.error(`❌ เกิดข้อผิดพลาด:`, error.message)
    return false
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2)
  
  // Parse arguments
  const options: CleanupOptions = {
    all: args.includes('--all'),
    list: args.includes('--list'),
    dryRun: args.includes('--dry-run'),
  }

  const userIdArg = args.find(arg => arg.startsWith('--userId='))
  if (userIdArg) {
    options.userId = userIdArg.split('=')[1]
  }

  const userIdsArg = args.find(arg => arg.startsWith('--userIds='))
  if (userIdsArg) {
    options.userIds = userIdsArg.split('=')[1].split(',').map(id => id.trim())
  }

  // Show help
  if (args.includes('--help') || args.length === 0) {
    console.log(`
🗑️  Cleanup User Data Script

วิธีใช้งาน:
  npx tsx scripts/cleanup-user-data.ts [options]

Options:
  --list                  แสดงรายการผู้ใช้ทั้งหมด
  --userId=<ID>          ลบข้อมูลผู้ใช้เฉพาะคน
  --userIds=<ID1,ID2>    ลบข้อมูลผู้ใช้หลายคน (คั่นด้วย comma)
  --all                   ลบข้อมูลผู้ใช้ทั้งหมด (ระวัง!)
  --dry-run               ทดสอบก่อนลบจริง (แนะนำ)
  --help                  แสดงวิธีใช้งาน

ตัวอย่าง:
  npx tsx scripts/cleanup-user-data.ts --list
  npx tsx scripts/cleanup-user-data.ts --userId=abc123 --dry-run
  npx tsx scripts/cleanup-user-data.ts --userIds=abc123,def456
  npx tsx scripts/cleanup-user-data.ts --all --dry-run

⚠️  คำเตือน: การลบข้อมูลจะไม่สามารถกู้คืนได้!
    `)
    process.exit(0)
  }

  console.log('🚀 Cleanup User Data Script')
  console.log('='.repeat(80))

  try {
    // List users
    if (options.list) {
      await listAllUsers()
      process.exit(0)
    }

    // Cleanup all users
    if (options.all) {
      console.log('⚠️  คุณกำลังจะลบข้อมูลผู้ใช้ทั้งหมด!')
      
      if (!options.dryRun) {
        console.log('\n❌ กรุณาใช้ --dry-run ก่อนเพื่อดูข้อมูลที่จะถูกลบ')
        console.log('   เช่น: npx tsx scripts/cleanup-user-data.ts --all --dry-run\n')
        process.exit(1)
      }

      const userIds = await listAllUsers()
      
      for (const userId of userIds) {
        await cleanupUserData(userId, options.dryRun)
      }
      
      console.log(`\n✅ เสร็จสิ้น! ลบข้อมูลผู้ใช้ทั้งหมด ${userIds.length} คน`)
      process.exit(0)
    }

    // Cleanup specific user
    if (options.userId) {
      const success = await cleanupUserData(options.userId, options.dryRun)
      process.exit(success ? 0 : 1)
    }

    // Cleanup multiple users
    if (options.userIds && options.userIds.length > 0) {
      console.log(`กำลังลบข้อมูลผู้ใช้ ${options.userIds.length} คน...`)
      
      let successCount = 0
      for (const userId of options.userIds) {
        const success = await cleanupUserData(userId, options.dryRun)
        if (success) successCount++
      }
      
      console.log(`\n✅ เสร็จสิ้น! ลบข้อมูลสำเร็จ ${successCount}/${options.userIds.length} คน`)
      process.exit(0)
    }

    // No valid option provided
    console.log('❌ กรุณาระบุตัวเลือก: --list, --userId, --userIds, หรือ --all')
    console.log('   ใช้ --help เพื่อดูวิธีใช้งาน\n')
    process.exit(1)

  } catch (error: any) {
    console.error('\n❌ เกิดข้อผิดพลาด:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run the script
main()
