import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin-config";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;

    const reviewsSnapshot = await adminDb
      .collection('reviews')
      .where('productId', '==', productId)
      .where('type', '==', 'product')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const reviews = await Promise.all(
      reviewsSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        
        // Get user info
        let userName = 'ผู้ใช้';
        try {
          const userDoc = await adminDb.collection('users').doc(data.userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            userName = userData?.displayName || userData?.email?.split('@')[0] || 'ผู้ใช้';
          }
        } catch (err) {
          console.error('Error fetching user:', err);
        }

        return {
          id: doc.id,
          rating: data.rating || 0,
          comment: data.comment || '',
          userName,
          userId: data.userId,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        };
      })
    );

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error("Error fetching product reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}
