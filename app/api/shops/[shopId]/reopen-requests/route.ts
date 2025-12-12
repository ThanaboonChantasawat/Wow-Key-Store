import { NextRequest, NextResponse } from "next/server";
import { deleteAllReopenRequestsByShopId } from "@/lib/reopen-request-service";

export async function DELETE(
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

    await deleteAllReopenRequestsByShopId(shopId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการลบคำขอเปิดร้านใหม่:", error);
    return NextResponse.json(
      { error: "ไม่สามารถลบคำขอเปิดร้านใหม่ได้" },
      { status: 500 }
    );
  }
}
