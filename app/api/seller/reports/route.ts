
import { NextRequest, NextResponse } from 'next/server'
import { getSellerDisputes } from '@/lib/dispute-service'
import { adminAuth } from '@/lib/firebase-admin-config'

export async function GET(request: NextRequest) {
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

    // Get disputes
    const disputes = await getSellerDisputes(userId)

    return NextResponse.json({ success: true, disputes })

  } catch (error: any) {
    console.error('Error in GET /api/seller/reports:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
