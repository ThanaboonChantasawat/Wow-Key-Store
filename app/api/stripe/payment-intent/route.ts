import { NextRequest, NextResponse } from 'next/server'
import { getPaymentIntent } from '@/lib/payment-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const paymentIntentId = searchParams.get('paymentIntentId')

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment Intent ID is required' },
        { status: 400 }
      )
    }

    const paymentIntent = await getPaymentIntent(paymentIntentId)

    return NextResponse.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        created: paymentIntent.created,
        metadata: paymentIntent.metadata,
      },
    })
  } catch (error: any) {
    console.error('Error retrieving payment intent:', error)
    return NextResponse.json(
      { 
        error: 'Failed to retrieve payment intent',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
