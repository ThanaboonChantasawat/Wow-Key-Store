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
 * Calculate platform fee (5% of transaction)
 */
export function calculatePlatformFee(amount: number): number {
  return Math.round(amount * 0.05) // 5% fee
}

/**
 * Calculate platform fee based on payment method
 * All payment methods: 5% platform fee (from seller's revenue)
 */
export function calculatePlatformFeeByMethod(
  amount: number,
  // paymentMethod: 'promptpay' | 'card' | 'bank' = 'card'
): number {
  // Platform always takes 5% from seller
  return Math.round(amount * 0.05)
}

/**
 * Calculate payment method surcharge (what buyer pays extra)
 * Currently NO surcharge for any payment method
 */
export function calculatePaymentSurcharge(
  amount: number,
  paymentMethod: 'promptpay' | 'card' | 'bank' = 'card'
): number {
  return 0 // No surcharge
}

/**
 * Calculate final payment amount (base + surcharge)
 */
export function calculateFinalPaymentAmount(
  baseAmount: number,
  paymentMethod: 'promptpay' | 'card' | 'bank' = 'card'
): { 
  baseAmount: number
  surcharge: number
  totalAmount: number
  platformFee: number
  sellerReceives: number
} {
  const surcharge = calculatePaymentSurcharge(baseAmount, paymentMethod)
  const totalAmount = baseAmount + surcharge
  const platformFee = calculatePlatformFeeByMethod(baseAmount, paymentMethod)
  const sellerReceives = baseAmount - platformFee
  
  return {
    baseAmount,
    surcharge,
    totalAmount,
    platformFee,
    sellerReceives,
  }
}
