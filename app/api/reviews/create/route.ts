import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin-config";
import { checkUserBanStatus } from "@/lib/auth-helpers";
import admin from 'firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      orderId, 
      userId, 
      shopId, 
      productId, 
      rating, 
      comment,
      type // 'shop' or 'product'
    } = body;

    // Validate required fields
    if (!orderId || !userId || !rating || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // ✅ Check if user is banned
    const banError = await checkUserBanStatus(userId);
    if (banError) {
      return NextResponse.json(
        { error: banError },
        { status: 403 }
      );
    }

    if (type === 'shop' && !shopId) {
      return NextResponse.json(
        { error: "Shop ID required for shop review" },
        { status: 400 }
      );
    }

    if (type === 'product' && !productId) {
      return NextResponse.json(
        { error: "Product ID required for product review" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Check if order exists and belongs to user
    const orderDoc = await adminDb.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    const orderData = orderDoc.data();
    if (orderData?.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Check if order is completed
    if (orderData?.status !== 'completed' && orderData?.paymentStatus !== 'completed') {
      return NextResponse.json(
        { error: "Can only review completed orders" },
        { status: 400 }
      );
    }

    // Check if already reviewed
    const existingReview = await adminDb
      .collection('reviews')
      .where('orderId', '==', orderId)
      .where('userId', '==', userId)
      .where('type', '==', type)
      .where(type === 'shop' ? 'shopId' : 'productId', '==', type === 'shop' ? shopId : productId)
      .get();

    if (!existingReview.empty) {
      return NextResponse.json(
        { error: "You have already reviewed this " + type },
        { status: 400 }
      );
    }

    // Create review
    const reviewData: any = {
      orderId,
      userId,
      type,
      rating,
      comment: comment || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (type === 'shop') {
      reviewData.shopId = shopId;
    } else {
      reviewData.productId = productId;
      reviewData.shopId = shopId; // Also store shopId for product reviews
    }

    const reviewRef = await adminDb.collection('reviews').add(reviewData);

    // Update shop rating if shop review
    if (type === 'shop' && shopId) {
      await updateShopRating(shopId);
    }

    // Update product rating if product review
    if (type === 'product' && productId) {
      await updateProductRating(productId);
    }

    // Mark order as reviewed
    const reviewedField = type === 'shop' ? 'shopReviewed' : 'productReviewed';
    await adminDb.collection('orders').doc(orderId).update({
      [reviewedField]: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return NextResponse.json({
      success: true,
      reviewId: reviewRef.id,
      message: "Review submitted successfully"
    });

  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    );
  }
}

async function updateShopRating(shopId: string) {
  try {
    const reviewsSnapshot = await adminDb
      .collection('reviews')
      .where('shopId', '==', shopId)
      .where('type', '==', 'shop')
      .get();

    let totalRating = 0;
    let count = 0;

    reviewsSnapshot.forEach(doc => {
      const data = doc.data();
      totalRating += data.rating || 0;
      count++;
    });

    const avgRating = count > 0 ? totalRating / count : 0;

    await adminDb.collection('shops').doc(shopId).update({
      rating: avgRating,
      reviewCount: count,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating shop rating:", error);
  }
}

async function updateProductRating(productId: string) {
  try {
    const reviewsSnapshot = await adminDb
      .collection('reviews')
      .where('productId', '==', productId)
      .where('type', '==', 'product')
      .get();

    let totalRating = 0;
    let count = 0;

    reviewsSnapshot.forEach(doc => {
      const data = doc.data();
      totalRating += data.rating || 0;
      count++;
    });

    const avgRating = count > 0 ? totalRating / count : 0;

    await adminDb.collection('products').doc(productId).update({
      rating: avgRating,
      reviewCount: count,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating product rating:", error);
  }
}
