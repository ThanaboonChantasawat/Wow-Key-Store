import { NextRequest, NextResponse } from 'next/server'
import { reorderSliderImages } from '@/lib/slider-service'
import { verifyAdmin } from '@/lib/auth-helpers'

// POST - Reorder slider images (Admin only)
export async function POST(request: NextRequest) {
  try {
    // Verify admin
    const user = await verifyAdmin(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { imageIds } = body

    if (!imageIds || !Array.isArray(imageIds)) {
      return NextResponse.json(
        { error: 'Invalid image IDs array' },
        { status: 400 }
      )
    }

    await reorderSliderImages(imageIds)

    return NextResponse.json({ 
      message: 'Slider images reordered successfully'
    })
  } catch (error: any) {
    console.error('❌ Error reordering slider images:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reorder slider images' },
      { status: 500 }
    )
  }
}
