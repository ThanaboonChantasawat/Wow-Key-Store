import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'
import { verifyIdTokenString } from '@/lib/auth-helpers'
import { FieldValue } from 'firebase-admin/firestore'

// GET - Public endpoint to get all games
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get('categoryId')

    const gamesRef = adminDb.collection('gamesList')
    let q = gamesRef
    
    if (categoryId) {
      q = gamesRef.where('categories', 'array-contains', categoryId) as any
    }

    const snapshot = await q.get()
    
    const games = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate().toISOString(),
      updatedAt: doc.data().updatedAt?.toDate().toISOString()
    }))

    // Sort by name
    games.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''))

    return NextResponse.json(games)
  } catch (error) {
    console.error('Error fetching games:', error)
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    )
  }
}

// POST - Create new game (admin only)
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

    const { name, description, imageUrl, categories, isPopular, status } = await request.json()

    if (!name || !imageUrl) {
      return NextResponse.json(
        { error: 'Name and imageUrl are required' },
        { status: 400 }
      )
    }

    // Create new game
    const gameRef = adminDb.collection('gamesList').doc()
    const gameId = gameRef.id

    await gameRef.set({
      id: gameId,
      name,
      description: description || '',
      imageUrl,
      categories: categories || [],
      isPopular: isPopular || false,
      status: status || 'active',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    })

    return NextResponse.json({ 
      success: true, 
      id: gameId,
      message: 'Game created successfully' 
    })
  } catch (error) {
    console.error('Error creating game:', error)
    return NextResponse.json(
      { error: 'Failed to create game' },
      { status: 500 }
    )
  }
}

// PATCH - Update game (admin only)
export async function PATCH(request: NextRequest) {
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

    const { id, ...updateData } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Game ID is required' },
        { status: 400 }
      )
    }

    const gameRef = adminDb.collection('gamesList').doc(id)
    const gameDoc = await gameRef.get()
    
    if (!gameDoc.exists) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }

    // Update game
    await gameRef.update({
      ...updateData,
      updatedAt: FieldValue.serverTimestamp()
    })

    return NextResponse.json({ 
      success: true,
      message: 'Game updated successfully' 
    })
  } catch (error) {
    console.error('Error updating game:', error)
    return NextResponse.json(
      { error: 'Failed to update game' },
      { status: 500 }
    )
  }
}

// DELETE - Delete game (admin only)
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Game ID is required' },
        { status: 400 }
      )
    }

    const gameRef = adminDb.collection('gamesList').doc(id)
    const gameDoc = await gameRef.get()
    
    if (!gameDoc.exists) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }

    await gameRef.delete()

    return NextResponse.json({ 
      success: true,
      message: 'Game deleted successfully' 
    })
  } catch (error) {
    console.error('Error deleting game:', error)
    return NextResponse.json(
      { error: 'Failed to delete game' },
      { status: 500 }
    )
  }
}
