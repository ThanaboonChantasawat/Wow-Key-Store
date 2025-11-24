import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      )
    }

    const cartQuery = adminDb.collection('cart').where('userId', '==', userId)
    const querySnapshot = await cartQuery.get()

    // Count number of items (documents), not quantities
    const totalCount = querySnapshot.size

    return NextResponse.json({ count: totalCount })
  } catch (error) {
    console.error('Error getting cart count:', error)
    return NextResponse.json({ count: 0 })
  }
}
