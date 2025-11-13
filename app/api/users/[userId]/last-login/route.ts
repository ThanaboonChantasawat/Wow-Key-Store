import { NextResponse } from 'next/server'
import { updateLastLogin } from '@/lib/user-service'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    await updateLastLogin(userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating last login:', error)
    return NextResponse.json({ error: 'Failed to update last login' }, { status: 500 })
  }
}
