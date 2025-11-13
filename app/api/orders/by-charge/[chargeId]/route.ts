import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/components/firebase-config'
import { collection, query, where, getDocs, limit } from 'firebase/firestore'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chargeId: string }> }
) {
  console.log('🚀 API /api/orders/by-charge/[chargeId] called')
  
  try {
    const { chargeId } = await params
    console.log('📋 ChargeId from params:', chargeId)
    console.log('🔑 ChargeId from params:', chargeId)

    if (!chargeId) {
      console.log('❌ No chargeId provided')
      return NextResponse.json(
        { error: 'Charge ID is required' },
        { status: 400 }
      )
    }

    console.log('🔍 Fetching charge from Stripe:', chargeId)

    // Fetch charge จาก Stripe
    const charge = await stripe.charges.retrieve(chargeId, {
      expand: ['payment_intent', 'transfer_data']
    })

    console.log('✅ Charge retrieved:', charge.id)
    console.log('📋 Payment Intent ID:', charge.payment_intent)
    console.log('📋 Charge metadata:', charge.metadata)

    // ลองหา order จาก payment_intent ใน Firestore
    let firestoreOrder = null
    if (charge.payment_intent) {
      const paymentIntentId = typeof charge.payment_intent === 'string' 
        ? charge.payment_intent 
        : charge.payment_intent.id

      console.log('🔍 Searching Firestore for payment_intent:', paymentIntentId)
      
      const ordersRef = collection(db, 'orders')
      const q = query(ordersRef, where('paymentIntentId', '==', paymentIntentId), limit(1))
      const snapshot = await getDocs(q)

      if (!snapshot.empty) {
        const doc = snapshot.docs[0]
        firestoreOrder = {
          id: doc.id,
          ...doc.data()
        }
        console.log('✅ Found order in Firestore by paymentIntentId:', firestoreOrder.id)
        return NextResponse.json({ order: firestoreOrder })
      } else {
        console.log('⚠️ No order found by paymentIntentId')
      }
    }

    // ลองหาจาก charge ID ใน metadata
    console.log('🔍 Searching Firestore for chargeId in metadata...')
    const ordersRef2 = collection(db, 'orders')
    const q2 = query(ordersRef2, where('chargeId', '==', chargeId), limit(1))
    const snapshot2 = await getDocs(q2)

    if (!snapshot2.empty) {
      const doc = snapshot2.docs[0]
      firestoreOrder = {
        id: doc.id,
        ...doc.data()
      }
      console.log('✅ Found order in Firestore by chargeId:', firestoreOrder.id)
      return NextResponse.json({ order: firestoreOrder })
    } else {
      console.log('⚠️ No order found by chargeId')
    }

    // ลองหาจาก userId และเวลาที่ใกล้เคียงกัน (ในช่วง ±5 นาที)
    if (charge.metadata?.userId) {
      console.log('🔍 Searching by userId and time range...')
      const chargeTime = new Date(charge.created * 1000)
      const fiveMinsBefore = new Date(chargeTime.getTime() - 5 * 60 * 1000).toISOString()
      const fiveMinsAfter = new Date(chargeTime.getTime() + 5 * 60 * 1000).toISOString()
      
      const ordersRef3 = collection(db, 'orders')
      const q3 = query(
        ordersRef3, 
        where('userId', '==', charge.metadata.userId),
        where('createdAt', '>=', fiveMinsBefore),
        where('createdAt', '<=', fiveMinsAfter),
        limit(1)
      )
      
      try {
        const snapshot3 = await getDocs(q3)
        if (!snapshot3.empty) {
          const doc = snapshot3.docs[0]
          firestoreOrder = {
            id: doc.id,
            ...doc.data()
          }
          console.log('✅ Found order in Firestore by userId+time:', firestoreOrder.id)
          return NextResponse.json({ order: firestoreOrder })
        }
      } catch (e) {
        console.log('⚠️ Time range query failed, continuing...')
      }
    }

    console.log('⚠️ No order found in Firestore by any method')

    // ถ้าไม่เจอใน Firestore ให้สร้าง order จาก charge data
    // Fallback: สร้าง order จาก charge metadata
    const order = {
      id: charge.id,
      userId: charge.metadata?.userId || charge.billing_details?.email || 'unknown',
      shopId: charge.metadata?.shopId || charge.transfer_data?.destination || 'unknown',
      shopName: charge.metadata?.shopName || 'ร้านค้า',
      items: [
        {
          productId: charge.metadata?.productId || 'unknown',
          name: charge.description || charge.metadata?.productName || 'สินค้า',
          price: charge.amount
        }
      ],
      totalAmount: charge.amount,
      platformFee: Math.round(charge.amount * 0.1),
      sellerAmount: Math.round(charge.amount * 0.9),
      paymentIntentId: typeof charge.payment_intent === 'string' 
        ? charge.payment_intent 
        : charge.payment_intent?.id || charge.id,
      transferId: charge.transfer_data?.destination || '',
      paymentStatus: charge.paid ? 'completed' : 'pending',
      status: charge.refunded ? 'cancelled' : charge.paid ? 'completed' : 'pending',
      createdAt: new Date(charge.created * 1000).toISOString(),
      updatedAt: new Date(charge.created * 1000).toISOString(),
      billing_details: charge.billing_details,
      receipt_url: charge.receipt_url,
      amount_refunded: charge.amount_refunded,
      refunded: charge.refunded,
      isFromStripeMetadata: true // 🚨 Flag บอกว่าข้อมูลมาจาก Stripe ไม่ใช่ Firestore
    }

    console.log('⚠️ Order created from Stripe metadata (incomplete data):', order.id)
    return NextResponse.json({ order })

  } catch (error: any) {
    console.error('❌ Error in /api/orders/by-charge/[chargeId]:', error)
    console.error('❌ Error message:', error.message)
    console.error('❌ Error stack:', error.stack)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch charge from Stripe' },
      { status: 500 }
    )
  }
}
