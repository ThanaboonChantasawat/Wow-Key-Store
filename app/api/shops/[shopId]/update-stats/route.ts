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
      message: "Shop stats updated successfully" 
    });
  } catch (error) {
    console.error("Error updating shop stats:", error);
    return NextResponse.json(
      { error: "Failed to update shop stats" },
      { status: 500 }
    );
  }
}
