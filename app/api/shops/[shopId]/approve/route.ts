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
        { error: "Shop ID and admin ID are required" },
        { status: 400 }
      );
    }

    await approveShop(shopId, adminId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error approving shop:", error);
    return NextResponse.json(
      { error: "Failed to approve shop" },
      { status: 500 }
    );
  }
}
