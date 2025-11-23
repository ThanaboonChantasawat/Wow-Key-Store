import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    const productRef = adminDb.collection('products').doc(id)
    const productDoc = await productRef.get()

    if (!productDoc.exists) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const data = productDoc.data()
    if (!data) {
      return NextResponse.json(
        { error: 'Product data is empty' },
        { status: 404 }
      )
    }

    // If shopName is missing but shopId exists, fetch it
    let shopName = data.shopName || ''
    if (!shopName && data.shopId) {
      try {
        const shopDoc = await adminDb.collection('shops').doc(data.shopId).get()
        if (shopDoc.exists) {
          shopName = shopDoc.data()?.shopName || ''
        }
      } catch (err) {
        console.error('Error fetching shop name:', err)
      }
    }

    const product = {
      id: productDoc.id,
      name: data.name || '',
      description: data.description || '',
      price: data.price || 0,
      images: Array.isArray(data.images) ? data.images : [],
      gameId: data.gameId || '',
      shopId: data.shopId || '',
      shopName: shopName,
      status: data.status || 'active',
      stock: data.stock || 0,
      sold: data.sold || 0,
      viewCount: data.viewCount || 0,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}
