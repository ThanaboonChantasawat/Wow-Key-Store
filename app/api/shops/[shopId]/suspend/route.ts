import { NextRequest, NextResponse } from "next/server";
import { suspendShop } from "@/lib/shop-service";

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

    await suspendShop(shopId, adminId, reason);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการระงับร้านค้า:", error);
    return NextResponse.json(
      { error: "ไม่สามารถระงับร้านค้าได้" },
      { status: 500 }
    );
  }
}
