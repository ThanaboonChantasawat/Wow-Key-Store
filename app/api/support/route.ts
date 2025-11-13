import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, subject, category, message, userId } = body

    // Validation
    if (!name || !email || !subject || !category || !message) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'รูปแบบอีเมลไม่ถูกต้อง' },
        { status: 400 }
      )
    }

    // Create support message document
    const supportMessage = {
      name,
      email,
      subject,
      category,
      message,
      userId: userId || null,
      status: 'pending', // pending, in-progress, resolved, closed
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      repliedAt: null,
      repliedBy: null,
      adminNotes: null,
    }

    // Save to Firestore
    const docRef = await adminDb.collection('supportMessages').add(supportMessage)

    console.log('✅ Support message created:', docRef.id)

    // TODO: Send email notification to admin (optional)
    // You can integrate with email service here

    return NextResponse.json(
      {
        success: true,
        message: 'ส่งข้อความสำเร็จ ทีมงานจะติดต่อกลับโดยเร็วที่สุด',
        id: docRef.id,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('❌ Error creating support message:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการส่งข้อความ กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch support messages (for admin dashboard)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '100')

    // Strategy: Fetch all and filter in-memory to avoid composite index requirement
    // For production with large datasets, create the composite index using the Firebase Console link
    
    let snapshot
    
    if (userId) {
      // If filtering by userId, use that as primary query
      snapshot = await adminDb.collection('supportMessages')
        .where('userId', '==', userId)
        .get()
    } else if (status) {
      // If filtering by status, use that as primary query
      snapshot = await adminDb.collection('supportMessages')
        .where('status', '==', status)
        .get()
    } else {
      // No filter, get all (limited)
      snapshot = await adminDb.collection('supportMessages')
        .limit(limit)
        .get()
    }

    let messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))

    // Sort by createdAt in memory
    messages.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return dateB - dateA // descending order (newest first)
    })

    // Apply limit after sorting
    messages = messages.slice(0, limit)

    return NextResponse.json({ messages }, { status: 200 })
  } catch (error) {
    console.error('❌ Error fetching support messages:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    )
  }
}
