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
        { error: "Shop ID, admin ID, and reason are required" },
        { status: 400 }
      );
    }

    await suspendShop(shopId, adminId, reason);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error suspending shop:", error);
    return NextResponse.json(
      { error: "Failed to suspend shop" },
      { status: 500 }
    );
  }
}
