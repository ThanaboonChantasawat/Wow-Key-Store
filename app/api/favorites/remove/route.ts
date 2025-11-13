import { NextRequest, NextResponse } from "next/server";
import { removeFromFavorites } from "@/lib/favorites-service";

export async function POST(request: NextRequest) {
  try {
    const { userId, itemId } = await request.json();

    if (!userId || !itemId) {
      return NextResponse.json(
        { error: "User ID and item ID are required" },
        { status: 400 }
      );
    }

    const result = await removeFromFavorites(userId, itemId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error removing from favorites:", error);
    return NextResponse.json(
      { error: "Failed to remove from favorites" },
      { status: 500 }
    );
  }
}
