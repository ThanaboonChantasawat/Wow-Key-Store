import { NextRequest, NextResponse } from 'next/server'
import { getSliderImages, uploadSliderImage, updateSliderImage, deleteSliderImage } from '@/lib/slider-service'
import { verifyAdmin } from '@/lib/auth-helpers'

// GET - Get all slider images
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') !== 'false'

    const images = await getSliderImages(activeOnly)

    return NextResponse.json({ images })
  } catch (error: any) {
    console.error('❌ Error fetching slider images:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch slider images' },
      { status: 500 }
    )
  }
}

// POST - Upload new slider image (Admin only)
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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const order = parseInt(formData.get('order') as string) || 0

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 50MB' },
        { status: 400 }
      )
    }

    const image = await uploadSliderImage(file, order)

    return NextResponse.json({ 
      message: 'Slider image uploaded successfully',
      image 
    })
  } catch (error: any) {
    console.error('❌ Error uploading slider image:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload slider image' },
      { status: 500 }
    )
  }
}

// PUT - Update slider image (Admin only)
export async function PUT(request: NextRequest) {
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
    const { id, updates } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      )
    }

    await updateSliderImage(id, updates)

    return NextResponse.json({ 
      message: 'Slider image updated successfully'
    })
  } catch (error: any) {
    console.error('❌ Error updating slider image:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update slider image' },
      { status: 500 }
    )
  }
}

// DELETE - Delete slider image (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    // Verify admin
    const user = await verifyAdmin(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const url = searchParams.get('url')

    if (!id || !url) {
      return NextResponse.json(
        { error: 'Image ID and URL are required' },
        { status: 400 }
      )
    }

    await deleteSliderImage(id, url)

    return NextResponse.json({ 
      message: 'Slider image deleted successfully'
    })
  } catch (error: any) {
    console.error('❌ Error deleting slider image:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete slider image' },
      { status: 500 }
    )
  }
}
