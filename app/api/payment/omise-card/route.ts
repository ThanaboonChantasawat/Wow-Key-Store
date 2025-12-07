import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'
import admin from 'firebase-admin'
import Omise from 'omise'

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OMISE_SECRET_KEY || !process.env.OMISE_PUBLIC_KEY) {
      console.error('❌ Omise API keys not configured!')
      return NextResponse.json(
        { success: false, error: 'Payment system not configured' },
        { status: 500 }
      )
    }

    const omise = Omise({
      publicKey: process.env.OMISE_PUBLIC_KEY!,
      secretKey: process.env.OMISE_SECRET_KEY!,
      omiseVersion: '2019-05-29',
    })
    const { orderId, amount, card } = await request.json()

    console.log('💳 Omise Card Payment Request:', { orderId, amount })
    console.log('🔑 Using OMISE_PUBLIC_KEY:', process.env.OMISE_PUBLIC_KEY?.substring(0, 10) + '...')
    console.log('🔑 Using OMISE_SECRET_KEY:', process.env.OMISE_SECRET_KEY?.substring(0, 10) + '...')

    if (!orderId || !amount || !card) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    

    // Validate card data
    const cardData = {
      number: card.number,
      name: card.name,
      expiration_month: card.expiration_month,
      expiration_year: card.expiration_year,
      security_code: card.security_code,
      city: '', // Optional
      postal_code: '', // Optional
    }

    // Step 1: Create token from card
    console.log('🔐 Creating Omise token...')
    const token = await new Promise<any>((resolve, reject) => {
      omise.tokens.create(
        {
          card: cardData,
        },
        (err: any, token: any) => {
          if (err) reject(err)
          else resolve(token)
        }
      )
    })

    console.log('✅ Token created:', token.id)

    // Step 2: Create charge with token
    console.log('💰 Creating charge...')
    const charge = await new Promise<any>((resolve, reject) => {
      omise.charges.create(
        {
          amount: amount * 100, // Convert to smallest currency unit (satang)
          currency: 'THB',
          card: token.id,
          metadata: {
            orderId,
            paymentMethod: 'credit_card',
          },
        },
        (err: any, charge: any) => {
          if (err) reject(err)
          else resolve(charge)
        }
      )
    })

    console.log('📦 Charge created:', {
      id: charge.id,
      status: charge.status,
      paid: charge.paid,
      authorized: charge.authorized,
    })

    // Step 3: Update order in Firestore
    const orderRef = adminDb.collection('orders').doc(orderId)
    const updateData: any = {
      chargeId: charge.id,
      paymentMethod: 'omise_card',
      updatedAt: new Date().toISOString(),
    }

    // Check if payment is successful
    if (charge.paid) {
      updateData.paymentStatus = 'completed'
      updateData.status = 'processing'
      updateData.paidAt = new Date().toISOString()
      
      console.log('✅ Payment completed!')

      // Update stock for purchased items
      try {
        const orderDoc = await orderRef.get()
        const orderData = orderDoc.data()

        if (orderData) {
          console.log('📦 Updating stock for purchased items...')
          const batch = adminDb.batch()
          let updateCount = 0

          // Helper to add stock update to batch
          const addStockUpdate = (productId: string, quantity: number) => {
            if (!productId) return
            const productRef = adminDb.collection('products').doc(productId)
            batch.update(productRef, {
              stock: admin.firestore.FieldValue.increment(-quantity),
              soldCount: admin.firestore.FieldValue.increment(quantity)
            })
            updateCount++
          }

          // Case 1: Cart checkout order with shops array
          if (orderData.type === 'cart_checkout' && orderData.shops && Array.isArray(orderData.shops)) {
            for (const shop of orderData.shops) {
              if (shop.items && Array.isArray(shop.items)) {
                for (const item of shop.items) {
                  const qty = item.quantity || 1
                  addStockUpdate(item.productId, qty)
                }
              }
            }
          }
          // Case 2: Direct order (if any)
          else if (orderData.items && Array.isArray(orderData.items)) {
            for (const item of orderData.items) {
              const qty = item.quantity || 1
              addStockUpdate(item.productId, qty)
            }
          }

          if (updateCount > 0) {
            await batch.commit()
            console.log(`✅ Updated stock for ${updateCount} items`)
          }
        }
      } catch (stockError) {
        console.error('❌ Failed to update stock:', stockError)
      }
    } else if (charge.status === 'failed') {
      updateData.paymentStatus = 'failed'
      updateData.failureCode = charge.failure_code
      updateData.failureMessage = charge.failure_message
      
      console.log('❌ Payment failed:', charge.failure_message)
      
      return NextResponse.json(
        { success: false, error: charge.failure_message || 'Payment failed' },
        { status: 400 }
      )
    } else if (charge.authorized && charge.authorize_uri) {
      // 3D Secure authentication required
      console.log('🔐 3D Secure required:', charge.authorize_uri)
      
      updateData.paymentStatus = 'pending'
      updateData.authorizeUri = charge.authorize_uri
      
      await orderRef.update(updateData)
      
      return NextResponse.json({
        success: true,
        requiresAuth: true,
        authorizeUri: charge.authorize_uri,
        chargeId: charge.id,
      })
    }

    await orderRef.update(updateData)

    console.log('✅ Order updated successfully')

    return NextResponse.json({
      success: true,
      chargeId: charge.id,
      paid: charge.paid,
    })
  } catch (error: any) {
    console.error('❌ Omise Card Payment Error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      type: error.type,
      statusCode: error.statusCode,
    })
    
    let errorMessage = 'เกิดข้อผิดพลาดในการชำระเงิน'
    
    if (error.message?.includes('authentication failed')) {
      errorMessage = 'ระบบชำระเงินไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ'
      console.error('❌ Authentication failed - check OMISE_SECRET_KEY and OMISE_PUBLIC_KEY')
    } else if (error.code === 'invalid_card') {
      errorMessage = 'ข้อมูลบัตรไม่ถูกต้อง'
    } else if (error.code === 'insufficient_fund') {
      errorMessage = 'ยอดเงินในบัตรไม่เพียงพอ'
    } else if (error.code === 'stolen_or_lost_card') {
      errorMessage = 'บัตรถูกรายงานว่าสูญหายหรือถูกขโมย'
    } else if (error.code === 'failed_processing') {
      errorMessage = 'การประมวลผลล้มเหลว กรุณาลองใหม่'
    } else if (error.message) {
      errorMessage = error.message
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
