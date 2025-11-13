import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

/**
 * POST /api/products/[id]/view
 * Increment product view count
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    // Increment view count
    let productRef = adminDb.collection('products').doc(id)
    let productDoc = await productRef.get()

    // Try games collection if not found in products
    if (!productDoc.exists) {
      productRef = adminDb.collection('games').doc(id)
      productDoc = await productRef.get()
    }

    if (!productDoc.exists) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const currentViews = productDoc.data()?.views || 0
    await productRef.update({
      views: currentViews + 1,
      lastViewedAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      views: currentViews + 1,
    })
  } catch (error: any) {
    console.error('Error incrementing view count:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to increment view count' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/products/[id]/view
 * Get product view count
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    const productDoc = await adminDb.collection('games').doc(id).get()

    if (!productDoc.exists) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const views = productDoc.data()?.views || 0

    return NextResponse.json({ views })
  } catch (error: any) {
    console.error('Error getting view count:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get view count' },
      { status: 500 }
    )
  }
}
