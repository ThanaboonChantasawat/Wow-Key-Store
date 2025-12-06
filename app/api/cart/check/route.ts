import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const itemId = searchParams.get('itemId')

    if (!userId || !itemId) {
      return NextResponse.json(
        { error: 'Missing userId or itemId' },
        { status: 400 }
      )
    }

    const cartRef = adminDb.collection('cart').doc(`${userId}_${itemId}`)
    const cartDoc = await cartRef.get()

    return NextResponse.json({ 
      inCart: cartDoc.exists,
      quantity: cartDoc.exists ? cartDoc.data()?.quantity || 1 : 0
    })
  } catch (error) {
    console.error('Error checking cart:', error)
    return NextResponse.json({ inCart: false })
  }
}
