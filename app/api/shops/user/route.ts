import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

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

    console.log('Fetching shop for user:', userId)

    // Try to get shop by document ID first (shop_userId)
    const shopId = `shop_${userId}`
    const shopDocRef = adminDb.collection('shops').doc(shopId)
    const shopDocSnap = await shopDocRef.get()
    
    if (shopDocSnap.exists) {
      console.log('Found shop by ID:', shopId, 'data:', shopDocSnap.data())
      
      const shop = {
        id: shopDocSnap.id,
        ...shopDocSnap.data(),
        createdAt: shopDocSnap.data()?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: shopDocSnap.data()?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      }
      
      return NextResponse.json({
        success: true,
        shop,
      })
    }
    
    // Fallback: Try to find by ownerId field
    const q = adminDb.collection('shops').where('ownerId', '==', userId).limit(1)
    
    const querySnapshot = await q.get()
    
    console.log('Shop query by ownerId - empty:', querySnapshot.empty, 'size:', querySnapshot.size)
    
    if (querySnapshot.empty) {
      console.log('No shop found in Firestore for userId:', userId)
      return NextResponse.json({
        success: true,
        shop: null,
      })
    }

    const shopDoc = querySnapshot.docs[0]
    console.log('Found shop by ownerId:', shopDoc.id, 'data:', shopDoc.data())
    
    const shop = {
      id: shopDoc.id,
      ...shopDoc.data(),
      createdAt: shopDoc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: shopDoc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    }

    console.log('Returning shop:', shop)

    return NextResponse.json({
      success: true,
      shop,
    })
  } catch (error) {
    console.error('Error fetching shop:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shop' },
      { status: 500 }
    )
  }
}
