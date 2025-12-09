/**
 * Omise PromptPay QR Payment Service
 * Generate QR codes for customer payments
 */

import Omise from 'omise'
import QRCode from 'qrcode'
import generatePayload from 'promptpay-qr'
import { getOmiseKeys } from './omise-keys'

// Lazy initializer to avoid build-time errors when env vars are absent
const getOmise = async () => {
  const keys = await getOmiseKeys()
  return Omise({
    publicKey: keys.publicKey,
    secretKey: keys.secretKey,
  })
}

export interface PromptPayQRRequest {
  amount: number                    // จำนวนเงิน (บาท)
  orderId: string                   // Primary Order ID
  orderIds?: string[]               // All Order IDs (for multi-shop checkout)
  description?: string              // คำอธิบาย
  customerEmail?: string            // อีเมลลูกค้า
  customerName?: string             // ชื่อลูกค้า
}

export interface PromptPayQRResponse {
  success: boolean
  chargeId?: string                 // Charge ID จาก Omise
  qrCodeUrl?: string                // URL ของ QR Code image
  qrCodeData?: string               // QR Code data (for custom render)
  amount?: number
  expiresAt?: Date                  // เวลาหมดอายุ
  message?: string
  error?: string
}

/**
 * Create PromptPay QR Code payment
 */
export async function createPromptPayQR(
  request: PromptPayQRRequest
): Promise<PromptPayQRResponse> {
  try {
    const omise = await getOmise()
    const { amount, orderId, orderIds, description, customerEmail, customerName } = request
    const allOrderIds = orderIds || [orderId]

    // Validate amount
    if (!amount || amount <= 0) {
      return {
        success: false,
        error: 'Invalid amount',
      }
    }

    // Convert to satang (smallest unit)
    const amountSatang = Math.round(amount * 100)

    console.log('🔷 Creating PromptPay Source:', {
      amount,
      amountSatang,
      orderId,
    })

    // Step 1: Create PromptPay Source (this generates the QR code)
    const source: any = await (omise.sources as any).create({
      type: 'promptpay',
      amount: amountSatang,
      currency: 'THB',
    })

    console.log('✅ Source created:', source.id)
    console.log('📱 Source type:', source.type)
    console.log('📱 Source flow:', source.flow)
    
    // Get QR code from source
    // Omise returns QR in scannable_code object
    const scannableCode = source.scannable_code
    let qrCodeUrl: string | null = null
    let qrCodeData: string | null = null

    if (scannableCode) {
      // Check for image URL
      if (scannableCode.image && scannableCode.image.download_uri) {
        qrCodeUrl = scannableCode.image.download_uri
      }
      
      // Check for QR data/value
      if (scannableCode.value) {
        qrCodeData = scannableCode.value
      }
      
      console.log('📱 Scannable code found:', {
        hasImage: !!qrCodeUrl,
        hasValue: !!qrCodeData,
      })
    } else {
      console.warn('⚠️ No scannable_code in source response')
    }

    // If we have QR data but no image URL, generate QR code image ourselves
    if (qrCodeData && !qrCodeUrl) {
      console.log('📱 Generating QR image from data...')
      try {
        qrCodeUrl = await QRCode.toDataURL(qrCodeData)
        console.log('✅ QR image generated from data')
      } catch (qrError) {
        console.error('Failed to generate QR image:', qrError)
      }
    }

    // Fallback: If still no QR code, use test PromptPay ID
    if (!qrCodeUrl && !qrCodeData) {
      console.warn('⚠️ No QR code from Omise, generating fallback')
      
      const promptPayId = process.env.PROMPTPAY_ID || '0123456789'
      
      try {
        const payload = generatePayload(promptPayId, { amount })
        qrCodeUrl = await QRCode.toDataURL(payload)
        qrCodeData = payload
        console.log('✅ Fallback QR code generated')
      } catch (qrError) {
        console.error('Failed to generate fallback QR:', qrError)
        return {
          success: false,
          error: 'Failed to generate QR code',
        }
      }
    }

    // Step 2: Create Charge using the Source
    // Note: For PromptPay, charge is created AFTER customer scans QR
    // We'll create it with pending status
    const charge: any = await (omise.charges as any).create({
      amount: amountSatang,
      currency: 'THB',
      source: source.id,
      description: description || `Order #${orderId}`,
      metadata: {
        orderId,
        orderIds: JSON.stringify(allOrderIds), // Store all order IDs
        customerEmail: customerEmail || '',
        customerName: customerName || '',
      },
      return_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/success?order_id=${orderId}`,
    })

    console.log('✅ Charge created:', charge.id)
    console.log('📱 Charge status:', charge.status)

    // Calculate expiry (PromptPay QR usually valid for 15 minutes)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    return {
      success: true,
      chargeId: charge.id,
      qrCodeUrl: qrCodeUrl || undefined,
      qrCodeData: qrCodeData || undefined,
      amount: amount,
      expiresAt,
      message: 'QR Code created successfully',
    }
  } catch (error: any) {
    console.error('❌ Failed to create PromptPay QR:', error)
    console.error('Error details:', error.message)
    console.error('Error stack:', error.stack)
    return {
      success: false,
      error: error.message || 'Failed to create QR code',
    }
  }
}

/**
 * Get charge status
 */
export async function getChargeStatus(chargeId: string) {
  try {
    const omise = await getOmise()
    const charge: any = await omise.charges.retrieve(chargeId)
    
    return {
      id: charge.id,
      status: charge.status, // pending, successful, failed, expired
      paid: charge.paid,
      amount: charge.amount / 100,
      currency: charge.currency,
      metadata: charge.metadata,
      failureCode: charge.failure_code,
      failureMessage: charge.failure_message,
    }
  } catch (error: any) {
    console.error('Failed to get charge status:', error)
    return null
  }
}

/**
 * Check if charge is paid
 */
export async function isChargePaid(chargeId: string): Promise<boolean> {
  const charge = await getChargeStatus(chargeId)
  return charge?.paid === true
}
