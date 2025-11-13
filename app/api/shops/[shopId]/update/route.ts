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
      return NextResponse.json({ error: 'Missing shopId' }, { status: 400 })
    }

    if (!shopData) {
      return NextResponse.json({ error: 'Missing shopData' }, { status: 400 })
    }

    await updateShop(shopId, shopData)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating shop:', error)
    return NextResponse.json(
      { error: 'Failed to update shop' },
      { status: 500 }
    )
  }
}
