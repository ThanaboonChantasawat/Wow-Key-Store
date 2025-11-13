import { NextRequest, NextResponse } from 'next/server'
// Stripe no longer used. This endpoint intentionally disabled.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chargeId: string }> }
) {
  const { chargeId } = await params
  if (!chargeId) {
    return NextResponse.json(
      { error: 'Charge ID is required' },
      { status: 400 }
    )
  }

  return NextResponse.json(
    { error: 'Stripe flow disabled. Use Omise endpoints instead.' },
    { status: 400 }
  )
}
