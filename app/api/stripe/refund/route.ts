import { NextRequest, NextResponse } from 'next/server'
import { createRefund } from '@/lib/payment-service'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('user')
    
    if (!userCookie?.value) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { paymentIntentId, amount, reason } = await request.json()

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment Intent ID is required' },
        { status: 400 }
      )
    }

    const result = await createRefund(paymentIntentId, amount, reason)

    return NextResponse.json({
      success: true,
      refundId: result.refundId,
      amount: result.amount,
      status: result.status,
    })
  } catch (error: any) {
    console.error('Error creating refund:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create refund',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
