import { NextRequest, NextResponse } from "next/server";
import { unsuspendShop } from "@/lib/shop-service";
import { cookies } from "next/headers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { shopId } = await params;

    if (!shopId) {
      return NextResponse.json(
        { error: "กรุณาระบุร้านค้าที่ต้องการยกเลิกการระงับ" },
        { status: 400 }
      );
    }

    // Get admin ID from session
    const cookieStore = await cookies();
    const adminId = cookieStore.get("userId")?.value;

    await unsuspendShop(shopId, adminId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการยกเลิกระงับร้านค้า:", error);
    return NextResponse.json(
      { error: "ไม่สามารถยกเลิกระงับร้านค้าได้" },
      { status: 500 }
    );
  }
}
