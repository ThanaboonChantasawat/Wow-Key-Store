import { NextResponse } from "next/server";
import { getAllShops, updateShopProductCount, updateShopSalesStats } from "@/lib/shop-service";

export async function POST() {
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
        console.error('อัปเดตสถิติร้านค้าไม่สำเร็จ:', error);
        failed++;
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `อัปเดตสำเร็จ ${updated} ร้าน, ไม่สำเร็จ ${failed} ร้าน`,
      updated,
      failed
    });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการอัปเดตสถิติร้านค้าทั้งหมด:", error);
    return NextResponse.json(
      { error: "ไม่สามารถอัปเดตสถิติร้านค้าได้" },
      { status: 500 }
    );
  }
}
