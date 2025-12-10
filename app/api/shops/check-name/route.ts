import { NextRequest, NextResponse } from 'next/server'
import { checkShopNameExists } from '@/lib/shop-service'

/**
 * GET /api/shops/check-name?name=ชื่อร้าน&excludeShopId=shop_xxx
 * ตรวจสอบว่าชื่อร้านค้าซ้ำหรือไม่
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name')
    const excludeShopId = searchParams.get('excludeShopId')

    if (!name) {
      return NextResponse.json(
        { error: 'Shop name is required' },
        { status: 400 }
      )
    }

    const exists = await checkShopNameExists(name, excludeShopId || undefined)

    return NextResponse.json({ 
      exists,
      message: exists ? 'ชื่อร้านค้านี้ถูกใช้งานแล้ว' : 'ชื่อร้านค้าพร้อมใช้งาน'
    })
  } catch (error: any) {
    console.error('Error checking shop name:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check shop name' },
      { status: 500 }
    )
  }
}
