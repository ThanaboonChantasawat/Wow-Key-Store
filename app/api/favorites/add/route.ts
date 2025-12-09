import { NextRequest, NextResponse } from "next/server";
import { addToFavorites } from "@/lib/favorites-service";
import { checkUserBanStatus } from "@/lib/auth-helpers";

export async function POST(request: NextRequest) {
  try {
    const { userId, itemId, itemType } = await request.json();

    if (!userId || !itemId) {
      return NextResponse.json(
        { error: "User ID and item ID are required" },
        { status: 400 }
      );
    }

    // ✅ Check if user is banned
    const banError = await checkUserBanStatus(userId);
    if (banError) {
      return NextResponse.json(
        { error: banError },
        { status: 403 }
      );
    }

    const result = await addToFavorites(userId, itemId, itemType || 'game');

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error adding to favorites:", error);
    return NextResponse.json(
      { error: "Failed to add to favorites" },
      { status: 500 }
    );
  }
}
