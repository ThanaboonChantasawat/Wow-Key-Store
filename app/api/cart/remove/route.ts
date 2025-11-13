import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

export async function POST(req: Request) {
  try {
    const { userId, itemId } = await req.json()

    if (!userId || !itemId) {
      return NextResponse.json(
        { error: 'Missing userId or itemId' },
        { status: 400 }
      )
    }

    const cartRef = adminDb.collection('cart').doc(`${userId}_${itemId}`)
    await cartRef.delete()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing from cart:', error)
    return NextResponse.json(
      { error: 'Failed to remove from cart' },
      { status: 500 }
    )
  }
}
