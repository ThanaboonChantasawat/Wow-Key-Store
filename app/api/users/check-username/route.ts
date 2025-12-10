import { NextRequest, NextResponse } from 'next/server'
import { checkUsernameExists } from '@/lib/user-service'

/**
 * GET /api/users/check-username?username=ชื่อผู้ใช้&excludeUserId=user_xxx
 * ตรวจสอบว่าชื่อผู้ใช้ซ้ำหรือไม่
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')
    const excludeUserId = searchParams.get('excludeUserId')

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    const exists = await checkUsernameExists(username, excludeUserId || undefined)

    return NextResponse.json({ 
      exists,
      message: exists ? 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' : 'ชื่อผู้ใช้พร้อมใช้งาน'
    })
  } catch (error: any) {
    console.error('Error checking username:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check username' },
      { status: 500 }
    )
  }
}
