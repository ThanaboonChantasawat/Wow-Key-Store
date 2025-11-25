// Auto-confirm Service
// Handles automatic order confirmation after specified days

import { adminDb } from './firebase-admin-config'
import { createNotification } from './notification-service'

const AUTO_CONFIRM_DAYS = 7 // จำนวนวันที่รอก่อนยืนยันอัตโนมัติ

/**
 * Check and auto-confirm orders that have been delivered but not confirmed by buyer
 * Should be run by a scheduled function (cron job)
 */
export async function autoConfirmOrders(): Promise<{
  success: boolean
  confirmedCount: number
  errors: string[]
}> {
  try {
    const errors: string[] = []
    let confirmedCount = 0

    // คำนวณวันที่ที่ต้องยืนยันอัตโนมัติ
    const autoConfirmDate = new Date()
    autoConfirmDate.setDate(autoConfirmDate.getDate() - AUTO_CONFIRM_DAYS)

    console.log(`🤖 Auto-confirm: Checking orders delivered before ${autoConfirmDate.toISOString()}`)

    // ค้นหา Orders ที่:
    // 1. ส่งรหัสแล้ว (gameCodeDeliveredAt exists)
    // 2. ผู้ซื้อยังไม่ยืนยัน (buyerConfirmed = false)
    // 3. ส่งรหัสมานานกว่า X วัน
    // 4. ยังไม่มี dispute
    const ordersSnapshot = await adminDb
      .collection('orders')
      .where('buyerConfirmed', '==', false)
      .where('paymentStatus', '==', 'completed')
      .get()

    console.log(`📦 Found ${ordersSnapshot.size} orders not confirmed by buyer`)

    for (const orderDoc of ordersSnapshot.docs) {
      const orderData = orderDoc.data()
      
      // ตรวจสอบว่ามี gameCodeDeliveredAt หรือไม่
      if (!orderData.gameCodeDeliveredAt) {
        continue // ข้ามถ้ายังไม่ได้ส่งรหัส
      }

      // ตรวจสอบว่ามี dispute หรือไม่
      const disputeSnapshot = await adminDb
        .collection('disputes')
        .where('orderId', '==', orderDoc.id)
        .where('status', 'in', ['pending', 'investigating'])
        .get()

      if (!disputeSnapshot.empty) {
        console.log(`⚠️ Order ${orderDoc.id} has active dispute, skipping auto-confirm`)
        continue
      }

      // แปลง Timestamp เป็น Date
      const deliveredAt = orderData.gameCodeDeliveredAt?.toDate
        ? orderData.gameCodeDeliveredAt.toDate()
        : new Date(orderData.gameCodeDeliveredAt)

      // ตรวจสอบว่าส่งรหัสมานานกว่า X วันหรือไม่
      if (deliveredAt <= autoConfirmDate) {
        try {
          // อัพเดท Order เป็น completed และ buyerConfirmed
          await orderDoc.ref.update({
            status: 'completed',
            buyerConfirmed: true,
            buyerConfirmedAt: new Date(),
            autoConfirmed: true, // flag บอกว่ายืนยันอัตโนมัติ
            updatedAt: new Date()
          })

          confirmedCount++
          console.log(`✅ Auto-confirmed order ${orderDoc.id}`)

          // ส่ง Notification ให้ผู้ขาย
          if (orderData.shopId) {
            const shopDoc = await adminDb.collection('shops').doc(orderData.shopId).get()
            const shopData = shopDoc.data()
            
            if (shopData?.ownerId) {
              await createNotification(
                shopData.ownerId,
                'order_confirmed',
                'ยืนยันคำสั่งซื้ออัตโนมัติ',
                `คำสั่งซื้อ #${orderDoc.id.slice(-8)} ได้รับการยืนยันอัตโนมัติแล้ว เนื่องจากเกิน ${AUTO_CONFIRM_DAYS} วันโดยไม่มีปัญหา`,
                `/seller/orders/${orderDoc.id}`
              )
            }
          }

          // ส่ง Notification ให้ผู้ซื้อ
          if (orderData.userId) {
            await createNotification(
              orderData.userId,
              'order_confirmed',
              'ยืนยันคำสั่งซื้ออัตโนมัติ',
              `คำสั่งซื้อ #${orderDoc.id.slice(-8)} ได้รับการยืนยันอัตโนมัติเนื่องจากไม่มีการรายงานปัญหาภายใน ${AUTO_CONFIRM_DAYS} วัน`,
              `/profile?tab=orders`
            )
          }

        } catch (error: any) {
          console.error(`❌ Error auto-confirming order ${orderDoc.id}:`, error)
          errors.push(`Order ${orderDoc.id}: ${error.message}`)
        }
      }
    }

    return {
      success: true,
      confirmedCount,
      errors
    }

  } catch (error: any) {
    console.error('❌ Error in autoConfirmOrders:', error)
    return {
      success: false,
      confirmedCount: 0,
      errors: [error.message]
    }
  }
}

/**
 * Get the remaining days before auto-confirmation for an order
 */
export async function getAutoConfirmRemainingDays(orderId: string): Promise<number | null> {
  try {
    const orderDoc = await adminDb.collection('orders').doc(orderId).get()
    
    if (!orderDoc.exists) {
      return null
    }

    const orderData = orderDoc.data()

    // ถ้ายืนยันแล้วหรือยังไม่ส่งรหัส
    if (orderData?.buyerConfirmed || !orderData?.gameCodeDeliveredAt) {
      return null
    }

    const deliveredAt = orderData.gameCodeDeliveredAt?.toDate
      ? orderData.gameCodeDeliveredAt.toDate()
      : new Date(orderData.gameCodeDeliveredAt)

    const now = new Date()
    const daysPassed = Math.floor((now.getTime() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24))
    const remainingDays = AUTO_CONFIRM_DAYS - daysPassed

    return Math.max(0, remainingDays)

  } catch (error) {
    console.error('Error getting auto-confirm remaining days:', error)
    return null
  }
}
