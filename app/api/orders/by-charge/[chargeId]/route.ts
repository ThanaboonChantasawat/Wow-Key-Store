import { NextRequest, NextResponse } from 'next/server'
// Stripe no longer used. This endpoint is disabled.

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

      console.log('🚀 API /api/orders/by-charge/[chargeId] called')
      try {
        return NextResponse.json({
          error: 'Stripe flow disabled. Use Omise endpoints instead.',
      isFromStripeMetadata: true // 🚨 Flag บอกว่าข้อมูลมาจาก Stripe ไม่ใช่ Firestore
        }, { status: 400 })
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
