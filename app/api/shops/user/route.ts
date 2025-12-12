import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'กรุณาระบุข้อมูลผู้ใช้' },
        { status: 400 }
      )
    }

    // พยายามดึงร้านค้าจากเอกสารที่อ้างอิงผู้ใช้ก่อน
    const shopId = `shop_${userId}`
    const shopDocRef = adminDb.collection('shops').doc(shopId)
    const shopDocSnap = await shopDocRef.get()
    
    if (shopDocSnap.exists) {
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
    
    if (querySnapshot.empty) {
      return NextResponse.json({
        success: true,
        shop: null,
      })
    }

    const shopDoc = querySnapshot.docs[0]
    
    const shop = {
      id: shopDoc.id,
      ...shopDoc.data(),
      createdAt: shopDoc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: shopDoc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      shop,
    })
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการดึงข้อมูลร้านค้า:', error)
    return NextResponse.json(
      { error: 'ไม่สามารถดึงข้อมูลร้านค้าได้' },
      { status: 500 }
    )
  }
}
