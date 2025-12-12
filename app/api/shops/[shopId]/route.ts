import { NextRequest, NextResponse } from "next/server";
import { getShopById } from "@/lib/shop-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { shopId } = await params;

    if (!shopId) {
      return NextResponse.json(
        { error: "กรุณาระบุร้านค้าที่ต้องการ" },
        { status: 400 }
      );
    }

    const shop = await getShopById(shopId);

    if (!shop) {
      return NextResponse.json(
        { error: "ไม่พบร้านค้า" },
        { status: 404 }
      );
    }

    return NextResponse.json({ shop });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการดึงข้อมูลร้านค้า:", error);
    return NextResponse.json(
      { error: "ไม่สามารถดึงข้อมูลร้านค้าได้" },
      { status: 500 }
    );
  }
}
