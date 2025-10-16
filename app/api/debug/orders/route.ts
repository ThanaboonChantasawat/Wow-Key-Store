import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/components/firebase-config'
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')

    if (!shopId) {
      return NextResponse.json(
        { error: 'Shop ID is required' },
        { status: 400 }
      )
    }

    console.log('🔍 Fetching orders for shop:', shopId)

    const ordersRef = collection(db, 'orders')
    const q = query(
      ordersRef, 
      where('shopId', '==', shopId),
      orderBy('createdAt', 'desc'),
      limit(10)
    )
    
    const snapshot = await getDocs(q)
    console.log('📦 Found orders:', snapshot.size)

    const orders = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        // แสดงเฉพาะ fields ที่สำคัญ
        shopId: data.shopId,
        shopName: data.shopName,
        totalAmount: data.totalAmount,
        paymentIntentId: data.paymentIntentId,
        payment_intent: data.payment_intent, // ลองดูทั้ง 2 แบบ
        chargeId: data.chargeId,
        createdAt: data.createdAt,
        items: data.items?.map((item: any) => ({
          name: item.name || item.productName,
          price: item.price
        }))
      }
    })

    console.log('📋 Orders:', JSON.stringify(orders, null, 2))

    return NextResponse.json({ orders, count: orders.length })

  } catch (error: any) {
    console.error('❌ Error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
