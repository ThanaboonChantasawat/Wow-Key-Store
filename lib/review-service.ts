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
    console.log('🔍 Verifying purchase:', { userId, orderId, shopId, productId })
    
    const orderDoc = await adminDb.collection('orders').doc(orderId).get()
    
    if (!orderDoc.exists) {
      console.log('❌ Order not found:', orderId)
      return false
    }
    
    const orderData = orderDoc.data()
    console.log('📦 Order data:', {
      userId: orderData?.userId,
      status: orderData?.status,
      buyerConfirmed: orderData?.buyerConfirmed,
      shopId: orderData?.shopId,
      items: orderData?.items?.map((item: any) => ({
        productId: item.productId,
        productName: item.productName
      }))
    })
    
    // Verify order belongs to user
    if (orderData?.userId !== userId) {
      console.log('❌ Order does not belong to user. Expected:', userId, 'Got:', orderData?.userId)
      return false
    }
    
    // Verify order is completed OR buyer confirmed
    // Allow reviews if buyer confirmed even if status is not 'completed'
    const isCompletedOrConfirmed = orderData?.buyerConfirmed || orderData?.status === 'completed'
    if (!isCompletedOrConfirmed) {
      console.log('❌ Order not completed and not confirmed by buyer. Status:', orderData?.status, 'buyerConfirmed:', orderData?.buyerConfirmed)
      return false
    }
    
    // Verify shop if provided
    if (shopId) {
      // For single-shop orders created by cart checkout, shopId is stored at root level
      if (orderData?.shopId && orderData.shopId !== shopId) {
        console.log('❌ Order is not from this shop (root). Expected:', shopId, 'Got:', orderData.shopId)
        return false
      }

      // Also verify inside shops array if present
      if (Array.isArray((orderData as any).shops)) {
        const shops = (orderData as any).shops
        const hasShop = shops.some((s: any) => s.shopId === shopId)
        if (!hasShop) {
          console.log('❌ Order shops[] does not contain this shop. Looking for:', shopId)
          console.log('   Available shops:', shops.map((s: any) => s.shopId))
          return false
        }
      }
    }
    
    // Verify product if provided - check in multiple locations
    if (productId) {
      let hasProduct = false
      
      // Check in root-level items array (common structure)
      if (Array.isArray(orderData?.items)) {
        hasProduct = orderData.items.some((item: any) => 
          item.productId === productId || item.gameId === productId
        )
        console.log('🔎 Checking product in root items:', { productId, itemsCount: orderData.items.length, hasProduct })
      }
      
      // If not found in root items, check in shops[].items[] (legacy structure)
      if (!hasProduct && Array.isArray((orderData as any).shops)) {
        const shops = (orderData as any).shops || []
        const allItems = shops.flatMap((shop: any) => shop.items || [])
        hasProduct = allItems.some((item: any) => 
          item.productId === productId || item.gameId === productId
        )
        console.log('🔎 Checking product in shops.items:', { productId, shopsCount: shops.length, itemsCount: allItems.length, hasProduct })
      }
      
      if (!hasProduct) {
        console.log('❌ Order does not contain this product. Looking for:', productId)
        if (orderData?.items) {
          console.log('   Available products in root items:', orderData.items.map((i: any) => i.productId || i.gameId))
        }
        return false
      }
      console.log('✅ Product found in order')
    }
    
    console.log('✅ Purchase verification passed')
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
 * Get current user's reviews for a specific order
 * Used by profile MyOrders to know if this order/shop/product was already reviewed
 */
export async function getUserOrderReviews(
  userId: string,
  orderId: string,
  productId?: string
): Promise<{ shopReview: ShopReview | null; productReview: ProductReview | null }> {
  try {
    const shopQuery = adminDb
      .collection(SHOP_REVIEWS_COLLECTION)
      .where('userId', '==', userId)
      .where('orderId', '==', orderId)
      .limit(1)
    
    // Build product query - filter by productId if provided
    let productQuery = adminDb
      .collection(PRODUCT_REVIEWS_COLLECTION)
      .where('userId', '==', userId)
      .where('orderId', '==', orderId)
    
    if (productId) {
      productQuery = productQuery.where('productId', '==', productId)
    }
    
    productQuery = productQuery.limit(1)

    const [shopSnap, productSnap] = await Promise.all([
      shopQuery.get(),
      productQuery.get(),
    ])

    const shopReview = !shopSnap.empty
      ? ({
          id: shopSnap.docs[0].id,
          ...shopSnap.docs[0].data(),
          createdAt: shopSnap.docs[0].data().createdAt?.toDate() || new Date(),
          updatedAt: shopSnap.docs[0].data().updatedAt?.toDate() || new Date(),
        } as ShopReview)
      : null

    const productReview = !productSnap.empty
      ? ({
          id: productSnap.docs[0].id,
          ...productSnap.docs[0].data(),
          createdAt: productSnap.docs[0].data().createdAt?.toDate() || new Date(),
          updatedAt: productSnap.docs[0].data().updatedAt?.toDate() || new Date(),
        } as ProductReview)
      : null

    return { shopReview, productReview }
  } catch (error) {
    console.error('❌ Error getting user order reviews:', error)
    return { shopReview: null, productReview: null }
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
