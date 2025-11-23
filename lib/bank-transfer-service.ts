/**
 * Bank Transfer Service
 * Handles bank transfers and PromptPay payments for seller payouts
 * Supports: SCB Open API, PromptPay, and other Thai banks
 */

import { adminDb } from './firebase-admin-config';
import type { Shop } from './shop-types';

// Transfer status types
export type TransferStatus = 
  | 'pending'           // รอดำเนินการ
  | 'processing'        // กำลังโอน
  | 'completed'         // โอนสำเร็จ
  | 'failed'            // โอนไม่สำเร็จ
  | 'cancelled';        // ยกเลิก

export interface BankTransferRequest {
  amount: number;                    // จำนวนเงิน (บาท)
  recipientName: string;             // ชื่อผู้รับ
  recipientAccountNumber?: string;   // เลขบัญชี
  recipientBankCode?: string;        // รหัสธนาคาร (SCB, BBL, KBANK, etc.)
  recipientBranch?: string;          // สาขา
  promptPayId?: string;              // เบอร์ PromptPay / เลขบัตรประชาชน
  promptPayType?: 'mobile' | 'citizen_id' | 'ewallet';
  reference: string;                 // เลขอ้างอิง (payout ID)
  note?: string;                     // หมายเหตุ
}

export interface BankTransferResponse {
  success: boolean;
  transactionId?: string;            // Transaction ID จากธนาคาร
  status: TransferStatus;
  message?: string;
  errorCode?: string;
  timestamp: Date;
  fee?: number;                      // ค่าธรรมเนียม (ถ้ามี)
}

// Bank codes (รหัสธนาคารไทย)
export const THAI_BANK_CODES: Record<string, string> = {
  SCB: '014',      // ธนาคารไทยพาณิชย์
  KBANK: '004',    // ธนาคารกสิกรไทย
  BBL: '002',      // ธนาคารกรุงเทพ
  KTB: '006',      // ธนาคารกรุงไทย
  TMB: '011',      // ธนาคารทหารไทยธนชาต
  BAY: '025',      // ธนาคารกรุงศรีอยุธยา
  GSB: '030',      // ธนาคารออมสิน
  BAAC: '034',     // ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร
  CIMB: '022',     // ธนาคาร CIMB ไทย
  TISCO: '067',    // ธนาคารทิสโก้
  UOBT: '024',     // ธนาคาร ยูโอบี
  SCBT: '020',     // ธนาคารสแตนดาร์ดชาร์เตอร์ด (ไทย)
  LH: '073',       // ธนาคารแลนด์ แอนด์ เฮ้าส์
};

/**
 * SCB Open API Configuration
 * Get credentials from: https://developer.scb/
 */
const SCB_API_BASE = process.env.SCB_API_BASE_URL || 'https://api-sandbox.partners.scb/partners/sandbox';
const SCB_API_KEY = process.env.SCB_API_KEY || '';
const SCB_API_SECRET = process.env.SCB_API_SECRET || '';
const SCB_BILLER_ID = process.env.SCB_BILLER_ID || '';

/**
 * PromptPay Configuration (through SCB or other gateway)
 */
const PROMPTPAY_ENABLED = process.env.PROMPTPAY_ENABLED === 'true';

/**
 * Mock mode for development (set to false when ready for production)
 */
const MOCK_MODE = process.env.BANK_TRANSFER_MOCK_MODE !== 'false';

/**
 * Get OAuth token from SCB API
 */
async function getSCBAccessToken(): Promise<string> {
  if (MOCK_MODE) {
    return 'mock_access_token';
  }

  try {
    const response = await fetch(`${SCB_API_BASE}/v1/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'resourceOwnerId': SCB_API_KEY,
        'requestUId': `auth_${Date.now()}`,
      },
      body: JSON.stringify({
        applicationKey: SCB_API_KEY,
        applicationSecret: SCB_API_SECRET,
      }),
    });

    if (!response.ok) {
      throw new Error(`SCB OAuth failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.accessToken;
  } catch (error) {
    console.error('Failed to get SCB access token:', error);
    throw new Error('Authentication with bank failed');
  }
}

/**
 * Validate bank account (PromptPay or regular account)
 */
export async function validateBankAccount(
  // accountNumber: string,
  // bankCode?: string,
  // promptPayId?: string
): Promise<{ valid: boolean; accountName?: string; error?: string }> {
  if (MOCK_MODE) {
    // Mock validation - always return valid
    return {
      valid: true,
      accountName: 'Mock Account Holder',
    };
  }

  // TODO: Implement real bank account validation
  // For SCB: Use /v1/payment/account/verify
  // For PromptPay: Use lookup service
  
  return {
    valid: true,
    accountName: 'Account Holder Name',
  };
}

/**
 * Transfer via PromptPay
 */
async function transferViaPromptPay(
  request: BankTransferRequest
): Promise<BankTransferResponse> {
  if (MOCK_MODE) {
    console.log('[MOCK] PromptPay transfer:', {
      amount: request.amount,
      promptPayId: request.promptPayId,
      reference: request.reference,
    });

    // Simulate async processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      transactionId: `PP${Date.now()}`,
      status: 'completed',
      message: 'Mock PromptPay transfer completed',
      timestamp: new Date(),
      fee: 0,
    };
  }

  try {
    const token = await getSCBAccessToken();

    // SCB PromptPay API
    const response = await fetch(`${SCB_API_BASE}/v2/payment/promptpay/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'resourceOwnerId': SCB_API_KEY,
        'requestUId': `pp_${request.reference}_${Date.now()}`,
      },
      body: JSON.stringify({
        billerId: SCB_BILLER_ID,
        amount: request.amount.toFixed(2),
        ref1: request.reference.substring(0, 20),
        ref2: request.note?.substring(0, 20) || '',
        promptPayId: request.promptPayId,
        promptPayIdType: request.promptPayType === 'mobile' ? 'MSISDN' 
                       : request.promptPayType === 'citizen_id' ? 'NATID' 
                       : 'EWALLETID',
      }),
    });

    const data = await response.json();

    if (!response.ok || data.status?.code !== '1000') {
      return {
        success: false,
        status: 'failed',
        message: data.status?.description || 'PromptPay transfer failed',
        errorCode: data.status?.code,
        timestamp: new Date(),
      };
    }

    return {
      success: true,
      transactionId: data.data.transactionId,
      status: 'completed',
      message: 'PromptPay transfer completed',
      timestamp: new Date(),
      fee: 0,
    };
  } catch (error: any) {
    console.error('PromptPay transfer error:', error);
    return {
      success: false,
      status: 'failed',
      message: error.message || 'PromptPay transfer failed',
      timestamp: new Date(),
    };
  }
}

/**
 * Transfer to bank account (regular transfer)
 */
async function transferToBankAccount(
  request: BankTransferRequest
): Promise<BankTransferResponse> {
  if (MOCK_MODE) {
    console.log('[MOCK] Bank transfer:', {
      amount: request.amount,
      accountNumber: request.recipientAccountNumber,
      bankCode: request.recipientBankCode,
      reference: request.reference,
    });

    // Simulate async processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      success: true,
      transactionId: `BT${Date.now()}`,
      status: 'completed',
      message: 'Mock bank transfer completed',
      timestamp: new Date(),
      fee: 25, // ค่าธรรมเนียมโอนปกติ
    };
  }

  try {
    const token = await getSCBAccessToken();

    // SCB Fund Transfer API
    const response = await fetch(`${SCB_API_BASE}/v1/payment/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'resourceOwnerId': SCB_API_KEY,
        'requestUId': `bt_${request.reference}_${Date.now()}`,
      },
      body: JSON.stringify({
        amount: request.amount.toFixed(2),
        toBankCode: request.recipientBankCode,
        toAccountNumber: request.recipientAccountNumber,
        toBranch: request.recipientBranch || '',
        ref1: request.reference.substring(0, 20),
        ref2: request.note?.substring(0, 20) || '',
      }),
    });

    const data = await response.json();

    if (!response.ok || data.status?.code !== '1000') {
      return {
        success: false,
        status: 'failed',
        message: data.status?.description || 'Bank transfer failed',
        errorCode: data.status?.code,
        timestamp: new Date(),
      };
    }

    return {
      success: true,
      transactionId: data.data.transactionId,
      status: 'completed',
      message: 'Bank transfer completed',
      timestamp: new Date(),
      fee: 25,
    };
  } catch (error: any) {
    console.error('Bank transfer error:', error);
    return {
      success: false,
      status: 'failed',
      message: error.message || 'Bank transfer failed',
      timestamp: new Date(),
    };
  }
}

/**
 * Main transfer function - automatically chooses PromptPay or regular transfer
 */
export async function initiateTransfer(
  request: BankTransferRequest
): Promise<BankTransferResponse> {
  // Validate request
  if (!request.amount || request.amount <= 0) {
    return {
      success: false,
      status: 'failed',
      message: 'Invalid amount',
      timestamp: new Date(),
    };
  }

  if (!request.reference) {
    return {
      success: false,
      status: 'failed',
      message: 'Reference is required',
      timestamp: new Date(),
    };
  }

  // Choose transfer method
  if (request.promptPayId && PROMPTPAY_ENABLED) {
    return transferViaPromptPay(request);
  } else if (request.recipientAccountNumber && request.recipientBankCode) {
    return transferToBankAccount(request);
  } else {
    return {
      success: false,
      status: 'failed',
      message: 'Missing recipient information (PromptPay ID or bank account)',
      timestamp: new Date(),
    };
  }
}

/**
 * Process payout to seller
 */
export async function processSellerPayout(
  shopId: string,
  amount: number,
  payoutId: string,
  note?: string
): Promise<BankTransferResponse> {
  try {
    // Get shop information
    const shopDoc = await adminDb.collection('shops').doc(shopId).get();
    if (!shopDoc.exists) {
      return {
        success: false,
        status: 'failed',
        message: 'Shop not found',
        timestamp: new Date(),
      };
    }

    const shop = shopDoc.data() as Shop;

    // Validate bank information
    if (!shop.bankAccountNumber && !shop.promptPayId) {
      return {
        success: false,
        status: 'failed',
        message: 'No bank account or PromptPay configured for this shop',
        timestamp: new Date(),
      };
    }

    // Build transfer request
    const transferRequest: BankTransferRequest = {
      amount,
      recipientName: shop.bankAccountName || shop.shopName,
      recipientAccountNumber: shop.bankAccountNumber,
      recipientBankCode: shop.bankName ? THAI_BANK_CODES[shop.bankName] : undefined,
      recipientBranch: shop.bankBranch,
      promptPayId: shop.promptPayId,
      promptPayType: shop.promptPayType,
      reference: payoutId,
      note: note || `Payout for ${shop.shopName}`,
    };

    // Initiate transfer
    const result = await initiateTransfer(transferRequest);

    // Log transfer attempt
    await adminDb.collection('transfer_logs').add({
      shopId,
      payoutId,
      amount,
      method: shop.promptPayId ? 'promptpay' : 'bank_transfer',
      request: transferRequest,
      response: result,
      timestamp: new Date(),
    });

    return result;
  } catch (error: any) {
    console.error('Process seller payout error:', error);
    return {
      success: false,
      status: 'failed',
      message: error.message || 'Failed to process payout',
      timestamp: new Date(),
    };
  }
}

/**
 * Get transfer status (for async transfers)
 */
export async function getTransferStatus(transactionId: string): Promise<TransferStatus> {
  if (MOCK_MODE) {
    return 'completed';
  }

  try {
    const token = await getSCBAccessToken();
    
    const response = await fetch(
      `${SCB_API_BASE}/v1/payment/transaction/${transactionId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'resourceOwnerId': SCB_API_KEY,
        },
      }
    );

    const data = await response.json();

    if (data.data?.status === 'SUCCESS') {
      return 'completed';
    } else if (data.data?.status === 'PENDING') {
      return 'processing';
    } else {
      return 'failed';
    }
  } catch (error) {
    console.error('Get transfer status error:', error);
    return 'failed';
  }
}
