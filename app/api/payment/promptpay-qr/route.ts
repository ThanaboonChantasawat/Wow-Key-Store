import { NextRequest, NextResponse } from 'next/server'
import { createPromptPayQR } from '@/lib/omise-promptpay-service'
import { adminDb } from '@/lib/firebase-admin-config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, amount, customerEmail, customerName } = body

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      )
    }

    console.log('🔷 Creating PromptPay QR for order:', orderId)

    // Get order details
    const orderDoc = await adminDb.collection('orders').doc(orderId).get()
    
    if (!orderDoc.exists) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const orderData = orderDoc.data()

    // Check if order already has payment
    if (orderData?.paymentStatus === 'completed') {
      return NextResponse.json(
        { error: 'Order already paid' },
        { status: 400 }
      )
    }

    // Create PromptPay QR
    const qrResult = await createPromptPayQR({
      amount,
      orderId,
      description: `Payment for Order #${orderId}`,
      customerEmail,
      customerName,
    })

    console.log('📱 QR Result from service:', JSON.stringify(qrResult, null, 2))

    if (!qrResult.success) {
      console.error('❌ QR creation failed:', qrResult.error)
      return NextResponse.json(
        { error: qrResult.error || 'Failed to create QR code' },
        { status: 500 }
      )
    }

    // Update order with charge ID
    await adminDb.collection('orders').doc(orderId).update({
      promptPayChargeId: qrResult.chargeId,
      promptPayQRCreatedAt: new Date(),
      promptPayQRExpiresAt: qrResult.expiresAt,
      paymentMethod: 'promptpay',
      updatedAt: new Date(),
    })

    console.log('✅ QR Code created for order:', orderId)

    const responseData = {
      success: true,
      chargeId: qrResult.chargeId,
      qrCodeUrl: qrResult.qrCodeUrl,
      qrCodeData: qrResult.qrCodeData,
      amount: qrResult.amount,
      expiresAt: qrResult.expiresAt,
    }
    
    console.log('📱 Sending response:', JSON.stringify(responseData, null, 2))

    return NextResponse.json(responseData)
  } catch (error: any) {
    console.error('❌ Error creating PromptPay QR:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// Get QR code status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    const orderDoc = await adminDb.collection('orders').doc(orderId).get()
    
    if (!orderDoc.exists) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const orderData = orderDoc.data()

    return NextResponse.json({
      orderId,
      paymentStatus: orderData?.paymentStatus,
      paymentMethod: orderData?.paymentMethod,
      chargeId: orderData?.promptPayChargeId,
      qrCreatedAt: orderData?.promptPayQRCreatedAt,
      qrExpiresAt: orderData?.promptPayQRExpiresAt,
    })
  } catch (error: any) {
    console.error('❌ Error getting QR status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
