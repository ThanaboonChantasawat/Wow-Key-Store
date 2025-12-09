import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const gameId = searchParams.get('gameId')
    const search = searchParams.get('search')

    let query = adminDb.collection('products').where('status', '==', 'active')

    if (gameId) {
      query = query.where('gameId', '==', gameId) as any
    }

    const snapshot = await query.get()
    
    // Fetch shop names for all products
    const shopIds = new Set<string>()
    snapshot.docs.forEach((doc: any) => {
      const shopId = doc.data().shopId
      if (shopId) shopIds.add(shopId)
    })
    
    const shopNames: { [key: string]: string } = {}
    const shopLogos: { [key: string]: string } = {}
    for (const shopId of shopIds) {
      try {
        const shopDoc = await adminDb.collection('shops').doc(shopId).get()
        if (shopDoc.exists) {
          const shopData = shopDoc.data()
          shopNames[shopId] = shopData?.shopName || 'ไม่ระบุร้านค้า'
          shopLogos[shopId] = shopData?.logoUrl || ''
        }
      } catch (err) {
        console.error(`Error fetching shop ${shopId}:`, err)
      }
    }
    
    const products = snapshot.docs.map((doc: any) => {
      const data = doc.data()
      const shopId = data.shopId || ''
      return {
        id: doc.id,
        name: data.name || '',
        description: data.description || '',
        price: data.price || 0,
        images: Array.isArray(data.images) ? data.images : [],
        gameId: data.gameId || '',
        gameName: data.gameName || '',
        shopId: shopId,
        shopName: shopNames[shopId] || data.shopName || 'ไม่ระบุร้านค้า',
        shopLogoUrl: shopLogos[shopId] || '',
        status: data.status || 'active',
        stock: data.stock || 0,
        sold: data.sold || 0,
        viewCount: data.viewCount || 0,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      }
    })

    // Client-side search filter
    let filtered = products
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = products.filter((product: any) =>
        product.name?.toLowerCase().includes(searchLower) ||
        product.gameName?.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower)
      )
    }

    // Sort by createdAt
    filtered.sort((a: any, b: any) => {
      const timeA = new Date(a.createdAt).getTime()
      const timeB = new Date(b.createdAt).getTime()
      return timeB - timeA
    })

    return NextResponse.json(filtered)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
