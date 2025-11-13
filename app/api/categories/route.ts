import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'
import { verifyIdTokenString } from '@/lib/auth-helpers'
import { FieldValue } from 'firebase-admin/firestore'

// GET - Public endpoint to get all categories
export async function GET() {
  try {
    const categoriesRef = adminDb.collection('categories')
    const snapshot = await categoriesRef.orderBy('name', 'asc').get()
    
    const categories = snapshot.docs.map((doc: any) => {
      const data = doc.data()
      return {
        id: doc.id,
        slug: doc.id,
        name: data.name || '',
        description: data.description || '',
        imageUrl: data.imageUrl || '',
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      }
    })
    
    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

// POST - Create new category (admin only)
export async function POST(request: NextRequest) {
  try {
    console.log('[Categories API] POST request received');
    
    // Verify authentication and admin role
    const authHeader = request.headers.get('authorization')
    console.log('[Categories API] Auth header present:', !!authHeader);
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[Categories API] No valid auth header');
      return NextResponse.json(
        { error: 'Unauthorized - No valid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    console.log('[Categories API] Verifying token...');
    
    const decodedToken = await verifyIdTokenString(token)
    
    if (!decodedToken) {
      console.error('[Categories API] Token verification failed');
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }
    
    console.log('[Categories API] Token verified for user:', decodedToken.uid);
    
    // Check if user is admin
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get()
    const userData = userDoc.data()
    console.log('[Categories API] User role:', userData?.role);
    
    if (!userData || !['admin', 'superadmin'].includes(userData.role)) {
      console.error('[Categories API] User is not admin. Role:', userData?.role);
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    const { name, description, slug } = await request.json()
    console.log('[Categories API] Creating category:', { name, slug });

    if (!name || !slug) {
      console.error('[Categories API] Missing required fields');
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      )
    }

    // Check if category with this slug already exists
    const categoryRef = adminDb.collection('categories').doc(slug)
    const existingDoc = await categoryRef.get()
    
    if (existingDoc.exists) {
      console.error('[Categories API] Category already exists:', slug);
      return NextResponse.json(
        { error: `Category with slug "${slug}" already exists` },
        { status: 409 }
      )
    }

    // Create new category
    await categoryRef.set({
      name,
      description: description || '',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    })

    console.log('[Categories API] Category created successfully:', slug);
    return NextResponse.json({ 
      success: true, 
      slug,
      message: 'Category created successfully' 
    })
  } catch (error) {
    console.error('[Categories API] Error creating category:', error);
    if (error instanceof Error) {
      console.error('[Categories API] Error message:', error.message);
      console.error('[Categories API] Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create category' },
      { status: 500 }
    )
  }
}

// PATCH - Update category (admin only)
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

    const { slug, name, description } = await request.json()

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      )
    }

    const categoryRef = adminDb.collection('categories').doc(slug)
    const categoryDoc = await categoryRef.get()
    
    if (!categoryDoc.exists) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // Update category
    const updateData: any = {
      updatedAt: FieldValue.serverTimestamp()
    }
    
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description

    await categoryRef.update(updateData)

    return NextResponse.json({ 
      success: true,
      message: 'Category updated successfully' 
    })
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    )
  }
}

// DELETE - Delete category (admin only)
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
    const slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      )
    }

    const categoryRef = adminDb.collection('categories').doc(slug)
    const categoryDoc = await categoryRef.get()
    
    if (!categoryDoc.exists) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    await categoryRef.delete()

    return NextResponse.json({ 
      success: true,
      message: 'Category deleted successfully' 
    })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    )
  }
}
