// Server-side review service
import { adminDb } from './firebase-admin-config'
import admin from 'firebase-admin'
import type { ShopReview, ProductReview, ReviewStats } from './review-types'

const SHOP_REVIEWS_COLLECTION = 'shopReviews'
const PRODUCT_REVIEWS_COLLECTION = 'productReviews'

/**
 * Verify that user actually purchased from this shop/product
 */
async function verifyPurchase(
  userId: string, 
  orderId: string, 
  shopId?: string, 
  productId?: string
): Promise<boolean> {
  try {
    const orderDoc = await adminDb.collection('orders').doc(orderId).get()
    
    if (!orderDoc.exists) {
      console.log('❌ Order not found:', orderId)
      return false
    }
    
    const orderData = orderDoc.data()
    
    // Verify order belongs to user
    if (orderData?.userId !== userId) {
      console.log('❌ Order does not belong to user')
      return false
    }
    
    // Verify order is completed and buyer confirmed
    if (orderData?.status !== 'completed' || !orderData?.buyerConfirmed) {
      console.log('❌ Order not completed or not confirmed by buyer')
      return false
    }
    
    // Verify shop if provided
    if (shopId && orderData?.shopId !== shopId) {
      console.log('❌ Order is not from this shop')
      return false
    }
    
    // Verify product if provided
    if (productId && orderData?.productId !== productId) {
      console.log('❌ Order does not contain this product')
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error verifying purchase:', error)
    return false
  }
}

/**
 * Create a shop review
 */
export async function createShopReview(
  userId: string,
  userName: string,
  userPhotoURL: string | null,
  shopId: string,
  shopName: string,
  orderId: string,
  rating: number,
  text: string,
  images?: string[],
  originalText?: string
): Promise<string> {
  try {
    // Verify purchase
    const verified = await verifyPurchase(userId, orderId, shopId)
    
    if (!verified) {
      throw new Error('Cannot create review: Purchase not verified')
    }
    
    // Check if user already reviewed this shop for this order
    const existingReview = await adminDb
      .collection(SHOP_REVIEWS_COLLECTION)
      .where('userId', '==', userId)
      .where('shopId', '==', shopId)
      .where('orderId', '==', orderId)
      .get()
    
    if (!existingReview.empty) {
      throw new Error('You have already reviewed this shop for this order')
    }
    
    const reviewRef = await adminDb.collection(SHOP_REVIEWS_COLLECTION).add({
      userId,
      userName,
      userPhotoURL: userPhotoURL || null,
      shopId,
      shopName,
      orderId,
      rating,
      text,
      originalText: originalText || text, // Save original text for admin
      images: images || [],
      verified: true,
      helpful: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    
    console.log(`✅ Shop review created: ${reviewRef.id}`)
    
    // Update shop stats
    await updateShopStats(shopId)
    
    return reviewRef.id
  } catch (error) {
    console.error('❌ Error creating shop review:', error)
    throw error
  }
}

/**
 * Create a product review
 */
export async function createProductReview(
  userId: string,
  userName: string,
  userPhotoURL: string | null,
  productId: string,
  productName: string,
  shopId: string,
  shopName: string,
  orderId: string,
  rating: number,
  text: string,
  images?: string[],
  originalText?: string
): Promise<string> {
  try {
    // Verify purchase
    const verified = await verifyPurchase(userId, orderId, shopId, productId)
    
    if (!verified) {
      throw new Error('Cannot create review: Purchase not verified')
    }
    
    // Check if user already reviewed this product for this order
    const existingReview = await adminDb
      .collection(PRODUCT_REVIEWS_COLLECTION)
      .where('userId', '==', userId)
      .where('productId', '==', productId)
      .where('orderId', '==', orderId)
      .get()
    
    if (!existingReview.empty) {
      throw new Error('You have already reviewed this product for this order')
    }
    
    const reviewRef = await adminDb.collection(PRODUCT_REVIEWS_COLLECTION).add({
      userId,
      userName,
      userPhotoURL: userPhotoURL || null,
      productId,
      productName,
      shopId,
      shopName,
      orderId,
      rating,
      text,
      originalText: originalText || text, // Save original text for admin
      images: images || [],
      verified: true,
      helpful: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    
    console.log(`✅ Product review created: ${reviewRef.id}`)
    
    // Update product stats
    await updateProductStats(productId)
    
    return reviewRef.id
  } catch (error) {
    console.error('❌ Error creating product review:', error)
    throw error
  }
}

/**
 * Get shop reviews
 */
export async function getShopReviews(
  shopId: string,
  limit: number = 50
): Promise<ShopReview[]> {
  try {
    const snapshot = await adminDb
      .collection(SHOP_REVIEWS_COLLECTION)
      .where('shopId', '==', shopId)
      .limit(limit * 2)
      .get()
    
    if (snapshot.empty) {
      return []
    }
    
    const reviews = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit) as ShopReview[]
    
    return reviews
  } catch (error) {
    console.error('❌ Error getting shop reviews:', error)
    return []
  }
}

/**
 * Get product reviews
 */
export async function getProductReviews(
  productId: string,
  limit: number = 50
): Promise<ProductReview[]> {
  try {
    const snapshot = await adminDb
      .collection(PRODUCT_REVIEWS_COLLECTION)
      .where('productId', '==', productId)
      .limit(limit * 2)
      .get()
    
    if (snapshot.empty) {
      return []
    }
    
    const reviews = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit) as ProductReview[]
    
    return reviews
  } catch (error) {
    console.error('❌ Error getting product reviews:', error)
    return []
  }
}

/**
 * Get shop review stats
 */
export async function getShopReviewStats(shopId: string): Promise<ReviewStats> {
  try {
    const snapshot = await adminDb
      .collection(SHOP_REVIEWS_COLLECTION)
      .where('shopId', '==', shopId)
      .get()
    
    if (snapshot.empty) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      }
    }
    
    let totalRating = 0
    const distribution: { 1: number, 2: number, 3: number, 4: number, 5: number } = 
      { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    
    snapshot.docs.forEach(doc => {
      const rating = doc.data().rating as number
      totalRating += rating
      distribution[rating as keyof typeof distribution]++
    })
    
    return {
      averageRating: totalRating / snapshot.size,
      totalReviews: snapshot.size,
      ratingDistribution: distribution
    }
  } catch (error) {
    console.error('❌ Error getting shop review stats:', error)
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    }
  }
}

/**
 * Get product review stats
 */
export async function getProductReviewStats(productId: string): Promise<ReviewStats> {
  try {
    const snapshot = await adminDb
      .collection(PRODUCT_REVIEWS_COLLECTION)
      .where('productId', '==', productId)
      .get()
    
    if (snapshot.empty) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      }
    }
    
    let totalRating = 0
    const distribution: { 1: number, 2: number, 3: number, 4: number, 5: number } = 
      { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    
    snapshot.docs.forEach(doc => {
      const rating = doc.data().rating as number
      totalRating += rating
      distribution[rating as keyof typeof distribution]++
    })
    
    return {
      averageRating: totalRating / snapshot.size,
      totalReviews: snapshot.size,
      ratingDistribution: distribution
    }
  } catch (error) {
    console.error('❌ Error getting product review stats:', error)
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    }
  }
}

/**
 * Update shop with new rating stats
 */
async function updateShopStats(shopId: string): Promise<void> {
  try {
    const stats = await getShopReviewStats(shopId)
    
    await adminDb.collection('shops').doc(shopId).update({
      rating: stats.averageRating,
      totalReviews: stats.totalReviews,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })
    
    console.log(`✅ Shop stats updated for ${shopId}`)
  } catch (error) {
    console.error('❌ Error updating shop stats:', error)
  }
}

/**
 * Update product with new rating stats
 */
async function updateProductStats(productId: string): Promise<void> {
  try {
    const stats = await getProductReviewStats(productId)
    
    await adminDb.collection('products').doc(productId).update({
      rating: stats.averageRating,
      totalReviews: stats.totalReviews,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })
    
    console.log(`✅ Product stats updated for ${productId}`)
  } catch (error) {
    console.error('❌ Error updating product stats:', error)
  }
}

/**
 * Delete a review
 */
export async function deleteReview(
  reviewId: string,
  userId: string,
  type: 'shop' | 'product'
): Promise<void> {
  try {
    const collection = type === 'shop' ? SHOP_REVIEWS_COLLECTION : PRODUCT_REVIEWS_COLLECTION
    const reviewRef = adminDb.collection(collection).doc(reviewId)
    const reviewDoc = await reviewRef.get()
    
    if (!reviewDoc.exists) {
      throw new Error('Review not found')
    }
    
    const reviewData = reviewDoc.data()
    
    // Verify ownership
    if (reviewData?.userId !== userId) {
      throw new Error('Unauthorized: You can only delete your own reviews')
    }
    
    await reviewRef.delete()
    
    console.log(`✅ Review deleted: ${reviewId}`)
    
    // Update stats
    if (type === 'shop' && reviewData?.shopId) {
      await updateShopStats(reviewData.shopId)
    } else if (type === 'product' && reviewData?.productId) {
      await updateProductStats(reviewData.productId)
    }
  } catch (error) {
    console.error('❌ Error deleting review:', error)
    throw error
  }
}

/**
 * Update a review
 */
export async function updateReview(
  reviewId: string,
  userId: string,
  type: 'shop' | 'product',
  updates: {
    rating?: number
    text?: string
    images?: string[]
  }
): Promise<void> {
  try {
    const collection = type === 'shop' ? SHOP_REVIEWS_COLLECTION : PRODUCT_REVIEWS_COLLECTION
    const reviewRef = adminDb.collection(collection).doc(reviewId)
    const reviewDoc = await reviewRef.get()
    
    if (!reviewDoc.exists) {
      throw new Error('Review not found')
    }
    
    const reviewData = reviewDoc.data()
    
    // Verify ownership
    if (reviewData?.userId !== userId) {
      throw new Error('Unauthorized: You can only update your own reviews')
    }
    
    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }
    
    if (updates.rating !== undefined) updateData.rating = updates.rating
    if (updates.text !== undefined) updateData.text = updates.text
    if (updates.images !== undefined) updateData.images = updates.images
    
    await reviewRef.update(updateData)
    
    console.log(`✅ Review updated: ${reviewId}`)
    
    // Update stats if rating changed
    if (updates.rating !== undefined) {
      if (type === 'shop' && reviewData?.shopId) {
        await updateShopStats(reviewData.shopId)
      } else if (type === 'product' && reviewData?.productId) {
        await updateProductStats(reviewData.productId)
      }
    }
  } catch (error) {
    console.error('❌ Error updating review:', error)
    throw error
  }
}
