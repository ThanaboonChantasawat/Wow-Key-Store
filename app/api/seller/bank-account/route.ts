import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'
import { validateBankAccount } from '@/lib/bank-transfer-service'

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

    const shopDoc = await adminDb.collection('shops').doc(shopId).get()
    
    if (!shopDoc.exists) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    const shopData = shopDoc.data()
    
    return NextResponse.json({
      bankName: shopData?.bankName || null,
      bankAccountNumber: shopData?.bankAccountNumber || null,
      bankAccountName: shopData?.bankAccountName || null,
      bankBranch: shopData?.bankBranch || null,
      enableBank: shopData?.enableBank || false,
      promptPayId: shopData?.promptPayId || null,
      promptPayType: shopData?.promptPayType || null,
      enablePromptPay: shopData?.enablePromptPay || false,
    })
  } catch (error: any) {
    console.error('Error getting bank account:', error)
    return NextResponse.json(
      { error: 'Failed to get bank account' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      shopId, 
      bankName,
      bankAccountNumber,
      bankAccountName,
      bankBranch,
      enableBank,
      promptPayId,
      promptPayType,
      enablePromptPay,
    } = body

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

    const updateData: any = {
      updatedAt: new Date(),
    }

    // Handle bank account
    if (enableBank) {
      if (!bankName || !bankAccountNumber || !bankAccountName) {
        return NextResponse.json(
          { error: 'Bank account information is incomplete' },
          { status: 400 }
        )
      }

      // Validate bank account
      const validation = await validateBankAccount(bankAccountNumber, bankName)
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error || 'Invalid bank account' },
          { status: 400 }
        )
      }

      updateData.bankName = bankName
      updateData.bankAccountNumber = bankAccountNumber
      updateData.bankAccountName = bankAccountName
      updateData.bankBranch = bankBranch || null
      updateData.enableBank = true
    } else {
      updateData.bankName = null
      updateData.bankAccountNumber = null
      updateData.bankAccountName = null
      updateData.bankBranch = null
      updateData.enableBank = false
    }

    // Handle PromptPay
    if (enablePromptPay) {
      if (!promptPayId || !promptPayType) {
        return NextResponse.json(
          { error: 'PromptPay information is incomplete' },
          { status: 400 }
        )
      }

      // Validate PromptPay format
      if (promptPayType === 'mobile' && !/^0\d{9}$/.test(promptPayId)) {
        return NextResponse.json(
          { error: 'Invalid mobile number format (must be 10 digits starting with 0)' },
          { status: 400 }
        )
      }

      if (promptPayType === 'citizen_id' && !/^\d{13}$/.test(promptPayId)) {
        return NextResponse.json(
          { error: 'Invalid citizen ID format (must be 13 digits)' },
          { status: 400 }
        )
      }

      updateData.promptPayId = promptPayId
      updateData.promptPayType = promptPayType
      updateData.enablePromptPay = true
    } else {
      updateData.promptPayId = null
      updateData.promptPayType = null
      updateData.enablePromptPay = false
    }

    // Update shop
    await shopRef.update(updateData)

    return NextResponse.json({
      success: true,
      message: 'Payment information saved successfully',
    })
  } catch (error: any) {
    console.error('Error saving bank account:', error)
    return NextResponse.json(
      { error: 'Failed to save bank account' },
      { status: 500 }
    )
  }
}
