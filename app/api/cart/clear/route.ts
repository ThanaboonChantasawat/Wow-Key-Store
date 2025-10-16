import { NextRequest, NextResponse } from 'next/server'
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { db } from '@/components/firebase-config'

export async function POST(request: NextRequest) {
  try {
    const { userId, itemIds } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    if (!itemIds || !Array.isArray(itemIds)) {
      return NextResponse.json(
        { error: 'Item IDs array is required' },
        { status: 400 }
      )
    }

    // Remove each item from cart
    for (const itemId of itemIds) {
      const cartItemId = `${userId}_${itemId}`
      await deleteDoc(doc(db, 'cart', cartItemId))
    }

    return NextResponse.json({
      success: true,
      message: `Removed ${itemIds.length} items from cart`,
    })
  } catch (error) {
    console.error('Error clearing cart:', error)
    return NextResponse.json(
      { error: 'Failed to clear cart items' },
      { status: 500 }
    )
  }
}
