import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

export async function GET() {
  try {
    console.log('Fetching popular games...')
    
    const gamesRef = adminDb.collection('gamesList')
    const q = gamesRef
      .where('isPopular', '==', true)
      .where('status', '==', 'active')
    
    const snapshot = await q.get()
    console.log('Popular games snapshot size:', snapshot.size)
    
    const games = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,
        categories: data.categories || [],
        isPopular: data.isPopular,
        popularOrder: data.popularOrder || 999,
        status: data.status,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      }
    })
    
    // Sort by popularOrder (ascending), then by name
    games.sort((a, b) => {
      if (a.popularOrder !== b.popularOrder) {
        return a.popularOrder - b.popularOrder
      }
      return a.name.localeCompare(b.name)
    })
    
    console.log('Returning', games.length, 'popular games')
    
    return NextResponse.json({
      success: true,
      games,
    })
  } catch (error) {
    console.error('Error fetching popular games:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch popular games',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
