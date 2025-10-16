import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { doc, getDoc, collection, addDoc, updateDoc, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/components/firebase-config'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
})

export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId } = await request.json()

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment Intent ID is required' },
        { status: 400 }
      )
    }

    console.log('🔍 Processing payment for:', paymentIntentId)

    // Check if already processed (ป้องกัน double processing)
    const existingOrdersQuery = query(
      collection(db, 'orders'),
      where('paymentIntentId', '==', paymentIntentId)
    )
    const existingOrders = await getDocs(existingOrdersQuery)
    
    if (!existingOrders.empty) {
      console.log('⚠️ Payment already processed, returning existing orders')
      const orderIds = existingOrders.docs.map(doc => doc.id)
      return NextResponse.json({
        success: true,
        orderIds,
        message: 'Payment already processed',
        alreadyProcessed: true,
      })
    }

    // Get payment intent details
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment has not succeeded yet' },
        { status: 400 }
      )
    }

    const metadata = paymentIntent.metadata
    if (metadata.type !== 'cart_checkout') {
      return NextResponse.json(
        { error: 'Invalid payment type' },
        { status: 400 }
      )
    }

    // Parse shops data from metadata
    const shops = JSON.parse(metadata.shops)
    const userId = metadata.userId

    // Process each shop order
    const orderIds: string[] = []
    const transferResults: any[] = []

    for (const shop of shops) {
      try {
        console.log(`📦 Creating order for shop: ${shop.shopName}`)
        
        // Create order in Firestore
        const orderData = {
          userId,
          shopId: shop.shopId,
          shopName: shop.shopName,
          items: shop.items,
          totalAmount: shop.amount,
          platformFee: shop.platformFee,
          sellerAmount: shop.sellerAmount,
          paymentIntentId,
          paymentStatus: 'completed',
          status: 'pending', // Order status: pending, processing, completed, cancelled
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const orderRef = await addDoc(collection(db, 'orders'), orderData)
        orderIds.push(orderRef.id)
        console.log(`✅ Order created: ${orderRef.id}`)

        // Create transfer to seller's Stripe account
        const transfer = await stripe.transfers.create({
          amount: shop.sellerAmount, // Amount seller receives after platform fee
          currency: 'thb',
          destination: shop.stripeAccountId,
          transfer_group: paymentIntentId, // Group all transfers from this payment
          metadata: {
            orderId: orderRef.id,
            shopId: shop.shopId,
            shopName: shop.shopName,
            platformFee: shop.platformFee.toString(),
            originalAmount: shop.amount.toString(),
          },
        })

        transferResults.push({
          shopId: shop.shopId,
          shopName: shop.shopName,
          orderId: orderRef.id,
          transferId: transfer.id,
          amount: shop.amount,
          platformFee: shop.platformFee,
          sellerAmount: shop.sellerAmount,
          status: 'success',
        })

        // Update order with transfer info
        await updateDoc(doc(db, 'orders', orderRef.id), {
          transferId: transfer.id,
          transferStatus: 'completed',
        })

      } catch (error: any) {
        console.error(`Error processing order for shop ${shop.shopId}:`, error)
        
        transferResults.push({
          shopId: shop.shopId,
          shopName: shop.shopName,
          amount: shop.amount,
          status: 'failed',
          error: error.message,
        })
      }
    }

    // Check if all transfers succeeded
    const allSuccess = transferResults.every(r => r.status === 'success')

    return NextResponse.json({
      success: allSuccess,
      orderIds,
      transfers: transferResults,
      message: allSuccess
        ? 'All orders processed successfully'
        : 'Some orders failed to process',
    })
  } catch (error) {
    console.error('Error processing cart payment:', error)
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }
}
