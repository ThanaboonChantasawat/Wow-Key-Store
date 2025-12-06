import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { status } = await request.json()
    const { id: messageId } = await params

    // Validation
    if (!status) {
      return NextResponse.json(
        { error: 'กรุณาระบุสถานะ' },
        { status: 400 }
      )
    }

    // Validate status value
    const validStatuses = ['pending', 'in-progress', 'resolved', 'closed']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'สถานะไม่ถูกต้อง' },
        { status: 400 }
      )
    }

    // Update document in Firestore
    await adminDb.collection('support_messages').doc(messageId).update({
      status,
      updatedAt: new Date().toISOString(),
    })

    console.log(`✅ Support message ${messageId} status updated to: ${status}`)

    return NextResponse.json(
      {
        success: true,
        message: 'อัปเดตสถานะสำเร็จ',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ Error updating support message status:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ' },
      { status: 500 }
    )
  }
}
