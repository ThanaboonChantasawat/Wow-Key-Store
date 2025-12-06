import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'
import admin from 'firebase-admin'
import { createNotification } from '@/lib/notification-service'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const orderId = id
    const body = await request.json()
    const { 
      status, 
      email, 
      username, 
      password, 
      additionalInfo,
      notes,
      deliveredItems // New field for multiple items
    } = body

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    console.log('Updating order:', orderId, 'status:', status)

    // Get current order
    const orderRef = adminDb.collection('orders').doc(orderId)
    const orderDoc = await orderRef.get()

    if (!orderDoc.exists) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    // Update status if provided
    if (status) {
      updateData.status = status
    }

    // Track if any game account info is provided
    let hasGameAccountInfo = false

    // Update email if provided
    if (email !== undefined) {
      updateData.email = email
      hasGameAccountInfo = true
    }

    // Update username if provided
    if (username !== undefined) {
      updateData.username = username
      hasGameAccountInfo = true
    }

    // Update password if provided
    if (password !== undefined) {
      updateData.password = password
      hasGameAccountInfo = true
    }

    // Update additional info if provided
    if (additionalInfo !== undefined) {
      updateData.additionalInfo = additionalInfo
      hasGameAccountInfo = true
    }

    // Update deliveredItems if provided
    if (deliveredItems !== undefined && Array.isArray(deliveredItems)) {
      updateData.deliveredItems = deliveredItems
      if (deliveredItems.length > 0) {
        hasGameAccountInfo = true
      }
    }

    // Set delivery timestamp if any game account info is provided
    if (hasGameAccountInfo) {
      updateData.gameCodeDeliveredAt = admin.firestore.FieldValue.serverTimestamp()
      updateData.payoutStatus = 'pending' // รอผู้ซื้อยืนยัน
    }

    // Update notes if provided
    if (notes !== undefined) {
      updateData.sellerNotes = notes
    }

    // Update the order
    await orderRef.update(updateData)

    console.log('Order updated successfully:', orderId)

    // 🔔 Send notification to buyer when game code is delivered
    if (hasGameAccountInfo) {
      try {
        const orderData = orderDoc.data()
        
        if (orderData && orderData.userId) {
          await createNotification(
            orderData.userId,
            'order_delivered',
            '📦 รหัสเกมของคุณถูกส่งแล้ว!',
            `รหัสเกมสำหรับคำสั่งซื้อ #${orderId.slice(-8)} ถูกส่งแล้ว กรุณาตรวจสอบและยืนยันการรับสินค้า`,
            `/receipt?orderId=${orderId}`
          )
        }
      } catch (notifError) {
        console.error("Error sending delivery notification:", notifError)
      }
    }

    // Get updated order
    const updatedOrderDoc = await orderRef.get()
    const updatedOrder = {
      id: updatedOrderDoc.id,
      ...updatedOrderDoc.data(),
      createdAt: updatedOrderDoc.data()?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: updatedOrderDoc.data()?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      gameCodeDeliveredAt: updatedOrderDoc.data()?.gameCodeDeliveredAt?.toDate?.()?.toISOString() || null,
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: 'Order updated successfully',
    })
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}
