import { NextRequest, NextResponse } from "next/server";
import { isFavorited } from "@/lib/favorites-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const itemId = searchParams.get("itemId");

    if (!userId || !itemId) {
      return NextResponse.json(
        { error: "User ID and item ID are required" },
        { status: 400 }
      );
    }

    const favorited = await isFavorited(userId, itemId);

    return NextResponse.json({ isFavorited: favorited });
  } catch (error) {
    console.error("Error checking favorite:", error);
    return NextResponse.json(
      { error: "Failed to check favorite" },
      { status: 500 }
    );
  }
}
