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
    const products = snapshot.docs.map((doc: any) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
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
