import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { cookies } from 'next/headers'
import { getShopByOwnerId } from '@/lib/shop-service'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    
    // Try to get user from cookie first
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('user')
    
    let userId: string | null = null
    
    if (userCookie?.value) {
      const user = JSON.parse(userCookie.value)
      userId = user.uid
      console.log('User from cookie:', userId)
    } else {
      // Fallback: get from query parameter (for testing)
      userId = searchParams.get('userId')
      console.log('User from query:', userId)
    }
    
    if (!userId) {
      console.error('No user ID found')
      return NextResponse.json(
        { error: 'Unauthorized - Please login or provide userId' },
        { status: 401 }
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
