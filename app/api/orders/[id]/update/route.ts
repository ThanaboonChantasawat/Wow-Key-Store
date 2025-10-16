import { NextRequest, NextResponse } from 'next/server'
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/components/firebase-config'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id
    const body = await request.json()
    const { 
      status, 
      email, 
      username, 
      password, 
      additionalInfo,
      notes 
    } = body

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    console.log('Updating order:', orderId, 'status:', status)

    // Get current order
    const orderRef = doc(db, 'orders', orderId)
    const orderDoc = await getDoc(orderRef)

    if (!orderDoc.exists()) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: serverTimestamp(),
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

    // Set delivery timestamp if any game account info is provided
    if (hasGameAccountInfo) {
      updateData.gameCodeDeliveredAt = serverTimestamp()
    }

    // Update notes if provided
    if (notes !== undefined) {
      updateData.sellerNotes = notes
    }

    // Update the order
    await updateDoc(orderRef, updateData)


    console.log('Order updated successfully:', orderId)

    // Get updated order
    const updatedOrderDoc = await getDoc(orderRef)
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
