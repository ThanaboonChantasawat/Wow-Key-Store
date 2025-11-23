import { NextRequest, NextResponse } from "next/server";
import { getUnreadCount } from "@/lib/notification-service";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log("GET /api/notifications/unread-count hit");
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const count = await getUnreadCount(userId);

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return NextResponse.json(
      { error: "Failed to fetch unread count" },
      { status: 500 }
    );
  }
}
