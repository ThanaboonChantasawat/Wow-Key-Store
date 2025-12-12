import { NextRequest, NextResponse } from "next/server";
import { rejectShop } from "@/lib/shop-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { shopId } = await params;
    const { adminId, reason } = await request.json();

    if (!shopId || !adminId || !reason) {
      return NextResponse.json(
        { error: "กรุณาระบุข้อมูลให้ครบถ้วน" },
        { status: 400 }
      );
    }

    await rejectShop(shopId, adminId, reason);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการปฏิเสธร้านค้า:", error);
    return NextResponse.json(
      { error: "ไม่สามารถปฏิเสธร้านค้าได้" },
      { status: 500 }
    );
  }
}
