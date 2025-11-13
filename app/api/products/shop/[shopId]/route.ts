import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin-config";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { shopId } = await params;

    const productsSnapshot = await adminDb
      .collection("products")
      .where("shopId", "==", shopId)
      .get();

    const products = productsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        description: data.description || '',
        price: data.price || 0,
        images: Array.isArray(data.images) ? data.images : [],
        categoryId: data.categoryId || '',
        gameId: data.gameId || '',
        gameName: data.gameName || '',
        stock: data.stock ?? -1,
        sold: data.sold || 0,
        status: data.status || 'draft',
        shopId: data.shopId || '',
        viewCount: data.viewCount || 0,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    });

    // Sort by createdAt descending (newest first)
    products.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching products by shop:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
