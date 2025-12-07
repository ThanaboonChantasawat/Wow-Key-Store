
import { NextRequest, NextResponse } from 'next/server'
import { sellerResolveDispute } from '@/lib/dispute-service'
import { adminAuth } from '@/lib/firebase-admin-config'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Parse body
    const body = await request.json()
    const { disputeId, action, response, newCode, deliveredItems } = body

    if (!disputeId || !action || !response) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน' },
        { status: 400 }
      )
    }

    // Resolve dispute
    const result = await sellerResolveDispute(
      disputeId,
      userId,
      action,
      response,
      newCode,
      deliveredItems
    )

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Error in POST /api/seller/reports/resolve:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
