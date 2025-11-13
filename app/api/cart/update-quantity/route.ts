import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

export async function POST(req: Request) {
  try {
    const { userId, itemId, quantity } = await req.json()

    if (!userId || !itemId || quantity === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (quantity <= 0) {
      // Remove item if quantity is 0 or less
      const cartRef = adminDb.collection('cart').doc(`${userId}_${itemId}`)
      await cartRef.delete()
    } else {
      const cartRef = adminDb.collection('cart').doc(`${userId}_${itemId}`)
      await cartRef.update({ quantity })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating cart quantity:', error)
    return NextResponse.json(
      { error: 'Failed to update cart quantity' },
      { status: 500 }
    )
  }
}
