import { NextRequest, NextResponse } from "next/server";
import { approveShop } from "@/lib/shop-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { shopId } = await params;
    const { adminId } = await request.json();

    if (!shopId || !adminId) {
      return NextResponse.json(
        { error: "กรุณาระบุข้อมูลให้ครบถ้วน" },
        { status: 400 }
      );
    }

    await approveShop(shopId, adminId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการอนุมัติร้านค้า:", error);
    return NextResponse.json(
      { error: "ไม่สามารถอนุมัติร้านค้าได้" },
      { status: 500 }
    );
  }
}
