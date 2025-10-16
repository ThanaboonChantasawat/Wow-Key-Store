import { NextRequest, NextResponse } from 'next/server'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/components/firebase-config'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const status = searchParams.get('status') // 'all', 'pending', 'processing', 'completed', 'cancelled'

    if (!shopId) {
      return NextResponse.json(
        { error: 'Shop ID is required' },
        { status: 400 }
      )
    }

    console.log('Fetching orders for shop:', shopId, 'status:', status)

    // Get orders from Firestore
    const ordersRef = collection(db, 'orders')
    let q = query(ordersRef, where('shopId', '==', shopId))
    
    // Add status filter if not 'all'
    if (status && status !== 'all') {
      q = query(ordersRef, where('shopId', '==', shopId), where('status', '==', status))
    }
    
    const querySnapshot = await getDocs(q)
    
    const orders = querySnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        // Ensure numeric fields are numbers
        totalAmount: Number(data.totalAmount) || 0,
        platformFee: Number(data.platformFee) || 0,
        sellerAmount: Number(data.sellerAmount) || 0,
        items: (data.items || []).map((item: any) => ({
          ...item,
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1,
        })),
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        gameCodeDeliveredAt: data.gameCodeDeliveredAt?.toDate?.()?.toISOString() || null,
      }
    })
    
    // Sort by creation date (newest first)
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    console.log(`Found ${orders.length} orders for shop ${shopId}`)
    if (orders.length > 0) {
      console.log('Sample order:', orders[0])
    }

    return NextResponse.json({
      success: true,
      orders,
    })
  } catch (error) {
    console.error('Error fetching seller orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
