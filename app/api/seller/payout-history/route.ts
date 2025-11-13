import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    console.log('📜 Fetching payout history for user:', userId)

    // Get shop info
    const shopRef = adminDb.collection('shops').doc(`shop_${userId}`)
    const shopDoc = await shopRef.get()

    if (!shopDoc.exists) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    const shopId = shopDoc.id

    // Get payout history
    const payoutsQuery = adminDb.collection('payouts')
      .where('shopId', '==', shopId)
      .orderBy('createdAt', 'desc')

    const payoutsSnapshot = await payoutsQuery.get()

    const payouts = payoutsSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        amount: data.amount,
        status: data.status,
        stripeTransferId: data.stripeTransferId,
        orderIds: data.orderIds || [],
        error: data.error,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      }
    })

    console.log(`✅ Found ${payouts.length} payouts`)

    return NextResponse.json({
      success: true,
      payouts,
    })
  } catch (error: any) {
    console.error('❌ Error fetching payout history:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch payout history',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
