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
        { error: "Shop ID is required" },
        { status: 400 }
      );
    }

    // Get admin ID from session
    const cookieStore = await cookies();
    const adminId = cookieStore.get("userId")?.value;

    await unsuspendShop(shopId, adminId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unsuspending shop:", error);
    return NextResponse.json(
      { error: "Failed to unsuspend shop" },
      { status: 500 }
    );
  }
}
