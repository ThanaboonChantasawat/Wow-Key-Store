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

    const items = querySnapshot.docs.map((doc: any) => doc.data().itemId || doc.data().gameId)

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Error getting user cart:', error)
    return NextResponse.json({ items: [] })
  }
}
