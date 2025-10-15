import { NextRequest, NextResponse } from 'next/server'
import { updateShopStripeStatusDirect } from '@/lib/stripe-service'

export async function POST(request: NextRequest) {
  try {
    const { userId, accountId, chargesEnabled, payoutsEnabled, detailsSubmitted } = await request.json()

    if (!userId || !accountId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('Updating shop status:', { userId, accountId, chargesEnabled, payoutsEnabled, detailsSubmitted })

    // Update shop status directly
    await updateShopStripeStatusDirect(userId, {
      accountId,
      chargesEnabled: chargesEnabled ?? false,
      payoutsEnabled: payoutsEnabled ?? false,
      detailsSubmitted: detailsSubmitted ?? false,
    })

    console.log('Shop status updated successfully')

    return NextResponse.json({
      success: true,
      message: 'Shop status updated successfully',
    })
  } catch (error: any) {
    console.error('Error updating shop status:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update shop status',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
