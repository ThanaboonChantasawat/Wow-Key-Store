import { NextRequest, NextResponse } from "next/server";
import { getAllShops } from "@/lib/shop-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as 'pending' | 'active' | 'rejected' | 'suspended' | 'closed' | null;

    const shops = await getAllShops(status || undefined);

    // Serialize data to be JSON-safe
    const serializedShops = shops.map(shop => ({
      shopId: shop.shopId || '',
      ownerId: shop.ownerId || '',
      shopName: shop.shopName || '',
      description: shop.description || '',
      logoUrl: shop.logoUrl || null,
      contactEmail: shop.contactEmail || null,
      contactPhone: shop.contactPhone || null,
      facebookUrl: shop.facebookUrl || null,
      lineId: shop.lineId || null,
      idCardNumber: shop.idCardNumber || null,
      businessRegistration: shop.businessRegistration || null,
      status: shop.status || 'pending',
      verificationStatus: shop.verificationStatus || 'pending',
      rejectionReason: shop.rejectionReason || null,
      suspensionReason: shop.suspensionReason || null,
      suspendedBy: shop.suspendedBy || null,
      suspendedAt: shop.suspendedAt ? shop.suspendedAt.toISOString() : null,
      verifiedBy: shop.verifiedBy || null,
      verifiedAt: shop.verifiedAt ? shop.verifiedAt.toISOString() : null,
      totalProducts: shop.totalProducts || 0,
      totalSales: shop.totalSales || 0,
      totalRevenue: shop.totalRevenue || 0,
      rating: shop.rating || 0,
      createdAt: shop.createdAt ? shop.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: shop.updatedAt ? shop.updatedAt.toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json({ shops: serializedShops });
  } catch (error) {
    console.error("Error fetching shops:", error);
    return NextResponse.json(
      { error: "Failed to fetch shops" },
      { status: 500 }
    );
  }
}
