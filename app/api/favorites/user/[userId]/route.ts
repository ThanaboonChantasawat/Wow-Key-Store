import { NextRequest, NextResponse } from "next/server";
import { getUserFavorites } from "@/lib/favorites-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const favorites = await getUserFavorites(userId);

    return NextResponse.json(favorites);
  } catch (error) {
    console.error("Error getting user favorites:", error);
    return NextResponse.json(
      { error: "Failed to get favorites" },
      { status: 500 }
    );
  }
}
