import { NextRequest, NextResponse } from 'next/server'
import { 
  createShopComment,
  createProductComment,
  getShopComments,
  getProductComments,
  updateComment,
  deleteComment
} from '@/lib/comment-service'
import { verifyIdToken, checkUserBanStatus } from '@/lib/auth-helpers'
import { createNotification } from '@/lib/notification-service'
import { adminDb } from '@/lib/firebase-admin-config'

// Bad words filter (same as reviews)
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
 * GET /api/comments
 * Get comments for a shop or product
 * Query params: shopId or productId, limit (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const productId = searchParams.get('productId')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    if (shopId) {
      const comments = await getShopComments(shopId, limit)
      return NextResponse.json({ comments })
    } else if (productId) {
      const comments = await getProductComments(productId, limit)
      return NextResponse.json({ comments })
    } else {
      return NextResponse.json(
        { error: 'Either shopId or productId is required' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Error getting comments:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get comments' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/comments
 * Create a new comment (shop or product)
 * Body: { type, shopId?, productId?, shopName?, productName?, text, images?, parentId? }
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
    
    // ✅ Check if user is banned
    const banError = await checkUserBanStatus(userId)
    if (banError) {
      return NextResponse.json(
        { error: banError },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    const { 
      type, // 'shop' or 'product'
      shopId,
      shopName,
      productId,
      productName,
      text,
      images,
      parentId
    } = body
    
    // Validate required fields
    if (!type || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: type, text' },
        { status: 400 }
      )
    }
    
    // Get user data for comment
    const userName = token.name || 'Anonymous'
    const userPhotoURL = token.picture || null
    
    // Check and censor bad words
    const hasBadWords = containsBadWords(text)
    const finalText = hasBadWords ? censorBadWords(text) : text
    
    let commentId: string
    let shopOwnerId: string | null = null
    let parentCommentUserId: string | null = null
    
    // Get parent comment user ID if replying
    if (parentId) {
      const parentCommentDoc = await adminDb
        .collection(type === 'shop' ? 'shopComments' : 'productComments')
        .doc(parentId)
        .get()
      
      if (parentCommentDoc.exists) {
        parentCommentUserId = parentCommentDoc.data()?.userId || null
      }
    }
    
    if (type === 'shop') {
      if (!shopId || !shopName) {
        return NextResponse.json(
          { error: 'shopId and shopName are required for shop comments' },
          { status: 400 }
        )
      }
      
      // Get shop owner ID for notification
      const shopDoc = await adminDb.collection('shops').doc(shopId).get()
      if (shopDoc.exists) {
        shopOwnerId = shopDoc.data()?.ownerId || null
      }
      
      commentId = await createShopComment(
        userId,
        userName,
        userPhotoURL,
        shopId,
        shopName,
        finalText,
        images,
        parentId,
        text // Save original text for admin
      )
      
      // Send notification to shop owner (if not the commenter)
      if (shopOwnerId && shopOwnerId !== userId && !parentId) {
        await createNotification(
          shopOwnerId,
          'comment',
          `💬 ความคิดเห็นใหม่ในร้าน ${shopName}`,
          `${userName}: ${finalText.substring(0, 100)}${finalText.length > 100 ? '...' : ''}`,
          `/sellerprofile/${shopOwnerId}`
        )
      }
      
      // Send notification to parent comment user (if replying)
      if (parentCommentUserId && parentCommentUserId !== userId) {
        await createNotification(
          parentCommentUserId,
          'comment',
          `💬 มีคนตอบกลับความคิดเห็นของคุณ`,
          `${userName}: ${finalText.substring(0, 100)}${finalText.length > 100 ? '...' : ''}`,
          `/sellerprofile/${shopOwnerId}`
        )
      }
    } else if (type === 'product') {
      if (!productId || !productName || !shopId || !shopName) {
        return NextResponse.json(
          { error: 'productId, productName, shopId, and shopName are required for product comments' },
          { status: 400 }
        )
      }
      
      // Get shop owner ID for notification
      const shopDoc = await adminDb.collection('shops').doc(shopId).get()
      if (shopDoc.exists) {
        shopOwnerId = shopDoc.data()?.ownerId || null
      }
      
      commentId = await createProductComment(
        userId,
        userName,
        userPhotoURL,
        productId,
        productName,
        shopId,
        shopName,
        finalText,
        images,
        parentId,
        text // Save original text for admin
      )
      
      // Send notification to shop owner (if not the commenter)
      if (shopOwnerId && shopOwnerId !== userId && !parentId) {
        await createNotification(
          shopOwnerId,
          'comment',
          `💬 ความคิดเห็นใหม่: ${productName}`,
          `${userName}: ${finalText.substring(0, 100)}${finalText.length > 100 ? '...' : ''}`,
          `/products/${productId}`
        )
      }
      
      // Send notification to parent comment user (if replying)
      if (parentCommentUserId && parentCommentUserId !== userId) {
        await createNotification(
          parentCommentUserId,
          'comment',
          `💬 มีคนตอบกลับความคิดเห็นของคุณ`,
          `${userName}: ${finalText.substring(0, 100)}${finalText.length > 100 ? '...' : ''}`,
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
      commentId,
      message: 'Comment created successfully',
      warning: hasBadWords ? 'ความคิดเห็นของคุณมีคำที่ไม่เหมาะสม ระบบได้ทำการปรับเปลี่ยนแล้ว' : undefined
    })
  } catch (error: any) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create comment' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/comments
 * Update a comment
 * Body: { commentId, type, text?, images? }
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
    const { commentId, type, text, images } = body
    
    if (!commentId || !type) {
      return NextResponse.json(
        { error: 'commentId and type are required' },
        { status: 400 }
      )
    }
    
    await updateComment(commentId, userId, type, { text, images })
    
    return NextResponse.json({
      success: true,
      message: 'Comment updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating comment:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update comment' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/comments
 * Delete a comment
 * Body: { commentId, type }
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
    const { commentId, type } = body
    
    if (!commentId || !type) {
      return NextResponse.json(
        { error: 'commentId and type are required' },
        { status: 400 }
      )
    }
    
    await deleteComment(commentId, userId, type)
    
    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting comment:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete comment' },
      { status: 500 }
    )
  }
}
