import { NextRequest, NextResponse } from "next/server";
import { getShopByOwnerId } from "@/lib/shop-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ownerId: string }> }
) {
  try {
    const { ownerId } = await params;

    if (!ownerId) {
      return NextResponse.json(
        { error: "กรุณาระบุเจ้าของร้าน" },
        { status: 400 }
      );
    }

    const shop = await getShopByOwnerId(ownerId);

    if (!shop) {
      return NextResponse.json(
        { error: "ไม่พบร้านค้า" },
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
      // Bank account information
      bankName: shop.bankName || null,
      bankAccountNumber: shop.bankAccountNumber || null,
      bankAccountName: shop.bankAccountName || null,
      bankBranch: shop.bankBranch || null,
      enableBank: shop.enableBank || false,
      // PromptPay information
      promptPayId: shop.promptPayId || null,
      promptPayType: shop.promptPayType || null,
      enablePromptPay: shop.enablePromptPay || false,
      createdAt: shop.createdAt ? shop.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: shop.updatedAt ? shop.updatedAt.toISOString() : new Date().toISOString(),
    };

    return NextResponse.json({ shop: serializedShop });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการดึงข้อมูลร้านค้า:", error);
    return NextResponse.json(
      { error: "ไม่สามารถดึงข้อมูลร้านค้าได้" },
      { status: 500 }
    );
  }
}
