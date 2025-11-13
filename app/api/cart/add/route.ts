import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'
import admin from 'firebase-admin'

export async function POST(req: Request) {
  try {
    const { userId, itemId, quantity = 1, itemType = 'game' } = await req.json()

    if (!userId || !itemId) {
      return NextResponse.json(
        { error: 'Missing userId or itemId' },
        { status: 400 }
      )
    }

    const cartRef = adminDb.collection('cart').doc(`${userId}_${itemId}`)
    const cartDoc = await cartRef.get()

    if (cartDoc.exists) {
      // Update quantity if item exists
      const currentData = cartDoc.data()
      await cartRef.update({
        quantity: (currentData?.quantity || 0) + quantity
      })
    } else {
      // Add new item to cart
      await cartRef.set({
        userId,
        itemId,
        itemType,
        gameId: itemId, // Keep for backward compatibility
        quantity,
        addedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error adding to cart:', error)
    return NextResponse.json(
      { error: 'Failed to add to cart' },
      { status: 500 }
    )
  }
}
