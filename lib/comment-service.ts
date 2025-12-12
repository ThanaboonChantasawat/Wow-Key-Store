// Server-side comment service
import { adminDb } from './firebase-admin-config'
import admin from 'firebase-admin'
import type { ShopComment, ProductComment } from './comment-types'

const SHOP_COMMENTS_COLLECTION = 'shopComments'
const PRODUCT_COMMENTS_COLLECTION = 'productComments'

/**
 * Create a shop comment
 */
export async function createShopComment(
  userId: string,
  userName: string,
  userPhotoURL: string | null,
  shopId: string,
  shopName: string,
  text: string,
  images?: string[],
  parentId?: string,
  originalText?: string
): Promise<string> {
  try {
    const commentRef = await adminDb.collection(SHOP_COMMENTS_COLLECTION).add({
      userId,
      userName,
      userPhotoURL: userPhotoURL || null,
      shopId,
      shopName,
      text,
      originalText: originalText || text, // Save original text for admin
      images: images || [],
      parentId: parentId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    
    console.log(`✅ Shop comment created: ${commentRef.id}`)
    return commentRef.id
  } catch (error) {
    console.error('❌ Error creating shop comment:', error)
    throw error
  }
}

/**
 * Create a product comment
 */
export async function createProductComment(
  userId: string,
  userName: string,
  userPhotoURL: string | null,
  productId: string,
  productName: string,
  shopId: string,
  shopName: string,
  text: string,
  images?: string[],
  parentId?: string,
  originalText?: string
): Promise<string> {
  try {
    const commentRef = await adminDb.collection(PRODUCT_COMMENTS_COLLECTION).add({
      userId,
      userName,
      userPhotoURL: userPhotoURL || null,
      productId,
      productName,
      shopId,
      shopName,
      text,
      originalText: originalText || text, // Save original text for admin
      images: images || [],
      parentId: parentId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    
    console.log(`✅ Product comment created: ${commentRef.id}`)
    return commentRef.id
  } catch (error) {
    console.error('❌ Error creating product comment:', error)
    throw error
  }
}

/**
 * Get shop comments (with nested replies)
 */
export async function getShopComments(
  shopId: string,
  limit: number = 50
): Promise<ShopComment[]> {
  try {
    // Get all comments (both top-level and replies)
    const snapshot = await adminDb
      .collection(SHOP_COMMENTS_COLLECTION)
      .where('shopId', '==', shopId)
      .limit(limit * 3) // Get more to account for nested structure
      .get()
    
    if (snapshot.empty) {
      return []
    }
    
    // Convert to array with dates
    const allComments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as ShopComment[]
    
    // Separate top-level comments and replies
    const topLevel = allComments.filter(c => !c.parentId)
    const repliesMap = new Map<string, ShopComment[]>()
    
    allComments
      .filter(c => c.parentId)
      .forEach(reply => {
        const parentId = reply.parentId!
        if (!repliesMap.has(parentId)) {
          repliesMap.set(parentId, [])
        }
        repliesMap.get(parentId)!.push(reply)
      })
    
    // Recursive function to attach nested replies
    const attachReplies = (comment: ShopComment) => {
      comment.replies = repliesMap.get(comment.id) || []
      comment.replies.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      // Recursively attach replies to each reply
      comment.replies.forEach(reply => attachReplies(reply))
    }
    
    // Attach replies to all top-level comments
    topLevel.forEach(comment => attachReplies(comment))
    
    // Sort top-level by newest first
    topLevel.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    
    return topLevel.slice(0, limit)
  } catch (error) {
    console.error('❌ Error getting shop comments:', error)
    return []
  }
}

/**
 * Get product comments (with nested replies)
 */
export async function getProductComments(
  productId: string,
  limit: number = 50
): Promise<ProductComment[]> {
  try {
    // Get all comments (both top-level and replies)
    const snapshot = await adminDb
      .collection(PRODUCT_COMMENTS_COLLECTION)
      .where('productId', '==', productId)
      .limit(limit * 3) // Get more to account for nested structure
      .get()
    
    if (snapshot.empty) {
      return []
    }
    
    // Convert to array with dates
    const allComments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as ProductComment[]
    
    // Separate top-level comments and replies
    const topLevel = allComments.filter(c => !c.parentId)
    const repliesMap = new Map<string, ProductComment[]>()
    
    allComments
      .filter(c => c.parentId)
      .forEach(reply => {
        const parentId = reply.parentId!
        if (!repliesMap.has(parentId)) {
          repliesMap.set(parentId, [])
        }
        repliesMap.get(parentId)!.push(reply)
      })
    
    // Recursive function to attach nested replies
    const attachReplies = (comment: ProductComment) => {
      comment.replies = repliesMap.get(comment.id) || []
      comment.replies.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      // Recursively attach replies to each reply
      comment.replies.forEach(reply => attachReplies(reply))
    }
    
    // Attach replies to all top-level comments
    topLevel.forEach(comment => attachReplies(comment))
    
    // Sort top-level by newest first
    topLevel.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    
    return topLevel.slice(0, limit)
  } catch (error) {
    console.error('❌ Error getting product comments:', error)
    return []
  }
}

/**
 * Delete a comment
 */
export async function deleteComment(
  commentId: string,
  userId: string,
  type: 'shop' | 'product'
): Promise<void> {
  try {
    const collection = type === 'shop' ? SHOP_COMMENTS_COLLECTION : PRODUCT_COMMENTS_COLLECTION
    const commentRef = adminDb.collection(collection).doc(commentId)
    const commentDoc = await commentRef.get()
    
    if (!commentDoc.exists) {
      throw new Error('Comment not found')
    }
    
    const commentData = commentDoc.data()
    
    // Verify ownership
    if (commentData?.userId !== userId) {
      throw new Error('Unauthorized: You can only delete your own comments')
    }
    
    // Delete the comment
    await commentRef.delete()
    
    // Also delete all replies to this comment
    const repliesSnapshot = await adminDb
      .collection(collection)
      .where('parentId', '==', commentId)
      .get()
    
    const batch = adminDb.batch()
    repliesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref)
    })
    await batch.commit()
    
    console.log(`✅ Comment deleted: ${commentId} (with ${repliesSnapshot.size} replies)`)
  } catch (error) {
    console.error('❌ Error deleting comment:', error)
    throw error
  }
}

/**
 * Update a comment
 */
export async function updateComment(
  commentId: string,
  userId: string,
  type: 'shop' | 'product',
  updates: {
    text?: string
    images?: string[]
  }
): Promise<void> {
  try {
    const collection = type === 'shop' ? SHOP_COMMENTS_COLLECTION : PRODUCT_COMMENTS_COLLECTION
    const commentRef = adminDb.collection(collection).doc(commentId)
    const commentDoc = await commentRef.get()
    
    if (!commentDoc.exists) {
      throw new Error('Comment not found')
    }
    
    const commentData = commentDoc.data()
    
    // Verify ownership
    if (commentData?.userId !== userId) {
      throw new Error('Unauthorized: You can only update your own comments')
    }
    
    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }
    
    if (updates.text !== undefined) updateData.text = updates.text
    if (updates.images !== undefined) updateData.images = updates.images
    
    await commentRef.update(updateData)
    
    console.log(`✅ Comment updated: ${commentId}`)
  } catch (error) {
    console.error('❌ Error updating comment:', error)
    throw error
  }
}
