import { NextRequest, NextResponse } from "next/server";
import { getAllShops, updateShopProductCount, updateShopSalesStats } from "@/lib/shop-service";

export async function POST(request: NextRequest) {
  try {
    const shops = await getAllShops();
    
    let updated = 0;
    let failed = 0;
    
    for (const shop of shops) {
      try {
        await Promise.all([
          updateShopProductCount(shop.shopId),
          updateShopSalesStats(shop.shopId)
        ]);
        updated++;
      } catch (error) {
        console.error(`Failed to update shop ${shop.shopId}:`, error);
        failed++;
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `Updated ${updated} shops, ${failed} failed`,
      updated,
      failed
    });
  } catch (error) {
    console.error("Error updating all shop stats:", error);
    return NextResponse.json(
      { error: "Failed to update shop stats" },
      { status: 500 }
    );
  }
}
