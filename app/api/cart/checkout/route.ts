import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/components/firebase-config'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
})

interface CheckoutItem {
  productId: string
  shopId: string
  price: number
  name: string
}

interface GroupedOrder {
  shopId: string
  shopName: string
  stripeAccountId: string
  items: CheckoutItem[]
  totalAmount: number
  platformFee: number
  sellerAmount: number
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== Cart Checkout API Called ===')
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

    console.log(`Processing ${items.length} items for user ${userId}`)

    // Group items by shop
    const shopGroups = new Map<string, GroupedOrder>()

    for (const item of items) {
      console.log(`Processing item:`, item)
      
      // Get shop details
      const shopRef = doc(db, 'shops', item.shopId)
      const shopDoc = await getDoc(shopRef)

      if (!shopDoc.exists()) {
        console.error(`Shop ${item.shopId} not found`)
        return NextResponse.json(
          { error: `Shop ${item.shopId} not found` },
          { status: 404 }
        )
      }

      const shopData = shopDoc.data()
      console.log(`Shop data for ${item.shopId}:`, shopData.shopName)
      
      if (!shopData.stripeAccountId) {
        return NextResponse.json(
          { error: `Shop ${shopData.shopName} has not set up payment yet` },
          { status: 400 }
        )
      }

      // Add to group
      if (!shopGroups.has(item.shopId)) {
        shopGroups.set(item.shopId, {
          shopId: item.shopId,
          shopName: shopData.shopName,
          stripeAccountId: shopData.stripeAccountId,
          items: [],
          totalAmount: 0,
          platformFee: 0,
          sellerAmount: 0,
        })
      }

      const group = shopGroups.get(item.shopId)!
      group.items.push(item)
      group.totalAmount += item.price
    }

    // Calculate fees for each group
    shopGroups.forEach((group) => {
      // Platform takes 10% fee
      group.platformFee = Math.round(group.totalAmount * 0.10)
      group.sellerAmount = group.totalAmount - group.platformFee
    })

    // Calculate grand total
    const grandTotal = Array.from(shopGroups.values()).reduce(
      (sum, group) => sum + group.totalAmount,
      0
    )
    const totalPlatformFee = Array.from(shopGroups.values()).reduce(
      (sum, group) => sum + group.platformFee,
      0
    )

    console.log('Grand total (THB):', grandTotal)
    console.log('Total platform fee (THB):', totalPlatformFee)
    console.log('Amount to charge (satang):', grandTotal * 100)

    // Create a single Payment Intent for the entire cart
    // We'll use metadata to track which shops get which amounts
    const paymentIntent = await stripe.paymentIntents.create({
      amount: grandTotal * 100, // Convert THB to satang (smallest currency unit)
      currency: 'thb',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId,
        type: 'cart_checkout',
        orderCount: shopGroups.size.toString(),
        shops: JSON.stringify(
          Array.from(shopGroups.values()).map(g => ({
            shopId: g.shopId,
            shopName: g.shopName,
            stripeAccountId: g.stripeAccountId,
            amount: g.totalAmount,
            platformFee: g.platformFee,
            sellerAmount: g.sellerAmount,
            items: g.items.map(i => ({
              productId: i.productId,
              name: i.name,
              price: i.price,
            })),
          }))
        ),
      },
    })

    console.log('Payment Intent created:', paymentIntent.id)
    console.log('Client secret:', paymentIntent.client_secret ? 'exists' : 'missing')

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      orders: Array.from(shopGroups.values()),
      grandTotal,
      totalPlatformFee,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error) {
    console.error('=== Cart Checkout API Error ===')
    console.error('Error details:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
