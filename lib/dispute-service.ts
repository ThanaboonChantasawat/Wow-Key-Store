// Dispute Service
// Handles buyer complaints and dispute resolution

import { adminDb } from './firebase-admin-config'
import { Dispute, CreateDisputeRequest, DisputeStatus, DisputeType } from './dispute-types'
import { createNotification } from './notification-service'
import { Timestamp } from 'firebase-admin/firestore'

/**
 * Create a new dispute for an order
 */
export async function createDispute(
  userId: string,
  data: CreateDisputeRequest
): Promise<{ success: boolean; disputeId?: string; error?: string }> {
  try {
    // ตรวจสอบว่า Order มีอยู่จริง
    const orderDoc = await adminDb.collection('orders').doc(data.orderId).get()
    
    if (!orderDoc.exists) {
      return { success: false, error: 'ไม่พบคำสั่งซื้อ' }
    }

    const orderData = orderDoc.data()

    // ตรวจสอบว่าเป็น Order ของผู้ใช้จริง
    if (orderData?.userId !== userId) {
      return { success: false, error: 'คำสั่งซื้อนี้ไม่ใช่ของคุณ' }
    }

    // ตรวจสอบว่าผู้ขายส่งรหัสแล้วหรือยัง
    if (!orderData?.gameCodeDeliveredAt && data.type !== 'no_code_received') {
      return { success: false, error: 'ผู้ขายยังไม่ได้ส่งรหัส' }
    }

    // ตรวจสอบว่ายืนยันแล้วหรือยัง (ไม่ให้รายงานหลังยืนยัน)
    if (orderData?.buyerConfirmed) {
      return { success: false, error: 'ไม่สามารถรายงานปัญหาหลังยืนยันสินค้าแล้ว' }
    }

    // ตรวจสอบว่ามี Dispute อยู่แล้วหรือไม่
    const existingDispute = await adminDb
      .collection('disputes')
      .where('orderId', '==', data.orderId)
      .where('status', 'in', ['pending', 'investigating'])
      .get()

    if (!existingDispute.empty) {
      return { success: false, error: 'คำสั่งซื้อนี้มีการรายงานปัญหาอยู่แล้ว' }
    }

    // สร้าง Dispute
    const dispute: Omit<Dispute, 'id'> = {
      orderId: data.orderId,
      orderNumber: `#${orderData.id?.slice(-8) || 'N/A'}`,
      userId,
      shopId: orderData.shopId,
      sellerId: orderData.sellerId || '',
      type: data.type,
      subject: data.subject,
      description: data.description,
      evidence: data.evidence || [],
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Get seller ID from shop
    if (orderData.shopId) {
      const shopDoc = await adminDb.collection('shops').doc(orderData.shopId).get()
      const shopData = shopDoc.data()
      if (shopData?.ownerId) {
        dispute.sellerId = shopData.ownerId
      }
    }

    const disputeRef = await adminDb.collection('disputes').add(dispute)

    // พักการโอนเงิน (update order)
    await orderDoc.ref.update({
      hasDispute: true,
      disputeId: disputeRef.id,
      updatedAt: new Date()
    })

    // ส่ง Notification ให้ผู้ขาย
    if (dispute.sellerId) {
      await createNotification(
        dispute.sellerId,
        'report',
        'มีการรายงานปัญหาจากผู้ซื้อ',
        `คำสั่งซื้อ ${dispute.orderNumber} ถูกรายงานปัญหา: ${data.subject}`,
        `/seller/disputes/${disputeRef.id}`
      )
    }

    // ส่ง Notification ให้ Admin
    const adminsSnapshot = await adminDb
      .collection('users')
      .where('role', 'in', ['admin', 'superadmin'])
      .get()

    for (const adminDoc of adminsSnapshot.docs) {
      await createNotification(
        adminDoc.id,
        'report',
        'มีการรายงานปัญหาใหม่',
        `คำสั่งซื้อ ${dispute.orderNumber}: ${data.subject}`,
        `/admin/disputes/${disputeRef.id}`
      )
    }

    console.log(`✅ Created dispute ${disputeRef.id} for order ${data.orderId}`)

    return { success: true, disputeId: disputeRef.id }

  } catch (error: any) {
    console.error('Error creating dispute:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get disputes for a user (buyer)
 */
export async function getUserDisputes(userId: string): Promise<Dispute[]> {
  try {
    const snapshot = await adminDb
      .collection('disputes')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get()

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date(doc.data().updatedAt),
      resolvedAt: doc.data().resolvedAt?.toDate?.() || undefined
    })) as Dispute[]

  } catch (error) {
    console.error('Error getting user disputes:', error)
    return []
  }
}

/**
 * Get disputes for a seller
 */
export async function getSellerDisputes(sellerId: string): Promise<Dispute[]> {
  try {
    const snapshot = await adminDb
      .collection('disputes')
      .where('sellerId', '==', sellerId)
      .orderBy('createdAt', 'desc')
      .get()

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date(doc.data().updatedAt),
      resolvedAt: doc.data().resolvedAt?.toDate?.() || undefined
    })) as Dispute[]

  } catch (error) {
    console.error('Error getting seller disputes:', error)
    return []
  }
}

/**
 * Resolve a dispute (Admin only)
 */
export async function resolveDispute(
  disputeId: string,
  adminId: string,
  resolution: 'refund' | 'resend_code' | 'dismiss',
  adminResponse: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const disputeDoc = await adminDb.collection('disputes').doc(disputeId).get()
    
    if (!disputeDoc.exists) {
      return { success: false, error: 'ไม่พบข้อมูลการรายงาน' }
    }

    const disputeData = disputeDoc.data()

    await disputeDoc.ref.update({
      status: 'resolved',
      resolution,
      adminResponse,
      resolvedBy: adminId,
      resolvedAt: new Date(),
      updatedAt: new Date()
    })

    // อัพเดท Order
    const orderDoc = await adminDb.collection('orders').doc(disputeData?.orderId).get()
    
    if (orderDoc.exists) {
      await orderDoc.ref.update({
        hasDispute: false,
        disputeResolved: true,
        disputeResolution: resolution,
        updatedAt: new Date()
      })
    }

    // ส่ง Notification
    if (disputeData?.userId) {
      await createNotification(
        disputeData.userId,
        'info',
        'ปัญหาของคุณได้รับการแก้ไข',
        `คำสั่งซื้อ ${disputeData.orderNumber}: ${adminResponse}`,
        `/profile?tab=orders`
      )
    }

    if (disputeData?.sellerId) {
      await createNotification(
        disputeData.sellerId,
        'info',
        'ปัญหาได้รับการแก้ไขแล้ว',
        `คำสั่งซื้อ ${disputeData.orderNumber}: ${adminResponse}`,
        `/seller/orders`
      )
    }

    return { success: true }

  } catch (error: any) {
    console.error('Error resolving dispute:', error)
    return { success: false, error: error.message }
  }
}
