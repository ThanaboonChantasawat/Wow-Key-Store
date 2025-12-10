import { NextRequest, NextResponse } from "next/server";
import { createShop } from "@/lib/shop-service";
import { checkUserBanStatus } from "@/lib/auth-helpers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ownerId, shopData } = body;

    if (!ownerId || !shopData) {
      return NextResponse.json(
        { error: "Owner ID and shop data are required" },
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
    console.error("Error creating shop:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create shop" },
      { status: 500 }
    );
  }
}
