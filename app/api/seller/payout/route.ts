import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'
import admin from 'firebase-admin'
import { processSellerPayoutViaOmise } from '@/lib/omise-transfer-service'

export async function POST(request: NextRequest) {
  try {
    const { userId, amount } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      )
    }

    console.log('💸 Processing payout request:', { userId, amount })

    // Get shop info
    const shopRef = adminDb.collection('shops').doc(`shop_${userId}`)
    const shopDoc = await shopRef.get()

    if (!shopDoc.exists) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    const shopData = shopDoc.data()
    if (!shopData) {
      return NextResponse.json(
        { error: 'Shop data is invalid' },
        { status: 500 }
      )
    }

    const shopId = shopDoc.id

    console.log('🏪 Shop info:', {
      shopId,
      shopName: shopData.shopName,
      bankAccount: shopData.bankAccountNumber ? '****' + shopData.bankAccountNumber.slice(-4) : null,
      promptPay: shopData.promptPayId ? '****' + shopData.promptPayId.slice(-4) : null,
    })

    // Verify shop has bank account configured
    if (!shopData.bankAccountNumber && !shopData.promptPayId) {
      console.error('❌ Payout failed: Bank account not configured')
      return NextResponse.json(
        { error: 'Bank account not configured' },
        { status: 400 }
      )
    }

    // Calculate available balance
    // Only include orders that buyer has confirmed receipt
    const ordersQuery = adminDb.collection('orders')
      .where('shopId', '==', shopId)
      .where('status', '==', 'completed')
      .where('paymentStatus', '==', 'completed')
      .where('buyerConfirmed', '==', true) // Must be confirmed by buyer

    const ordersSnapshot = await ordersQuery.get()

    let availableBalance = 0
    const ordersToPayout: any[] = []

    ordersSnapshot.docs.forEach(doc => {
      const order = doc.data()
      const sellerAmount = Number(order.sellerAmount) || 0

      // Only include orders that haven't been paid out AND are confirmed by buyer
      if (order.payoutStatus !== 'paid' && order.payoutStatus !== 'completed' && order.buyerConfirmed === true) {
        availableBalance += sellerAmount
        ordersToPayout.push({
          id: doc.id,
          amount: sellerAmount,
        })
      }
    })

    console.log('💰 Available balance calculated:', {
      availableBalance,
      ordersToPayout: ordersToPayout.length,
      requestedAmount: amount,
    })

    // Check if requested amount is available
    if (amount > availableBalance) {
      console.error('❌ Insufficient balance:', { available: availableBalance, requested: amount })
      return NextResponse.json(
        {
          error: 'Insufficient balance',
          availableBalance,
          requestedAmount: amount,
        },
        { status: 400 }
      )
    }

    // Create payout to seller's bank account
    try {
      console.log('💸 Processing payout for seller:', {
        shopId,
        shopName: shopData.shopName,
        amount,
        method: shopData.promptPayId ? 'promptpay' : 'bank_transfer',
      })

      // Create payout record first
      const payoutRef = await adminDb.collection('payouts').add({
        userId,
        shopId,
        shopName: shopData.shopName,
        amount,
        status: 'processing',
        method: shopData.promptPayId ? 'promptpay' : 'bank_transfer',
        bankAccount: shopData.bankAccountNumber || null,
        bankName: shopData.bankName || null,
        promptPayId: shopData.promptPayId || null,
        orderIds: ordersToPayout.map((o: any) => o.id),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        note: 'Processing Omise transfer',
      })

      const payoutId = payoutRef.id
      console.log('✅ Payout record created:', payoutId)

      // Initiate actual bank transfer using Omise
      console.log('🏦 Using Omise Transfer API for payout')
      
      const transferResult = await processSellerPayoutViaOmise(
        shopId,
        amount,
        payoutId,
        `Payout for ${ordersToPayout.length} orders`
      )

      console.log('🏦 Transfer result:', transferResult)

      // Get transaction/transfer ID (works for both SCB and Omise)
      const transactionOrTransferId = (transferResult as any).transferId || (transferResult as any).transactionId || null
      
      // Update payout record with transfer result
      await payoutRef.update({
        status: transferResult.success ? 'completed' : 'failed',
        transactionId: transactionOrTransferId,
        transferStatus: transferResult.status,
        transferMessage: transferResult.message,
        transferError: transferResult.errorCode || null,
        transferFee: transferResult.fee || 0,
        completedAt: transferResult.success ? admin.firestore.FieldValue.serverTimestamp() : null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      if (!transferResult.success) {
        console.error('❌ Bank transfer failed:', transferResult.message)
        return NextResponse.json(
          {
            error: 'Bank transfer failed',
            details: transferResult.message,
            errorCode: transferResult.errorCode,
          },
          { status: 500 }
        )
      }

      // Mark orders as paid out
      const batch = adminDb.batch()
      ordersToPayout.forEach((order: any) => {
        const orderRef = adminDb.collection('orders').doc(order.id)
        batch.update(orderRef, {
          payoutStatus: 'paid',
          payoutId: payoutRef.id,
          payoutDate: admin.firestore.FieldValue.serverTimestamp(),
        })
      })
      await batch.commit()

      console.log('✅ Orders marked as paid out')

      // Build success message
      const method = shopData.promptPayId ? 'PromptPay' : 'บัญชีธนาคาร'
      const destination = shopData.promptPayId 
        ? `PromptPay: ${shopData.promptPayId.substring(0, 3)}***${shopData.promptPayId.substring(shopData.promptPayId.length - 4)}`
        : `${shopData.bankName || 'ธนาคาร'} ${shopData.bankAccountNumber?.substring(shopData.bankAccountNumber.length - 4) || '****'}`

      return NextResponse.json({
        success: true,
        payout: {
          id: payoutRef.id,
          amount,
          status: 'completed',
          method: transferResult.status,
          transactionId: transactionOrTransferId,
          fee: transferResult.fee || 0,
        },
        message: `โอนเงินสำเร็จ ฿${amount.toLocaleString()}\nโอนเข้า${method}: ${destination}\nเลขอ้างอิง: ${transactionOrTransferId}`,
      })
    } catch (payoutError: any) {
      console.error('❌ Payout request error:', payoutError)

      // Create failed payout record
      await adminDb.collection('payouts').add({
        userId,
        shopId,
        shopName: shopData.shopName,
        amount,
        status: 'failed',
        error: payoutError.message,
        method: shopData.promptPayId ? 'promptpay' : 'bank_transfer',
        bankAccount: shopData.bankAccountNumber || null,
        promptPayId: shopData.promptPayId || null,
        orderIds: ordersToPayout.map((o: any) => o.id),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      return NextResponse.json(
        {
          error: 'Payout request failed',
          details: payoutError.message,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('❌ Error processing payout:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
    })
    return NextResponse.json(
      {
        error: 'Failed to process payout',
        details: error.message,
        code: error.code,
      },
      { status: 500 }
    )
  }
}
