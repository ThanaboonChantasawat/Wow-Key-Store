import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'
import { BankAccount, BankAccountInput } from '@/lib/bank-account-types'
import { verifyBankAccountWithTestTransfer } from '@/lib/test-transfer-service'
import admin from 'firebase-admin'

// GET - Get all bank accounts for a shop
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')

    if (!shopId) {
      return NextResponse.json(
        { error: 'Shop ID is required' },
        { status: 400 }
      )
    }

    const shopRef = adminDb.collection('shops').doc(shopId)
    const shopDoc = await shopRef.get()

    if (!shopDoc.exists) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    const shopData = shopDoc.data()
    const accounts = shopData?.bankAccounts || []

    return NextResponse.json({ accounts })
  } catch (error: any) {
    console.error('Error fetching bank accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bank accounts' },
      { status: 500 }
    )
  }
}

// POST - Add new bank account
export async function POST(request: NextRequest) {
  try {
    const body: BankAccountInput & { shopId: string } = await request.json()
    const { shopId, accountType, displayName, ...accountData } = body

    if (!shopId) {
      return NextResponse.json(
        { error: 'Shop ID is required' },
        { status: 400 }
      )
    }

    // Validate required fields based on account type
    if (accountType === 'bank') {
      if (!accountData.bankName || !accountData.bankAccountNumber || !accountData.bankAccountName) {
        return NextResponse.json(
          { error: 'Bank name, account number, and account name are required' },
          { status: 400 }
        )
      }
    } else if (accountType === 'promptpay') {
      if (!accountData.promptPayId || !accountData.promptPayType) {
        return NextResponse.json(
          { error: 'PromptPay ID and type are required' },
          { status: 400 }
        )
      }
    }

    const shopRef = adminDb.collection('shops').doc(shopId)
    const shopDoc = await shopRef.get()

    if (!shopDoc.exists) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    const shopData = shopDoc.data()
    const existingAccounts: BankAccount[] = shopData?.bankAccounts || []

    // Create new account
    const newAccount: BankAccount = {
      id: `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      accountType,
      displayName: displayName || (accountType === 'bank' ? 'บัญชีธนาคาร' : 'PromptPay'),
      isDefault: existingAccounts.length === 0, // First account is default
      isEnabled: true,
      isVerified: false, // Will be verified via test transfer
      verificationStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...(accountType === 'bank' ? {
        bankName: accountData.bankName,
        bankAccountNumber: accountData.bankAccountNumber,
        bankAccountName: accountData.bankAccountName,
        bankBranch: accountData.bankBranch || '',
      } : {
        promptPayId: accountData.promptPayId,
        promptPayType: accountData.promptPayType,
      }),
    }

    // Add to array first (before verification)
    const updatedAccounts = [...existingAccounts, newAccount]

    await shopRef.update({
      bankAccounts: updatedAccounts,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    // Start verification in background
    console.log('🔍 Starting account verification...')
    
    // Verify account with test transfer
    const verificationResult = await verifyBankAccountWithTestTransfer(
      shopId,
      newAccount.id,
      {
        accountType,
        bankName: accountData.bankName,
        bankAccountNumber: accountData.bankAccountNumber,
        bankAccountName: accountData.bankAccountName,
        promptPayId: accountData.promptPayId,
        promptPayType: accountData.promptPayType,
      }
    )

    console.log('✅ Verification result:', verificationResult)

    return NextResponse.json({
      success: true,
      account: newAccount,
      verification: verificationResult,
    })
  } catch (error: any) {
    console.error('Error adding bank account:', error)
    return NextResponse.json(
      { error: 'Failed to add bank account' },
      { status: 500 }
    )
  }
}

// PUT - Update existing bank account
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { shopId, id, displayName, ...updateData } = body

    if (!shopId || !id) {
      return NextResponse.json(
        { error: 'Shop ID and Account ID are required' },
        { status: 400 }
      )
    }

    const shopRef = adminDb.collection('shops').doc(shopId)
    const shopDoc = await shopRef.get()

    if (!shopDoc.exists) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    const shopData = shopDoc.data()
    const accounts: BankAccount[] = shopData?.bankAccounts || []

    const accountIndex = accounts.findIndex(acc => acc.id === id)
    if (accountIndex === -1) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Update account
    accounts[accountIndex] = {
      ...accounts[accountIndex],
      displayName: displayName || accounts[accountIndex].displayName,
      ...updateData,
      updatedAt: new Date(),
    }

    await shopRef.update({
      bankAccounts: accounts,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return NextResponse.json({
      success: true,
      account: accounts[accountIndex],
    })
  } catch (error: any) {
    console.error('Error updating bank account:', error)
    return NextResponse.json(
      { error: 'Failed to update bank account' },
      { status: 500 }
    )
  }
}

// DELETE - Remove bank account
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const accountId = searchParams.get('accountId')

    if (!shopId || !accountId) {
      return NextResponse.json(
        { error: 'Shop ID and Account ID are required' },
        { status: 400 }
      )
    }

    const shopRef = adminDb.collection('shops').doc(shopId)
    const shopDoc = await shopRef.get()

    if (!shopDoc.exists) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    const shopData = shopDoc.data()
    let accounts: BankAccount[] = shopData?.bankAccounts || []

    const account = accounts.find(acc => acc.id === accountId)
    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Cannot delete default account if there are other accounts
    if (account.isDefault && accounts.length > 1) {
      return NextResponse.json(
        { error: 'Cannot delete default account. Please set another account as default first.' },
        { status: 400 }
      )
    }

    // Remove account
    accounts = accounts.filter(acc => acc.id !== accountId)

    // If we removed the last account, clear the array
    // Otherwise, ensure there's still a default
    if (accounts.length > 0 && !accounts.some(acc => acc.isDefault)) {
      accounts[0].isDefault = true
    }

    await shopRef.update({
      bankAccounts: accounts,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting bank account:', error)
    return NextResponse.json(
      { error: 'Failed to delete bank account' },
      { status: 500 }
    )
  }
}
