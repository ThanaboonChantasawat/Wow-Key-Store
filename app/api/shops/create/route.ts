import { NextRequest, NextResponse } from "next/server";
import { createShop } from "@/lib/shop-service";
import { checkUserBanStatus } from "@/lib/auth-helpers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ownerId, shopData } = body;

    if (!ownerId || !shopData) {
      return NextResponse.json(
        { error: "กรุณาระบุข้อมูลที่จำเป็นสำหรับการสร้างร้านค้า" },
        { status: 400 }
      );
    }

    // ✅ Check if user is banned
    const banError = await checkUserBanStatus(ownerId);
    if (banError) {
      return NextResponse.json(
        { error: banError },
        { status: 403 }
      );
    }

    const shopId = await createShop(ownerId, shopData);

    return NextResponse.json({ shopId }, { status: 201 });
  } catch (error: any) {
    console.error("เกิดข้อผิดพลาดในการสร้างร้านค้า:", error);
    return NextResponse.json(
      { error: error.message || "ไม่สามารถสร้างร้านค้าได้" },
      { status: 500 }
    );
  }
}
