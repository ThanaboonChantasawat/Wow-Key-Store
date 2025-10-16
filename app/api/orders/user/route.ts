import { NextRequest, NextResponse } from 'next/server'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/components/firebase-config'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    console.log('Fetching orders for user:', userId)

    // Get orders from Firestore
    const ordersRef = collection(db, 'orders')
    const q = query(
      ordersRef,
      where('userId', '==', userId)
      // Note: orderBy requires a composite index in Firestore
      // To enable ordering, create the index at Firebase Console
      // For now, we'll sort in JavaScript
    )
    
    const querySnapshot = await getDocs(q)
    
    const orders = querySnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        gameCodeDeliveredAt: data.gameCodeDeliveredAt?.toDate?.()?.toISOString() || null,
      }
    })
    
    // Sort in JavaScript instead of Firestore
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    console.log(`Found ${orders.length} orders`)

    return NextResponse.json({
      success: true,
      orders,
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
