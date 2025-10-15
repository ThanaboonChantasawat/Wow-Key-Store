import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getShopByOwnerId } from '@/lib/shop-service'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get shop
    const shop = await getShopByOwnerId(userId)
    
    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    if (!shop.stripeAccountId) {
      return NextResponse.json(
        { error: 'Stripe account not connected' },
        { status: 400 }
      )
    }

    // Get charges (payments) from Stripe
    // สำหรับ Direct Charges: ข้อมูลอยู่ที่ Platform Account
    // Filter by destination (seller's account)
    const charges = await stripe.charges.list({
      limit,
      // ไม่ต้องระบุ stripeAccount เพราะดึงจาก Platform
    })

    console.log('Total charges:', charges.data.length)
    console.log('Seller account ID:', shop.stripeAccountId)

    // Filter เฉพาะ charges ที่เป็นของ seller นี้
    const sellerCharges = charges.data.filter(charge => {
      const destination = charge.transfer_data?.destination
      console.log('Charge:', charge.id, 'Destination:', destination)
      return destination === shop.stripeAccountId
    })

    console.log('Seller charges:', sellerCharges.length)

    return NextResponse.json({
      charges: sellerCharges.map(charge => ({
        id: charge.id,
        amount: charge.amount,
        currency: charge.currency,
        status: charge.status,
        created: charge.created,
        description: charge.description,
        receipt_url: charge.receipt_url,
        paid: charge.paid,
        refunded: charge.refunded,
        amount_refunded: charge.amount_refunded,
        payment_method_details: charge.payment_method_details,
      })),
      has_more: charges.has_more,
    })
  } catch (error) {
    console.error('Error fetching charges:', error)
    return NextResponse.json(
      { error: 'Failed to fetch charges' },
      { status: 500 }
    )
  }
}
