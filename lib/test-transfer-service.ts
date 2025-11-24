/**
 * Test Transfer Service for Bank Account Verification
 * Sends 1 baht to verify account before allowing withdrawals
 */

import { adminDb } from './firebase-admin-config'
import { getOmiseKeys } from './omise-keys'
import Omise from 'omise'
import admin from 'firebase-admin'

const getOmise = async () => {
  const keys = await getOmiseKeys()
  return Omise({
    publicKey: keys.publicKey,
    secretKey: keys.secretKey,
  })
}

const OMISE_BANK_CODES: Record<string, string> = {
  'ธนาคารกรุงเทพ': 'bbl',
  'ธนาคารกสิกรไทย': 'kbank',
  'ธนาคารกรุงไทย': 'ktb',
  'ธนาคารทหารไทยธนชาต': 'ttb',
  'ธนาคารไทยพาณิชย์': 'scb',
  'ธนาคารกรุงศรีอยุธยา': 'bay',
  'ธนาคารเกียรตินาคินภัทร': 'kk',
  'ธนาคารซีไอเอ็มบีไทย': 'cimb',
  'ธนาคารทิสโก้': 'tisco',
  'ธนาคารยูโอบี': 'uob',
  'ธนาคารไทยเครดิตเพื่อรายย่อย': 'tcrb',
  'ธนาคารแลนด์ แอนด์ เฮ้าส์': 'lhb',
  'ธนาคารไอซีบีซี (ไทย)': 'icbc',
  'ธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อมแห่งประเทศไทย': 'sme',
  'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร': 'baac',
  'ธนาคารเพื่อการส่งออกและนำเข้าแห่งประเทศไทย': 'exim',
  'ธนาคารออมสิน': 'gsb',
  'ธนาคารอาคารสงเคราะห์': 'ghb',
}

export interface TestTransferResult {
  success: boolean
  verified: boolean
  recipientId?: string
  transferId?: string
  error?: string
  message?: string
}

/**
 * Verify bank account by sending test transfer (1 baht)
 */
export async function verifyBankAccountWithTestTransfer(
  shopId: string,
  accountId: string,
  accountData: {
    accountType: 'bank' | 'promptpay'
    bankName?: string
    bankAccountNumber?: string
    bankAccountName?: string
    promptPayId?: string
    promptPayType?: 'mobile' | 'citizen_id' | 'ewallet'
  }
): Promise<TestTransferResult> {
  try {
    const omise = await getOmise()
    const keys = await getOmiseKeys()
    
    // Only verify in Live mode (Test mode will always succeed)
    if (keys.mode === 'test') {
      console.log('⚠️ Skipping verification in Test mode')
      
      // Update account status to verified immediately in Test mode
      const shopRef = adminDb.collection('shops').doc(shopId)
      const shopDoc = await shopRef.get()
      const bankAccounts = shopDoc.data()?.bankAccounts || []
      
      const updatedAccounts = bankAccounts.map((acc: any) =>
        acc.id === accountId
          ? {
              ...acc,
              isVerified: true,
              verificationStatus: 'verified',
              verifiedAt: new Date(),
            }
          : acc
      )

      await shopRef.update({
        bankAccounts: updatedAccounts,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      return {
        success: true,
        verified: true,
        message: 'Auto-verified in Test mode',
      }
    }

    console.log('🔍 Verifying bank account with test transfer:', {
      shopId,
      accountId,
      accountType: accountData.accountType,
    })

    // Step 1: Create or get recipient
    let recipientId: string | undefined

    // Check if already has recipient
    const shopRef = adminDb.collection('shops').doc(shopId)
    const shopDoc = await shopRef.get()
    const shopData = shopDoc.data()
    const bankAccounts = shopData?.bankAccounts || []
    const existingAccount = bankAccounts.find((acc: any) => acc.id === accountId)
    
    if (existingAccount?.omiseRecipientId) {
      recipientId = existingAccount.omiseRecipientId
      console.log('✅ Using existing recipient:', recipientId)
    } else {
      // Create new recipient
      let recipientData: any = {
        name: accountData.bankAccountName || shopData?.shopName || 'Seller',
        email: shopData?.contactEmail || `shop_${shopId}@example.com`,
        type: 'individual',
        description: `Test verification for ${shopData?.shopName}`,
        metadata: {
          shopId,
          accountId,
          verificationType: 'test_transfer',
        },
      }

      if (accountData.accountType === 'bank') {
        const bankCode = OMISE_BANK_CODES[accountData.bankName || '']
        if (!bankCode) {
          return {
            success: false,
            verified: false,
            error: `ไม่รองรับธนาคาร: ${accountData.bankName}`,
          }
        }

        recipientData.bank_account = {
          brand: bankCode,
          number: accountData.bankAccountNumber,
          name: accountData.bankAccountName,
        }
      } else {
        // PromptPay
        recipientData.bank_account = {
          brand: 'scb', // Use SCB for PromptPay
          number: accountData.promptPayId,
          name: accountData.bankAccountName || shopData?.shopName,
        }
      }

      const recipient: any = await (omise.recipients as any).create(recipientData)
      recipientId = recipient.id
      console.log('✅ Created recipient:', recipientId)

      // Update account with recipient ID
      const updatedAccounts = bankAccounts.map((acc: any) =>
        acc.id === accountId ? { ...acc, omiseRecipientId: recipientId } : acc
      )
      await shopRef.update({ bankAccounts: updatedAccounts })
    }

    // Step 2: Send test transfer (1 baht)
    console.log('💸 Sending test transfer of 1 baht...')
    
    const transfer: any = await (omise.transfers as any).create({
      amount: 100, // 1 baht in satangs
      recipient: recipientId,
      metadata: {
        shopId,
        accountId,
        purpose: 'account_verification',
        verificationType: 'test_transfer',
      },
    })

    console.log('✅ Test transfer created:', transfer.id)

    // Step 3: Check transfer status
    let verified = false
    let message = 'กำลังตรวจสอบบัญชี...'

    if (transfer.sent || transfer.paid) {
      verified = true
      message = '✅ ยืนยันบัญชีสำเร็จ! บัญชีนี้สามารถใช้ถอนเงินได้'
    } else if (transfer.failed || transfer.reversed) {
      verified = false
      message = '❌ บัญชีไม่ถูกต้อง กรุณาตรวจสอบข้อมูลอีกครั้ง'
    } else {
      verified = false
      message = '⏳ กำลังตรวจสอบ... อาจใช้เวลา 1-2 นาที'
    }

    // Step 4: Update account status
    const updatedAccounts = bankAccounts.map((acc: any) =>
      acc.id === accountId
        ? {
            ...acc,
            omiseRecipientId: recipientId,
            testTransferId: transfer.id,
            isVerified: verified,
            verificationStatus: verified ? 'verified' : 'pending',
            verifiedAt: verified ? new Date() : null,
          }
        : acc
    )

    await shopRef.update({
      bankAccounts: updatedAccounts,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return {
      success: true,
      verified,
      recipientId,
      transferId: transfer.id,
      message,
    }
  } catch (error: any) {
    console.error('❌ Test transfer failed:', error)
    
    let errorMessage = 'ไม่สามารถยืนยันบัญชีได้'
    
    if (error.code === 'invalid_account') {
      errorMessage = 'บัญชีไม่ถูกต้อง กรุณาตรวจสอบเลขบัญชีและชื่อบัญชี'
    } else if (error.code === 'invalid_bank') {
      errorMessage = 'ธนาคารไม่ถูกต้อง'
    } else if (error.message) {
      errorMessage = error.message
    }

    return {
      success: false,
      verified: false,
      error: errorMessage,
    }
  }
}

/**
 * Check test transfer status and update verification
 */
export async function checkTestTransferStatus(
  shopId: string,
  accountId: string,
  transferId: string
): Promise<TestTransferResult> {
  try {
    const omise = await getOmise()
    const transfer: any = await (omise.transfers as any).retrieve(transferId)

    let verified = false
    let message = ''

    if (transfer.sent || transfer.paid) {
      verified = true
      message = '✅ ยืนยันบัญชีสำเร็จ!'
    } else if (transfer.failed || transfer.reversed) {
      verified = false
      message = '❌ บัญชีไม่ถูกต้อง'
    } else {
      verified = false
      message = '⏳ กำลังตรวจสอบ...'
    }

    // Update account
    const shopRef = adminDb.collection('shops').doc(shopId)
    const shopDoc = await shopRef.get()
    const bankAccounts = shopDoc.data()?.bankAccounts || []
    
    const updatedAccounts = bankAccounts.map((acc: any) =>
      acc.id === accountId
        ? {
            ...acc,
            isVerified: verified,
            verificationStatus: verified ? 'verified' : transfer.failed ? 'failed' : 'pending',
            verifiedAt: verified ? new Date() : null,
          }
        : acc
    )

    await shopRef.update({
      bankAccounts: updatedAccounts,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return {
      success: true,
      verified,
      transferId,
      message,
    }
  } catch (error: any) {
    return {
      success: false,
      verified: false,
      error: error.message,
    }
  }
}
