import { NextRequest, NextResponse } from 'next/server'
import { createPaymentIntent, calculatePlatformFee } from '@/lib/payment-service'
import { getShopByOwnerId } from '@/lib/shop-service'

export async function POST(request: NextRequest) {
  try {
    const { amount, currency, sellerId, orderId, productName, buyerEmail } = await request.json()

    if (!amount || !currency || !sellerId || !orderId || !productName || !buyerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get seller's shop to get Stripe account ID
    const shop = await getShopByOwnerId(sellerId)

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    if (!shop.stripeAccountId) {
      return NextResponse.json(
        { error: 'Seller has not connected Stripe account' },
        { status: 400 }
      )
    }

    if (!shop.stripePayoutsEnabled) {
      return NextResponse.json(
        { error: 'Seller\'s Stripe account is not fully set up' },
        { status: 400 }
      )
    }

    // Calculate platform fee (10%)
    const platformFee = calculatePlatformFee(amount)

    // Create payment intent
    const result = await createPaymentIntent({
      amount,
      currency,
      sellerStripeAccountId: shop.stripeAccountId,
      applicationFeeAmount: platformFee,
      orderId,
      productName,
      buyerEmail,
    })

    return NextResponse.json({
      success: true,
      clientSecret: result.clientSecret,
      paymentIntentId: result.paymentIntentId,
      platformFee,
    })
  } catch (error: any) {
    console.error('Error creating payment intent:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create payment intent',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
