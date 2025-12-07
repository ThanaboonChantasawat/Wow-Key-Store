// Dispute Service
// Handles buyer complaints and dispute resolution

import { adminDb } from './firebase-admin-config'
import { Dispute, CreateDisputeRequest, DisputeStatus, DisputeType } from './dispute-types'
import { createNotification } from './notification-service'
import { createRefund } from './payment-service'
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

    // Determine sellerId
    let sellerId = orderData.sellerId
    
    // Fallback 1: Check root shopId
    if (!sellerId && orderData.shopId) {
      const shopDoc = await adminDb.collection('shops').doc(orderData.shopId).get()
      if (shopDoc.exists) {
        sellerId = shopDoc.data()?.ownerId
      }
    }

    // Fallback 2: Check shops array (for multi-shop orders or new structure)
    if (!sellerId && orderData.shops && Array.isArray(orderData.shops) && orderData.shops.length > 0) {
      // Try to find sellerId in the first shop group
      const firstShop = orderData.shops[0]
      if (firstShop.sellerId) {
        sellerId = firstShop.sellerId
      } else if (firstShop.shopId) {
         const shopDoc = await adminDb.collection('shops').doc(firstShop.shopId).get()
         if (shopDoc.exists) {
           sellerId = shopDoc.data()?.ownerId
         }
      }
    }

    // สร้าง Dispute
    const dispute: Omit<Dispute, 'id'> = {
      orderId: data.orderId,
      orderNumber: `#${orderData.id?.slice(-8) || 'N/A'}`,
      userId,
      shopId: orderData.shopId || (orderData.shops?.[0]?.shopId) || '',
      sellerId: sellerId || '',
      type: data.type,
      subject: data.subject,
      description: data.description,
      evidence: data.evidence || [],
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const disputeRef = await adminDb.collection('disputes').add(dispute)

    // พักการโอนเงิน (update order)
    await orderDoc.ref.update({
      hasDispute: true,
      disputeStatus: 'pending',
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
    console.log(`[getSellerDisputes] Querying disputes for sellerId: ${sellerId}`)
    
    const snapshot = await adminDb
      .collection('disputes')
      .where('sellerId', '==', sellerId)
      .orderBy('createdAt', 'desc')
      .get()

    console.log(`[getSellerDisputes] Found ${snapshot.size} disputes for seller ${sellerId}`)

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

/**
 * Resolve a dispute by Seller
 */
export async function sellerResolveDispute(
  disputeId: string,
  sellerId: string,
  action: 'refund' | 'reject' | 'new_code',
  response: string,
  newCode?: string,
  deliveredItems?: Array<{
    itemName: string
    type: 'email' | 'username'
    value: string
    password: string
    emailPassword?: string
  }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const disputeDoc = await adminDb.collection('disputes').doc(disputeId).get()
    
    if (!disputeDoc.exists) {
      return { success: false, error: 'ไม่พบข้อมูลการรายงาน' }
    }

    const disputeData = disputeDoc.data()

    // Verify seller ownership
    if (disputeData?.sellerId !== sellerId) {
      return { success: false, error: 'คุณไม่มีสิทธิ์จัดการปัญหานี้' }
    }

    if (disputeData?.status === 'resolved') {
      return { success: false, error: 'ปัญหานี้ถูกแก้ไขไปแล้ว' }
    }

    const updateData: any = {
      status: 'resolved',
      resolution: action === 'reject' ? 'dismiss' : action,
      sellerResponse: response,
      resolvedBy: sellerId,
      resolvedAt: new Date(),
      updatedAt: new Date()
    }

    // Handle specific actions
    if (action === 'refund') {
      // Try to refund via Stripe
      const orderDoc = await adminDb.collection('orders').doc(disputeData?.orderId).get()
      const orderData = orderDoc.data()
      
      if (orderData?.paymentIntentId) {
        try {
          await createRefund(orderData.paymentIntentId)
          updateData.sellerResponse = `${response} (ระบบได้ทำการคืนเงินเข้าบัตรเครดิต/ช่องทางชำระเงินเดิมแล้ว)`
        } catch (err: any) {
          console.error('Refund failed:', err)
          updateData.sellerResponse = `${response} (หมายเหตุ: การคืนเงินอัตโนมัติล้มเหลว กรุณาติดต่อผู้ดูแลระบบ)`
        }
      }
    } else if (action === 'new_code') {
      // Handle multi-item code delivery
      if (deliveredItems && deliveredItems.length > 0) {
        // Update order with new deliveredItems
        const orderDoc = await adminDb.collection('orders').doc(disputeData?.orderId).get()
        
        if (orderDoc.exists) {
          const currentOrder = orderDoc.data()
          let updatedDeliveredItems = [...(currentOrder?.deliveredItems || [])]
          
          // Update or add new items
          deliveredItems.forEach(newItem => {
            const existingIndex = updatedDeliveredItems.findIndex(
              (item: any) => item.itemName === newItem.itemName
            )
            
            if (existingIndex !== -1) {
              // Update existing item
              updatedDeliveredItems[existingIndex] = {
                ...updatedDeliveredItems[existingIndex],
                ...newItem,
                updatedAt: new Date()
              }
            } else {
              // Add new item
              updatedDeliveredItems.push({
                ...newItem,
                deliveredAt: new Date()
              })
            }
          })
          
          await orderDoc.ref.update({
            deliveredItems: updatedDeliveredItems,
            updatedAt: new Date()
          })
        }
        
        // Build response message with new codes
        let codesText = '\n\nรหัสใหม่:\n'
        deliveredItems.forEach((item, idx) => {
          codesText += `\n${idx + 1}. ${item.itemName}:\n`
          if (item.type === 'email') {
            codesText += `   Email: ${item.value}\n`
          } else {
            codesText += `   Username: ${item.value}\n`
          }
          codesText += `   Password: ${item.password}\n`
          if (item.emailPassword) {
            codesText += `   Email Password: ${item.emailPassword}\n`
          }
        })
        updateData.sellerResponse = `${response}${codesText}`
      } else if (newCode) {
        // Legacy single code format
        updateData.sellerResponse = `${response}\n\nรหัสใหม่: ${newCode}`
      }
    }

    await disputeDoc.ref.update(updateData)

    // Update Order - Keep hasDispute true but mark as resolved so user can report again if needed
    const orderDoc = await adminDb.collection('orders').doc(disputeData?.orderId).get()
    
    if (orderDoc.exists) {
      await orderDoc.ref.update({
        disputeStatus: 'resolved',
        disputeResolved: true,
        disputeResolution: action === 'reject' ? 'dismiss' : action,
        updatedAt: new Date()
      })
    }

    // Send Notification to Buyer
    if (disputeData?.userId) {
      let title = 'มีการตอบกลับการแจ้งปัญหา'
      let message = `คำสั่งซื้อ ${disputeData.orderNumber}: ${response}`
      
      if (action === 'refund') {
        title = 'ร้านค้าอนุมัติการคืนเงิน'
        message = `ร้านค้าได้ทำการคืนเงินสำหรับคำสั่งซื้อ ${disputeData.orderNumber} แล้ว`
      } else if (action === 'reject') {
        title = 'ร้านค้าปฏิเสธการแจ้งปัญหา'
      } else if (action === 'new_code') {
        title = 'ร้านค้าส่งรหัสใหม่ให้คุณ'
      }

      await createNotification(
        disputeData.userId,
        'info',
        title,
        message,
        `/profile?tab=orders`
      )
    }

    return { success: true }

  } catch (error: any) {
    console.error('Error resolving dispute by seller:', error)
    return { success: false, error: error.message }
  }
}
