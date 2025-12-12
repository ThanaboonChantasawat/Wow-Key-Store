import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

/**
 * API สำหรับผู้ดูแลระบบ: ลบคำสั่งซื้อซ้ำ (เฉพาะกรณีที่สถานะการชำระเงินยังไม่สำเร็จ)
 * เก็บคำสั่งซื้อล่าสุดไว้ และลบรายการซ้ำที่เก่ากว่า
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, dryRun = true } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'กรุณาระบุรหัสผู้ใช้' },
        { status: 400 }
      )
    }

    console.log(`[Cleanup] ${dryRun ? 'ทดสอบ:' : 'กำลังดำเนินการ:'} ลบคำสั่งซื้อซ้ำ`)

    // Get all orders for this user
    const ordersSnapshot = await adminDb
      .collection('orders')
      .where('userId', '==', userId)
      .get()

    const orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as any[]

    console.log(`[Cleanup] พบคำสั่งซื้อทั้งหมด ${orders.length} รายการ`)

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
          totalCount: groupOrders.length,
          keepOrder: {
            createdAt: newest.createdAt,
            paymentStatus: newest.paymentStatus,
            status: newest.status,
          },
          duplicateOrders: duplicates.map(d => ({
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
            console.log(`[Cleanup] ข้ามรายการที่ไม่ควรลบ (สถานะการชำระเงิน: ${dup.paymentStatus})`)
          }
        }
      }
    }

    console.log(`[Cleanup] พบกลุ่มคำสั่งซื้อซ้ำ ${duplicatesFound.length} กลุ่ม`)
    console.log(`[Cleanup] รายการที่จะลบ ${ordersToDelete.length} รายการ`)

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
        console.log(`[Cleanup] ลบชุดที่ ${i / batchSize + 1} เรียบร้อยแล้ว`)
      }

      console.log(`[Cleanup] ✅ ลบคำสั่งซื้อซ้ำ ${ordersToDelete.length} รายการเรียบร้อยแล้ว`)
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
        ? 'ทดสอบเสร็จสิ้น (ยังไม่ได้ลบจริง)'
        : `ลบคำสั่งซื้อซ้ำสำเร็จ ${ordersToDelete.length} รายการ`,
    })
  } catch (error: any) {
    console.error('[Cleanup] เกิดข้อผิดพลาด:', error)
    return NextResponse.json(
      { 
        error: 'ไม่สามารถลบคำสั่งซื้อซ้ำได้',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
