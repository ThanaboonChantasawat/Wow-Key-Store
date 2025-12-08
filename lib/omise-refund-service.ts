/**
 * Omise Refund Service
 * Handle refunds for Omise charges (PromptPay, Credit Card, etc.)
 */

import Omise from 'omise'
import { getOmiseKeys } from './omise-keys'

// Lazy initializer to avoid build-time errors when env vars are absent
const getOmise = async () => {
  const keys = await getOmiseKeys()
  return Omise({
    publicKey: keys.publicKey,
    secretKey: keys.secretKey,
  })
}

export interface OmiseRefundRequest {
  chargeId: string                  // Charge ID to refund
  amount?: number                   // Optional: partial refund amount in baht (full refund if not specified)
  reason?: string                   // Optional: reason for refund
}

export interface OmiseRefundResponse {
  success: boolean
  refundId?: string                 // Refund ID from Omise
  amount?: number                   // Amount refunded (in baht)
  status?: string                   // Refund status
  message?: string
  error?: string
}

/**
 * Create a refund for an Omise charge
 */
export async function createOmiseRefund(
  request: OmiseRefundRequest
): Promise<OmiseRefundResponse> {
  try {
    const omise = await getOmise()
    const { chargeId, amount, reason } = request

    console.log('🔷 Creating Omise Refund:', {
      chargeId,
      amount,
      reason,
    })

    // Build refund parameters
    const refundParams: any = {}
    
    if (amount) {
      // Convert baht to satang for partial refund
      refundParams.amount = Math.round(amount * 100)
    }
    // If amount is not specified, Omise will do a full refund

    if (reason) {
      refundParams.metadata = { reason }
    }

    // Create refund
    const refund: any = await (omise.charges as any).refund(chargeId, refundParams)

    console.log('✅ Refund created:', {
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount,
    })

    return {
      success: true,
      refundId: refund.id,
      amount: refund.amount / 100, // Convert satang back to baht
      status: refund.status,
      message: 'Refund created successfully',
    }

  } catch (error: any) {
    console.error('❌ Error creating Omise refund:', error)
    
    // Handle specific Omise errors
    let errorMessage = 'Failed to create refund'
    
    if (error.code === 'not_found') {
      errorMessage = 'Charge not found'
    } else if (error.code === 'invalid_charge') {
      errorMessage = 'Cannot refund this charge (may already be refunded or expired)'
    } else if (error.code === 'used_charge') {
      errorMessage = 'This charge has already been fully refunded'
    } else if (error.message) {
      errorMessage = error.message
    }

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Get refund details by refund ID
 */
export async function getOmiseRefund(
  chargeId: string,
  refundId: string
): Promise<any> {
  try {
    const omise = await getOmise()
    const refund = await (omise.charges as any).retrieveRefund(chargeId, refundId)
    return refund
  } catch (error: any) {
    console.error('Error retrieving Omise refund:', error)
    throw error
  }
}

/**
 * List all refunds for a charge
 */
export async function listOmiseRefunds(chargeId: string): Promise<any[]> {
  try {
    const omise = await getOmise()
    const refunds = await (omise.charges as any).listRefunds(chargeId)
    return refunds.data || []
  } catch (error: any) {
    console.error('Error listing Omise refunds:', error)
    return []
  }
}
