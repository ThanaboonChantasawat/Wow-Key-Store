/**
 * Omise Transfer Service
 * Handles bank transfers and payouts for seller using Omise API
 * Supports all Thai banks automatically
 */

import Omise from 'omise'
import { adminDb } from './firebase-admin-config'
import type { Shop } from './shop-types'

// Lazy initializer to avoid build-time errors when env vars are absent
const getOmise = () =>
  Omise({
    publicKey: process.env.OMISE_PUBLIC_KEY || '',
    secretKey: process.env.OMISE_SECRET_KEY || '',
  })

// Transfer status types
export type OmiseTransferStatus = 
  | 'pending'
  | 'sent'
  | 'paid'
  | 'failed'
  | 'reversed'

export interface OmiseTransferRequest {
  amount: number                      // จำนวนเงิน (บาท)
  recipientId?: string                // Omise Recipient ID (ถ้ามีแล้ว)
  recipientName: string               // ชื่อผู้รับ
  recipientEmail?: string             // อีเมลผู้รับ (optional)
  bankAccount: {
    brand: string                     // รหัสธนาคาร (scb, kbank, bbl, etc.)
    number: string                    // เลขบัญชี
    name: string                      // ชื่อบัญชี
  }
  description?: string                // คำอธิบาย
  metadata?: Record<string, any>      // ข้อมูลเพิ่มเติม
}

export interface OmiseTransferResponse {
  success: boolean
  transferId?: string                 // Transfer ID จาก Omise
  recipientId?: string                // Recipient ID
  status: OmiseTransferStatus
  amount?: number
  fee?: number                        // ค่าธรรมเนียม
  message?: string
  errorCode?: string
  timestamp: Date
}

// Omise Bank Codes (lowercase)
export const OMISE_BANK_CODES: Record<string, string> = {
  SCB: 'scb',
  KBANK: 'kbank',
  BBL: 'bbl',
  KTB: 'ktb',
  TMB: 'ttb',        // TTB (TMB+Thanachart merged)
  BAY: 'bay',
  GSB: 'gsb',
  BAAC: 'baac',
  CIMB: 'cimb',
  TISCO: 'tisco',
  UOBT: 'uob',
  SCBT: 'scbt',
  LH: 'lhbank',
}

/**
 * Create or get Omise Recipient
 */
async function getOrCreateRecipient(
  shopId: string,
  shop: Shop
): Promise<{ success: boolean; recipientId?: string; error?: string }> {
  try {
    const omise = getOmise()
    // Check if recipient already exists in shop data
    if ((shop as any).omiseRecipientId) {
      console.log('✅ Using existing recipient:', (shop as any).omiseRecipientId)
      return {
        success: true,
        recipientId: (shop as any).omiseRecipientId,
      }
    }

    // Check for PromptPay first (preferred method)
    if (shop.promptPayId && shop.promptPayType) {
      console.log('📝 Creating recipient with PromptPay...')
      
      // For PromptPay, we need to find the bank first
      // PromptPay works with phone number or citizen ID
      // Omise will route it through PromptPay network automatically
      
      const recipient: any = await (omise.recipients as any).create({
        name: shop.bankAccountName || shop.shopName,
        email: shop.contactEmail || `shop_${shopId}@example.com`,
        type: 'individual',
        bank_account: {
          brand: 'promptpay', // Special brand for PromptPay
          number: shop.promptPayId, // Phone or Citizen ID
          name: shop.bankAccountName || shop.shopName,
        },
        description: `Seller (PromptPay): ${shop.shopName}`,
        metadata: {
          shopId: shopId,
          shopName: shop.shopName,
          paymentMethod: 'promptpay',
        },
      })

      console.log('✅ PromptPay recipient created:', recipient.id)

      await adminDb.collection('shops').doc(shopId).update({
        omiseRecipientId: recipient.id,
        updatedAt: new Date(),
      })

      return {
        success: true,
        recipientId: recipient.id,
      }
    }

    // Fallback to regular bank account
    if (!shop.bankAccountNumber || !shop.bankName || !shop.bankAccountName) {
      return {
        success: false,
        error: 'Missing bank account information',
      }
    }

    const bankCode = OMISE_BANK_CODES[shop.bankName]
    if (!bankCode) {
      return {
        success: false,
        error: `Unsupported bank: ${shop.bankName}`,
      }
    }

    console.log('📝 Creating new Omise recipient...')

    // Create new recipient
    const recipient: any = await (omise.recipients as any).create({
      name: shop.bankAccountName,
      email: shop.contactEmail || `shop_${shopId}@example.com`,
      type: 'individual',
      bank_account: {
        brand: bankCode,
        number: shop.bankAccountNumber,
        name: shop.bankAccountName,
      },
      description: `Seller: ${shop.shopName}`,
      metadata: {
        shopId: shopId,
        shopName: shop.shopName,
      },
    })

    console.log('✅ Recipient created:', recipient.id)

    // Save recipient ID to shop
    await adminDb.collection('shops').doc(shopId).update({
      omiseRecipientId: recipient.id,
      updatedAt: new Date(),
    })

    return {
      success: true,
      recipientId: recipient.id,
    }
  } catch (error: any) {
    console.error('❌ Failed to create recipient:', error)
    return {
      success: false,
      error: error.message || 'Failed to create recipient',
    }
  }
}

/**
 * Create transfer to recipient
 */
async function createTransfer(
  recipientId: string,
  amount: number,
  description?: string,
  metadata?: Record<string, any>
): Promise<OmiseTransferResponse> {
  try {
    const omise = getOmise()
    console.log('💸 Creating transfer:', {
      recipientId,
      amount,
      description,
    })

    // Convert amount to satang (smallest unit)
    const amountSatang = Math.round(amount * 100)

    const transfer: any = await omise.transfers.create({
      amount: amountSatang,
      recipient: recipientId,
      metadata: metadata || {},
    })

    console.log('✅ Transfer created:', transfer.id)

    return {
      success: true,
      transferId: transfer.id,
      recipientId: recipientId,
      status: transfer.paid ? 'paid' : transfer.sent ? 'sent' : 'pending',
      amount: transfer.amount / 100,
      fee: transfer.fee ? transfer.fee / 100 : 0,
      message: 'Transfer created successfully',
      timestamp: new Date(),
    }
  } catch (error: any) {
    console.error('❌ Transfer failed:', error)
    return {
      success: false,
      status: 'failed',
      message: error.message || 'Transfer creation failed',
      errorCode: error.code,
      timestamp: new Date(),
    }
  }
}

/**
 * Process seller payout via Omise
 */
export async function processSellerPayoutViaOmise(
  shopId: string,
  amount: number,
  payoutId: string,
  note?: string
): Promise<OmiseTransferResponse> {
  try {
    console.log('🏦 Processing Omise payout:', { shopId, amount, payoutId })

    // Get shop information
    const shopDoc = await adminDb.collection('shops').doc(shopId).get()
    if (!shopDoc.exists) {
      return {
        success: false,
        status: 'failed',
        message: 'Shop not found',
        timestamp: new Date(),
      }
    }

    const shop = shopDoc.data() as Shop

    // Validate bank information
    if (!shop.bankAccountNumber || !shop.bankName || !shop.bankAccountName) {
      return {
        success: false,
        status: 'failed',
        message: 'No bank account configured for this shop',
        timestamp: new Date(),
      }
    }

    // Get or create recipient
    const recipientResult = await getOrCreateRecipient(shopId, shop)
    if (!recipientResult.success || !recipientResult.recipientId) {
      return {
        success: false,
        status: 'failed',
        message: recipientResult.error || 'Failed to get recipient',
        timestamp: new Date(),
      }
    }

    // Create transfer
    const transferResult = await createTransfer(
      recipientResult.recipientId,
      amount,
      note || `Payout for ${shop.shopName}`,
      {
        payoutId,
        shopId,
        shopName: shop.shopName,
      }
    )

    // Log transfer attempt
    await adminDb.collection('omise_transfers').add({
      shopId,
      payoutId,
      recipientId: recipientResult.recipientId,
      transferId: transferResult.transferId,
      amount,
      status: transferResult.status,
      success: transferResult.success,
      timestamp: new Date(),
      response: transferResult,
    })

    return transferResult
  } catch (error: any) {
    console.error('❌ Process payout error:', error)
    return {
      success: false,
      status: 'failed',
      message: error.message || 'Failed to process payout',
      timestamp: new Date(),
    }
  }
}

/**
 * Get transfer status
 */
export async function getOmiseTransferStatus(transferId: string): Promise<OmiseTransferStatus> {
  try {
    const omise = getOmise()
    const transfer: any = await omise.transfers.retrieve(transferId)
    
    if (transfer.paid) return 'paid'
    if (transfer.sent) return 'sent'
    if (transfer.reversed) return 'reversed'
    if (transfer.failure_code) return 'failed'
    
    return 'pending'
  } catch (error) {
    console.error('Failed to get transfer status:', error)
    return 'failed'
  }
}

/**
 * List all transfers for a recipient
 */
export async function listRecipientTransfers(recipientId: string) {
  try {
    const omise = getOmise()
    const transfers: any = await (omise.transfers as any).list({
      recipient: recipientId,
      limit: 100,
    })
    return transfers.data
  } catch (error) {
    console.error('Failed to list transfers:', error)
    return []
  }
}

/**
 * Validate bank account via Omise (optional)
 */
export async function validateBankAccountViaOmise(
  bankCode: string,
  accountNumber: string,
  accountName: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Omise doesn't have direct validation API
    // But we can check if bank code is supported
    const omiseBankCode = OMISE_BANK_CODES[bankCode]
    
    if (!omiseBankCode) {
      return {
        valid: false,
        error: `Unsupported bank: ${bankCode}`,
      }
    }

    // Basic validation
    if (!accountNumber || accountNumber.length < 10) {
      return {
        valid: false,
        error: 'Invalid account number',
      }
    }

    if (!accountName || accountName.length < 2) {
      return {
        valid: false,
        error: 'Invalid account name',
      }
    }

    return { valid: true }
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || 'Validation failed',
    }
  }
}
