import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

// Lazily initialize Stripe inside the handler to avoid build-time errors

export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId } = await request.json()

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Unsupported payment provider or missing ID' },
        { status: 400 }
      )
    }

    console.log('🔍 process-payment route called but Stripe is disabled. ID:', paymentIntentId)

    // Check if already processed (ป้องกัน double processing)
    const existingOrdersQuery = adminDb.collection('orders').where('paymentIntentId', '==', paymentIntentId)
    const existingOrders = await existingOrdersQuery.get()
    
    if (!existingOrders.empty) {
      console.log('⚠️ Payment already processed, returning existing orders')
      const orderIds = existingOrders.docs.map(doc => doc.id)
      
      // Get cartItemIds from metadata if available
      const firstOrder = existingOrders.docs[0].data()
      const cartItemIds = firstOrder.cartItemIds || []
      
      return NextResponse.json({
        success: true,
        orderIds,
        cartItemIds,
        message: 'Payment already processed',
        alreadyProcessed: true,
      })
    }

    // Stripe flow disabled. Return informative response.
    return NextResponse.json(
      { error: 'Stripe flow is disabled. Use Omise endpoints instead.' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('Error processing cart payment:', error)
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }
}
