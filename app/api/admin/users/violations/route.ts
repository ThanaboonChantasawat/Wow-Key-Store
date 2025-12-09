import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'
import { verifyIdTokenString } from '@/lib/auth-helpers'

/**
 * GET /api/admin/users/violations?userId=xxx
 * Get user violation history (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Get authorization token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = await verifyIdTokenString(authHeader.substring(7))
    const userRole = token.role || 'buyer'

    // Check admin permission
    if (!['admin', 'superadmin'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Get user data
    const userDoc = await adminDb.collection('users').doc(userId).get()
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userData = userDoc.data()!

    // Get all reports related to this user
    const reportsSnapshot = await adminDb
      .collection('reports')
      .where('targetUserId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get()

    const reports = reportsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    }))

    return NextResponse.json({
      user: {
        id: userId,
        name: userData.name || 'Unknown',
        email: userData.email || '',
        banned: userData.banned || false,
        bannedUntil: userData.bannedUntil?.toDate?.()?.toISOString() || null,
        bannedReason: userData.bannedReason || '',
        violations: userData.violations || 0,
        lastViolation: userData.lastViolation?.toDate?.()?.toISOString() || null,
      },
      reports,
    })
  } catch (error: any) {
    console.error('Error fetching user violations:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user violations' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/users/violations
 * Ban or unban a user (admin only)
 * Body: { userId, action: 'ban' | 'unban', duration?, reason? }
 */
export async function PATCH(request: NextRequest) {
  try {
    // Get authorization token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = await verifyIdTokenString(authHeader.substring(7))
    const adminId = token.uid
    const userRole = token.role || 'buyer'

    // Check admin permission
    if (!['admin', 'superadmin'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, action, duration, reason } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    if (!action || !['ban', 'unban'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "ban" or "unban"' },
        { status: 400 }
      )
    }

    // Get user
    const userDoc = await adminDb.collection('users').doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userData = userDoc.data()!

    if (action === 'ban') {
      if (!reason) {
        return NextResponse.json({ error: 'reason is required for ban' }, { status: 400 })
      }

      const banDuration = duration || 7 // Default 7 days
      const bannedUntil = new Date()
      bannedUntil.setDate(bannedUntil.getDate() + banDuration)

      const currentViolations = userData.violations || 0

      await adminDb.collection('users').doc(userId).update({
        accountStatus: 'banned', // ✅ เพิ่มการตั้ง accountStatus
        banned: true,
        bannedUntil: bannedUntil,
        bannedReason: reason,
        bannedBy: adminId,
        violations: currentViolations + 1,
        lastViolation: new Date(),
      })

      return NextResponse.json({
        success: true,
        message: `แบนผู้ใช้เป็นเวลา ${banDuration} วันเรียบร้อยแล้ว`,
      })
    } else {
      // Unban
      await adminDb.collection('users').doc(userId).update({
        accountStatus: 'active', // ✅ เพิ่มการตั้ง accountStatus กลับเป็น active
        banned: false,
        bannedUntil: null,
        bannedReason: '',
        bannedBy: null,
      })

      return NextResponse.json({
        success: true,
        message: 'ยกเลิกการแบนเรียบร้อยแล้ว',
      })
    }
  } catch (error: any) {
    console.error('Error updating user ban status:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update ban status' },
      { status: 500 }
    )
  }
}
