import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

interface CheckoutItem {
  productId: string
  shopId: string
  price: number
  name: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== Validate Checkout API Called ===')
    const body = await request.json()
    console.log('Request body:', JSON.stringify(body, null, 2))
    
    const { items, userId } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error('No items provided')
      return NextResponse.json(
        { error: 'No items provided' },
        { status: 400 }
      )
    }

    if (!userId) {
      console.error('No userId provided')
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    console.log(`Validating ${items.length} items for user ${userId}`)

    // Validate each shop has payment method configured
    const shopIds = [...new Set(items.map((item: CheckoutItem) => item.shopId))]
    
    let hasPromptPayAvailable = true
    let hasBankTransferAvailable = true
    
    for (const shopId of shopIds) {
      const shopRef = adminDb.collection('shops').doc(shopId)
      const shopDoc = await shopRef.get()

      if (!shopDoc.exists) {
        console.error(`Shop ${shopId} not found`)
        return NextResponse.json(
          { error: `Shop ${shopId} not found` },
          { status: 404 }
        )
      }

      const shopData = shopDoc.data()
      if (!shopData) {
        console.error(`Shop ${shopId} has invalid data`)
        return NextResponse.json(
          { error: `Shop ${shopId} data is invalid` },
          { status: 500 }
        )
      }

      // Check if shop has VALID bank account or PromptPay setup for payouts
      // Must have proper bank details (account number, name, bank name) OR valid PromptPay ID
      const hasValidBankAccount = shopData.bankAccountNumber && 
                                  shopData.bankAccountNumber.trim() !== '' &&
                                  shopData.bankName && 
                                  shopData.bankName.trim() !== '' &&
                                  shopData.bankAccountName && 
                                  shopData.bankAccountName.trim() !== ''
      
      const hasValidPromptPay = shopData.promptPayId && 
                                shopData.promptPayId.trim() !== '' &&
                                shopData.promptPayId.length >= 10 // PromptPay must be at least 10 digits
      
      if (!hasValidBankAccount && !hasValidPromptPay) {
        console.error(`❌ Shop ${shopData.shopName} (${shopId}) has no valid payment method configured`)
        console.error(`Bank Account: ${hasValidBankAccount ? 'Valid' : 'Invalid/Missing'}`)
        console.error(`PromptPay: ${hasValidPromptPay ? 'Valid' : 'Invalid/Missing'}`)
        return NextResponse.json(
          { error: `ร้านค้า ${shopData.shopName} ยังไม่ได้ตั้งค่าบัญชีรับเงินที่สมบูรณ์ กรุณาติดต่อผู้ขาย` },
          { status: 400 }
        )
      }
      
      // Track which payment methods are available across all shops
      if (!hasValidPromptPay) {
        hasPromptPayAvailable = false
      }
      if (!hasValidBankAccount) {
        hasBankTransferAvailable = false
      }
      
      console.log(`✅ Shop ${shopData.shopName} has valid payment method configured`)
      console.log(`  - Bank Account: ${hasValidBankAccount ? '✓' : '✗'}`)
      console.log(`  - PromptPay: ${hasValidPromptPay ? '✓' : '✗'}`)
    }

    // Calculate totals
    const grandTotal = items.reduce((sum: number, item: CheckoutItem) => sum + item.price, 0)
    const totalPlatformFee = Math.round(grandTotal * 0.10) // 10% platform fee

    console.log('Validation successful:', { grandTotal, totalPlatformFee, hasPromptPayAvailable, hasBankTransferAvailable })

    return NextResponse.json({
      success: true,
      grandTotal,
      totalPlatformFee,
      availablePaymentMethods: {
        promptpay: hasPromptPayAvailable,
        creditCard: true, // Credit card is always available (Omise)
        bankTransfer: hasBankTransferAvailable,
      }
    })
  } catch (error) {
    console.error('=== Validate Checkout API Error ===')
    console.error('Error details:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Failed to validate checkout', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
