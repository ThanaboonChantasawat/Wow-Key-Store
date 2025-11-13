import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { adminDb } from '@/lib/firebase-admin-config'

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
    const cartItemIds = metadata.cartItemIds ? JSON.parse(metadata.cartItemIds) : []
    console.log('📦 Cart item IDs to clear:', cartItemIds)
    const userId = metadata.userId

    // Process each shop order
    const orderIds: string[] = []
    const transferResults: any[] = []

    for (const shop of shops) {
      try {
        console.log(`📦 Creating order for shop: ${shop.shopName}`)
        
        // Fetch game names for each item
        const itemsWithGameNames = await Promise.all(
          shop.items.map(async (item: any) => {
            let gameName = null
            const gameId = item.productId // productId is actually gameId from checkout
            
            if (gameId) {
              try {
                const gameDoc = await adminDb.collection('games').doc(gameId).get()
                if (gameDoc.exists) {
                  gameName = gameDoc.data()?.name
                }
              } catch (err) {
                console.error(`Error fetching game for item ${item.name}:`, err)
              }
            }
            
            return {
              ...item,
              gameId, // Store gameId explicitly
              gameName // Add game name
            }
          })
        )
        
        // Create order in Firestore
        const orderData = {
          userId,
          shopId: shop.shopId,
          shopName: shop.shopName,
          items: itemsWithGameNames,
          totalAmount: shop.amount,
          platformFee: shop.platformFee,
          sellerAmount: shop.sellerAmount,
          paymentIntentId,
          paymentStatus: 'completed',
          status: 'pending', // Order status: pending, processing, completed, cancelled
          cartItemIds, // Store cartItemIds for potential clearing
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const orderRef = await adminDb.collection('orders').add(orderData)
        orderIds.push(orderRef.id)
        console.log(`✅ Order created: ${orderRef.id}`)

        // Record order for seller payout tracking
        // Money stays in platform account until seller requests payout
        console.log(`💰 Seller amount ฿${shop.sellerAmount} recorded for future payout`)
        
        transferResults.push({
          shopId: shop.shopId,
          shopName: shop.shopName,
          orderId: orderRef.id,
          transferId: null, // Will be created when seller requests payout
          amount: shop.amount,
          platformFee: shop.platformFee,
          sellerAmount: shop.sellerAmount,
          status: 'pending_payout', // Waiting for seller to request payout
        })

        // Update order with payout tracking info
        await adminDb.collection('orders').doc(orderRef.id).update({
          payoutStatus: 'waiting_confirmation', // Waiting for buyer to confirm receipt
          payoutAmount: shop.sellerAmount,
          stripeAccountId: shop.stripeAccountId,
          buyerConfirmed: false, // Buyer needs to confirm receipt first
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

    // Check if all transfers succeeded or are pending payout
    const allSuccess = transferResults.every(
      r => r.status === 'success' || r.status === 'pending_payout'
    )

    return NextResponse.json({
      success: allSuccess,
      orderIds,
      cartItemIds, // Return cartItemIds for clearing
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
