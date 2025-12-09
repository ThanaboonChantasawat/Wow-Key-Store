import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

interface CheckoutItem {
  productId: string
  shopId: string
  price: number
  name: string
  quantity: number
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

    // First, validate stock availability for all items
    for (const item of items) {
      console.log(`Checking stock for product: ${item.productId}, name: ${item.name}, quantity: ${item.quantity}`)
      
      const productRef = adminDb.collection('products').doc(item.productId)
      const productDoc = await productRef.get()

      if (!productDoc.exists) {
        console.error(`Product ${item.productId} not found`)
        return NextResponse.json(
          { error: `สินค้า "${item.name}" ไม่พบในระบบ` },
          { status: 404 }
        )
      }

      const productData = productDoc.data()
      if (!productData) {
        console.error(`Product ${item.productId} has invalid data`)
        return NextResponse.json(
          { error: `สินค้า "${item.name}" มีข้อมูลไม่ถูกต้อง` },
          { status: 500 }
        )
      }

      // Check stock - handle both number and string types
      const requestedQty = item.quantity || 1
      let currentStock = 0
      
      if (productData.stock === 'unlimited' || productData.stock === -1) {
        currentStock = 999999
      } else if (typeof productData.stock === 'number') {
        currentStock = productData.stock
      } else if (typeof productData.stock === 'string') {
        currentStock = parseInt(productData.stock, 10) || 0
      }
      
      console.log(`Stock info - Product: ${item.name}, Requested: ${requestedQty}, Available: ${currentStock}, Type: ${typeof productData.stock}, Raw value: ${productData.stock}`)

      if (currentStock < requestedQty) {
        console.error(`Insufficient stock for ${item.name}: requested ${requestedQty}, available ${currentStock}`)
        return NextResponse.json(
          { error: `สินค้า "${item.name}" มีไม่เพียงพอ (เหลือ ${currentStock} ชิ้น)` },
          { status: 400 }
        )
      }

      console.log(`✅ Stock check passed for ${item.name}: ${requestedQty}/${currentStock}`)
    }

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

      // Check if shop has VALID bank account or PromptPay setup for payouts using the new bankAccounts array
      const bankAccounts = shopData.bankAccounts || []
      const hasVerifiedAccount = bankAccounts.some((acc: any) => acc.isEnabled && acc.verificationStatus === 'verified')
      
      console.log(`Checking payment setup for shop ${shopData.shopName}:`)
      console.log(`  - Bank Accounts array:`, bankAccounts.length)
      console.log(`  - Has verified account:`, hasVerifiedAccount)
      
      // Fallback to legacy check if no new accounts found (for backward compatibility)
      const hasLegacyBankAccount = shopData.bankAccountNumber && 
                                  shopData.bankAccountNumber.trim() !== '' &&
                                  shopData.bankName && 
                                  shopData.bankName.trim() !== '' &&
                                  shopData.bankAccountName && 
                                  shopData.bankAccountName.trim() !== ''
      
      console.log(`  - Legacy bank account:`, hasLegacyBankAccount)
      console.log(`    • Account Number:`, shopData.bankAccountNumber ? '✓' : '✗')
      console.log(`    • Bank Name:`, shopData.bankName ? '✓' : '✗')
      console.log(`    • Account Name:`, shopData.bankAccountName ? '✓' : '✗')
      
      const hasLegacyPromptPay = shopData.promptPayId && 
                                shopData.promptPayId.trim() !== ''
      
      console.log(`  - Legacy PromptPay:`, hasLegacyPromptPay)
      console.log(`    • PromptPay ID:`, shopData.promptPayId || 'Not set')

      const isValidShop = hasVerifiedAccount || hasLegacyBankAccount || hasLegacyPromptPay
      
      console.log(`  - Final validation:`, isValidShop ? '✅ PASSED' : '❌ FAILED')
      
      if (!isValidShop) {
        console.error(`❌ Shop ${shopData.shopName} (${shopId}) has no valid payment method configured`)
        return NextResponse.json(
          { error: `ร้านค้า ${shopData.shopName} ยังไม่ได้ตั้งค่าบัญชีรับเงินที่สมบูรณ์ กรุณาติดต่อผู้ขาย` },
          { status: 400 }
        )
      }
      
      // If the shop has a valid payout method (Bank or PromptPay), 
      // the platform can accept payments via any channel (PromptPay, Credit Card, etc.)
      // and then transfer to the shop's configured account.
      // So we don't need to restrict the buyer's payment methods based on the shop's specific account type.
      
      console.log(`✅ Shop ${shopData.shopName} has valid payment method configured`)
    }

    // Calculate totals
    const grandTotal = items.reduce((sum: number, item: CheckoutItem) => sum + (item.price * (item.quantity || 1)), 0)
    const totalPlatformFee = Math.round(grandTotal * 0.05) // 5% platform fee

    console.log('Validation successful:', { grandTotal, totalPlatformFee })

    return NextResponse.json({
      success: true,
      grandTotal,
      totalPlatformFee,
      availablePaymentMethods: {
        promptpay: true,
        creditCard: true,
        bankTransfer: true,
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
