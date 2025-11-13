import { NextRequest, NextResponse } from "next/server";
import { createShop } from "@/lib/shop-service";

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

    const shopId = await createShop(ownerId, shopData);

    return NextResponse.json({ shopId }, { status: 201 });
  } catch (error) {
    console.error("Error creating shop:", error);
    return NextResponse.json(
      { error: "Failed to create shop" },
      { status: 500 }
    );
  }
}
