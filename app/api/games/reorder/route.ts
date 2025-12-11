import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'
import { verifyIdTokenString } from '@/lib/auth-helpers'
import { logActivity } from '@/lib/admin-activity-service'
import { FieldValue } from 'firebase-admin/firestore'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication and admin role
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decodedToken = await verifyIdTokenString(token)
    
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }
    
    // Check if user is admin
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get()
    const userData = userDoc.data()
    
    if (!userData || !['admin', 'superadmin'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    const { gameIds } = await request.json()

    if (!Array.isArray(gameIds)) {
      return NextResponse.json(
        { error: 'Invalid data format' },
        { status: 400 }
      )
    }

    const batch = adminDb.batch()

    gameIds.forEach((id: string, index: number) => {
      const gameRef = adminDb.collection('gamesList').doc(id)
      batch.update(gameRef, { 
        popularOrder: index + 1,
        updatedAt: FieldValue.serverTimestamp()
      })
    })

    await batch.commit()

    // 📝 Log admin activity
    try {
      await logActivity(
        decodedToken.uid,
        'reorder_popular_games',
        `Reordered ${gameIds.length} popular games`,
        { gameCount: gameIds.length, gameIds, targetType: 'game' }
      );
    } catch (logError) {
      console.error("Error logging admin activity:", logError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Games reordered successfully' 
    })
  } catch (error) {
    console.error('Error reordering games:', error)
    return NextResponse.json(
      { error: 'Failed to reorder games' },
      { status: 500 }
    )
  }
}
