import { NextRequest, NextResponse } from 'next/server'
import { 
  createShopReview, 
  createProductReview,
  getShopReviews,
  getProductReviews,
  getShopReviewStats,
  getProductReviewStats,
  updateReview,
  deleteReview,
  getUserOrderReviews
} from '@/lib/review-service'
import { verifyIdToken } from '@/lib/auth-helpers'
import { createNotification } from '@/lib/notification-service'
import { adminDb } from '@/lib/firebase-admin-config'

// Bad words filter
const BAD_WORDS = [
  'ควย', 'สัส', 'เหี้ย', 'เย็ด', 'หี', 'ส้นตีน', 'ไอ้สัตว์', 'ไอ้เวร', 
  'แม่ง', 'กาก', 'ไอ้ควาย', 'ไอ้หมา', 'ไอ้เลว', 'ไอ้ห่า', 'มึง', 'กู',
  'fuck', 'shit', 'damn', 'bitch', 'ass', 'bastard'
]

function containsBadWords(text: string): boolean {
  const lowerText = text.toLowerCase()
  return BAD_WORDS.some(word => lowerText.includes(word))
}

function censorBadWords(text: string): string {
  let censored = text
  BAD_WORDS.forEach(word => {
    const regex = new RegExp(word, 'gi')
    censored = censored.replace(regex, '*'.repeat(word.length))
  })
  return censored
}

/**
 * GET /api/reviews
 * Get reviews for a shop or product
 * Query params: shopId or productId, limit (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')
    const forUser = searchParams.get('forUser') === 'true'
    const shopId = searchParams.get('shopId')
    const productId = searchParams.get('productId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const statsOnly = searchParams.get('statsOnly') === 'true'

    // Special mode: get current user's reviews for a specific order
    if (orderId && forUser) {
      const token = await verifyIdToken(request)
      if (!token) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      const userId = token.uid
      // Pass productId to filter product reviews
      const reviews = await getUserOrderReviews(userId, orderId, productId || undefined)
      return NextResponse.json(reviews)
    }
    
    if (shopId) {
      if (statsOnly) {
        const stats = await getShopReviewStats(shopId)
        return NextResponse.json({ stats })
      } else {
        const reviews = await getShopReviews(shopId, limit)
        const stats = await getShopReviewStats(shopId)
        return NextResponse.json({ reviews, stats })
      }
    } else if (productId) {
      if (statsOnly) {
        const stats = await getProductReviewStats(productId)
        return NextResponse.json({ stats })
      } else {
        const reviews = await getProductReviews(productId, limit)
        const stats = await getProductReviewStats(productId)
        return NextResponse.json({ reviews, stats })
      }
    } else {
      return NextResponse.json(
        { error: 'Either shopId or productId is required' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Error getting reviews:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get reviews' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/reviews
 * Create a new review (shop or product)
 * Body: { type, shopId?, productId?, shopName?, productName?, orderId, rating, text, images? }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = await verifyIdToken(request)
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const userId = token.uid
    const body = await request.json()
    const { 
      type, // 'shop' or 'product'
      shopId,
      shopName,
      productId,
      productName,
      orderId,
      rating,
      text,
      images
    } = body
    
    // Validate required fields
    if (!type || !orderId || !rating) {
      return NextResponse.json(
        { error: 'Missing required fields: type, orderId, rating' },
        { status: 400 }
      )
    }
    
    // Validate rating
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }
    
    // Validate type-specific fields
    if (type === 'shop' && (!shopId || !shopName)) {
      return NextResponse.json(
        { error: 'shopId and shopName are required for shop reviews' },
        { status: 400 }
      )
    }
    
    if (type === 'product' && (!productId || !productName || !shopId || !shopName)) {
      return NextResponse.json(
        { error: 'productId, productName, shopId, and shopName are required for product reviews' },
        { status: 400 }
      )
    }
    
    // Get user data for review
    const userName = token.name || 'Anonymous'
    const userPhotoURL = token.picture || null
    
    // Check and censor bad words
    const hasBadWords = containsBadWords(text)
    const finalText = hasBadWords ? censorBadWords(text) : text
    
    let reviewId: string
    let shopOwnerId: string | null = null
    
    if (type === 'shop') {
      if (!shopId || !shopName) {
        return NextResponse.json(
          { error: 'shopId and shopName are required for shop reviews' },
          { status: 400 }
        )
      }
      
      // Get shop owner ID for notification
      const shopDoc = await adminDb.collection('shops').doc(shopId).get()
      if (shopDoc.exists) {
        shopOwnerId = shopDoc.data()?.ownerId || null
      }
      
      reviewId = await createShopReview(
        userId,
        userName,
        userPhotoURL,
        shopId,
        shopName,
        orderId,
        rating,
        finalText,
        images,
        text // Save original text for admin
      )
      
      // Send notification to shop owner
      if (shopOwnerId && shopOwnerId !== userId) {
        await createNotification(
          shopOwnerId,
          'review',
          `⭐ รีวิวใหม่จากร้าน ${shopName}`,
          `${userName} ให้คะแนน ${rating} ดาว: ${finalText.substring(0, 100)}${finalText.length > 100 ? '...' : ''}`,
          `/sellerprofile/${shopId}`
        )
      }
    } else if (type === 'product') {
      if (!productId || !productName || !shopId || !shopName) {
        return NextResponse.json(
          { error: 'productId, productName, shopId, and shopName are required for product reviews' },
          { status: 400 }
        )
      }
      
      // Get shop owner ID for notification
      const shopDoc = await adminDb.collection('shops').doc(shopId).get()
      if (shopDoc.exists) {
        shopOwnerId = shopDoc.data()?.ownerId || null
      }
      
      reviewId = await createProductReview(
        userId,
        userName,
        userPhotoURL,
        productId,
        productName,
        shopId,
        shopName,
        orderId,
        rating,
        finalText,
        images,
        text // Save original text for admin
      )
      
      // Send notification to shop owner
      if (shopOwnerId && shopOwnerId !== userId) {
        await createNotification(
          shopOwnerId,
          'review',
          `⭐ รีวิวสินค้าใหม่: ${productName}`,
          `${userName} ให้คะแนน ${rating} ดาว: ${finalText.substring(0, 100)}${finalText.length > 100 ? '...' : ''}`,
          `/products/${productId}`
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Must be "shop" or "product"' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({
      success: true,
      reviewId,
      message: 'Review created successfully',
      warning: hasBadWords ? 'คำหยาบบางคำถูกกรองออก' : undefined
    })
  } catch (error: any) {
    console.error('Error creating review:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create review' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/reviews
 * Update a review
 * Body: { reviewId, type, rating?, text?, images? }
 */
export async function PATCH(request: NextRequest) {
  try {
    // Verify authentication
    const token = await verifyIdToken(request)
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const userId = token.uid
    const body = await request.json()
    const { reviewId, type, rating, text, images } = body
    
    if (!reviewId || !type) {
      return NextResponse.json(
        { error: 'reviewId and type are required' },
        { status: 400 }
      )
    }
    
    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }
    
    await updateReview(reviewId, userId, type, { rating, text, images })
    
    return NextResponse.json({
      success: true,
      message: 'Review updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating review:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update review' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/reviews
 * Delete a review
 * Body: { reviewId, type }
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const token = await verifyIdToken(request)
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const userId = token.uid
    const body = await request.json()
    const { reviewId, type } = body
    
    if (!reviewId || !type) {
      return NextResponse.json(
        { error: 'reviewId and type are required' },
        { status: 400 }
      )
    }
    
    await deleteReview(reviewId, userId, type)
    
    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting review:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete review' },
      { status: 500 }
    )
  }
}
