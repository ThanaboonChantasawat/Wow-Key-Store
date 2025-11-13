import Stripe from 'stripe'

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('Stripe is not configured')
  }
  return new Stripe(key, { apiVersion: '2024-06-20' })
}

export interface CreatePaymentIntentParams {
  amount: number // in smallest currency unit (e.g., satang for THB)
  currency: string
  sellerStripeAccountId: string
  applicationFeeAmount: number // platform fee
  orderId: string
  productName: string
  buyerEmail: string
}

/**
 * Create a Payment Intent for Direct Charges
 * Platform charges on behalf of connected account
 */
export async function createPaymentIntent(params: CreatePaymentIntentParams) {
  try {
    const stripe = getStripe()
    const paymentIntent = await stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency,
      application_fee_amount: params.applicationFeeAmount,
      transfer_data: {
        destination: params.sellerStripeAccountId,
      },
      metadata: {
        orderId: params.orderId,
        productName: params.productName,
        buyerEmail: params.buyerEmail,
      },
    })

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    }
  } catch (error: any) {
    console.error('Error creating payment intent:', error)
    throw new Error(`Failed to create payment intent: ${error.message}`)
  }
}

/**
 * Retrieve Payment Intent status
 */
export async function getPaymentIntent(paymentIntentId: string) {
  try {
    const stripe = getStripe()
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    return paymentIntent
  } catch (error: any) {
    console.error('Error retrieving payment intent:', error)
    throw new Error(`Failed to retrieve payment intent: ${error.message}`)
  }
}

/**
 * Cancel Payment Intent
 */
export async function cancelPaymentIntent(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId)
    return {
      success: true,
      status: paymentIntent.status,
    }
  } catch (error: any) {
    console.error('Error canceling payment intent:', error)
    throw new Error(`Failed to cancel payment intent: ${error.message}`)
  }
}

/**
 * Create Refund
 */
export async function createRefund(
  paymentIntentId: string,
  amount?: number, // optional, full refund if not specified
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
) {
  try {
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    }

    if (amount) {
      refundParams.amount = amount
    }

    if (reason) {
      refundParams.reason = reason
    }

    const refund = await stripe.refunds.create(refundParams)

    return {
      success: true,
      refundId: refund.id,
      amount: refund.amount,
      status: refund.status,
    }
  } catch (error: any) {
    console.error('Error creating refund:', error)
    throw new Error(`Failed to create refund: ${error.message}`)
  }
}

/**
 * Calculate platform fee (10% of transaction)
 */
export function calculatePlatformFee(amount: number): number {
  return Math.round(amount * 0.1) // 10% fee
}
