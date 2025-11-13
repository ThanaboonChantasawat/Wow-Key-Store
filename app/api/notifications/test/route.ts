import { NextRequest, NextResponse } from "next/server"
import { createNotification } from "@/lib/notification-service"

/**
 * Test endpoint to create a sample notification
 * Usage: POST /api/notifications/test
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      )
    }

    // Create a test notification
    await createNotification(
      userId,
      'welcome',
      '🎉 ยินดีต้อนรับ!',
      'ขอบคุณที่ใช้บริการ WowKeyStore ระบบแจ้งเตือนพร้อมใช้งานแล้ว',
      '/products'
    )

    return NextResponse.json({
      success: true,
      message: 'Test notification created successfully'
    })
  } catch (error) {
    console.error("Error creating test notification:", error)
    return NextResponse.json(
      { error: "Failed to create test notification", details: String(error) },
      { status: 500 }
    )
  }
}
