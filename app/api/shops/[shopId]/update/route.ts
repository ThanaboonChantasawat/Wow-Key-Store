import { NextResponse } from 'next/server'
import { updateShop } from '@/lib/shop-service'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { shopId } = await params
    const body = await req.json()
    const { shopData } = body

    if (!shopId) {
      return NextResponse.json({ error: 'กรุณาระบุร้านค้าที่ต้องการแก้ไข' }, { status: 400 })
    }

    if (!shopData) {
      return NextResponse.json({ error: 'กรุณาระบุข้อมูลร้านค้าที่ต้องการแก้ไข' }, { status: 400 })
    }

    await updateShop(shopId, shopData)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการอัปเดตร้านค้า:', error)
    return NextResponse.json(
      { error: 'ไม่สามารถอัปเดตร้านค้าได้' },
      { status: 500 }
    )
  }
}
