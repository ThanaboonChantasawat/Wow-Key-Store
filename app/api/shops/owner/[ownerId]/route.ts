import { NextRequest, NextResponse } from "next/server";
import { getShopByOwnerId } from "@/lib/shop-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ownerId: string }> }
) {
  console.log("API /api/shops/owner/[ownerId] hit");
  try {
    const { ownerId } = await params;
    console.log("Owner ID:", ownerId);

    if (!ownerId) {
      return NextResponse.json(
        { error: "Owner ID is required" },
        { status: 400 }
      );
    }

    const shop = await getShopByOwnerId(ownerId);

    if (!shop) {
      return NextResponse.json(
        { error: "Shop not found" },
        { status: 404 }
      );
    }

    // Serialize to JSON-safe format
    const serializedShop = {
      shopId: shop.shopId || '',
      ownerId: shop.ownerId || '',
      shopName: shop.shopName || '',
      description: shop.description || '',
      logoUrl: shop.logoUrl || null,
      contactEmail: shop.contactEmail || null,
      contactPhone: shop.contactPhone || null,
      facebookUrl: shop.facebookUrl || null,
      lineId: shop.lineId || null,
      status: shop.status || 'pending',
      verificationStatus: shop.verificationStatus || 'pending',
      totalProducts: shop.totalProducts || 0,
      totalSales: shop.totalSales || 0,
      totalRevenue: shop.totalRevenue || 0,
      rating: shop.rating || 0,
      createdAt: shop.createdAt ? shop.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: shop.updatedAt ? shop.updatedAt.toISOString() : new Date().toISOString(),
    };

    return NextResponse.json({ shop: serializedShop });
  } catch (error) {
    console.error("Error fetching shop:", error);
    return NextResponse.json(
      { error: "Failed to fetch shop" },
      { status: 500 }
    );
  }
}
