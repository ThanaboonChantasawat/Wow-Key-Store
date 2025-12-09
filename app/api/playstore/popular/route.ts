import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'
import { verifyIdTokenString } from '@/lib/auth-helpers'
import { getPopularPlayStoreGames } from '@/lib/playstore-service'

export async function GET(request: NextRequest) {
  try {
    // Require admin auth
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      )
    }

    const token = authHeader.substring(7)
    const decodedToken = await verifyIdTokenString(token)

    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 },
      )
    }

    // Check admin role
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get()
    const userData = userDoc.data()

    if (!userData || !['admin', 'superadmin'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 },
      )
    }

    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? Number(limitParam) : 100

    const games = await getPopularPlayStoreGames(limit)

    return NextResponse.json({ success: true, games })
  } catch (error) {
    console.error('❌ Error fetching Play Store popular games:', error)
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch Play Store popular games',
        details: errorMessage,
      },
      { status: 500 },
    )
  }
}
