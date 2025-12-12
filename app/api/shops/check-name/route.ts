import { NextRequest, NextResponse } from 'next/server'
import { checkShopNameExists } from '@/lib/shop-service'

/**
 * GET /api/shops/check-name?name=ชื่อร้าน
 * ตรวจสอบว่าชื่อร้านค้าซ้ำหรือไม่ (รองรับการส่งรหัสร้านค้าที่ต้องการยกเว้นสำหรับกรณีแก้ไข)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name')
    const excludeShopId = searchParams.get('excludeShopId')

    if (!name) {
      return NextResponse.json(
        { error: 'กรุณาระบุชื่อร้านค้า' },
        { status: 400 }
      )
    }

    const exists = await checkShopNameExists(name, excludeShopId || undefined)

    return NextResponse.json({ 
      exists,
      message: exists ? 'ชื่อร้านค้านี้ถูกใช้งานแล้ว' : 'ชื่อร้านค้าพร้อมใช้งาน'
    })
  } catch (error: any) {
    console.error('เกิดข้อผิดพลาดในการตรวจสอบชื่อร้านค้า:', error)
    return NextResponse.json(
      { error: error.message || 'ไม่สามารถตรวจสอบชื่อร้านค้าได้' },
      { status: 500 }
    )
  }
}
