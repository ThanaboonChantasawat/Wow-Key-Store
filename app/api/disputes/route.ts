// API Route: POST /api/disputes
// Create a new dispute (buyer reports problem)

import { NextRequest, NextResponse } from 'next/server'
import { createDispute } from '@/lib/dispute-service'
import { verifyIdToken } from '@/lib/firebase-admin-config'

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
    const decodedToken = await verifyIdToken(token)
    const userId = decodedToken.uid

    // Parse request body
    const body = await request.json()
    const { orderId, type, subject, description, evidence } = body

    if (!orderId || !type || !subject || !description) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน' },
        { status: 400 }
      )
    }

    // Create dispute
    const result = await createDispute(userId, {
      orderId,
      type,
      subject,
      description,
      evidence: evidence || []
    })

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Error in POST /api/disputes:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
