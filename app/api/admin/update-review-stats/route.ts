import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin-config";

export async function POST() {
  try {
    // Get all reviews
    const reviewsSnapshot = await adminDb.collection('reviews').get();
    
    // Group by shop and product
    const shopReviews = new Map<string, number[]>();
    const productReviews = new Map<string, number[]>();

    reviewsSnapshot.forEach(doc => {
      const data = doc.data();
      
      if (data.type === 'shop' && data.shopId) {
        if (!shopReviews.has(data.shopId)) {
          shopReviews.set(data.shopId, []);
        }
        shopReviews.get(data.shopId)!.push(data.rating || 0);
      }
      
      if (data.type === 'product' && data.productId) {
        if (!productReviews.has(data.productId)) {
          productReviews.set(data.productId, []);
        }
        productReviews.get(data.productId)!.push(data.rating || 0);
      }
    });

    let shopCount = 0;
    let productCount = 0;

    // Update shops
    for (const [shopId, ratings] of shopReviews.entries()) {
      const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      
      await adminDb.collection('shops').doc(shopId).update({
        rating: avgRating,
        reviewCount: ratings.length,
        updatedAt: new Date()
      });
      
      shopCount++;
    }

    // Update products
    for (const [productId, ratings] of productReviews.entries()) {
      const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      
      await adminDb.collection('products').doc(productId).update({
        rating: avgRating,
        reviewCount: ratings.length,
        updatedAt: new Date()
      });
      
      productCount++;
    }

    return NextResponse.json({
      success: true,
      shopsUpdated: shopCount,
      productsUpdated: productCount,
      totalReviews: reviewsSnapshot.size
    });

  } catch (error) {
    console.error("Error updating review stats:", error);
    return NextResponse.json(
      { error: "Failed to update review stats" },
      { status: 500 }
    );
  }
}
