import { NextRequest, NextResponse } from "next/server";
import { updateShopProductCount, updateShopSalesStats } from "@/lib/shop-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { shopId } = await params;

    // Update both product count and sales stats
    await Promise.all([
      updateShopProductCount(shopId),
      updateShopSalesStats(shopId)
    ]);

    return NextResponse.json({ 
      success: true,
      message: "อัปเดตสถิติร้านค้าเรียบร้อยแล้ว" 
    });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการอัปเดตสถิติร้านค้า:", error);
    return NextResponse.json(
      { error: "ไม่สามารถอัปเดตสถิติร้านค้าได้" },
      { status: 500 }
    );
  }
}
