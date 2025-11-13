import { NextRequest, NextResponse } from "next/server";
import { updateAccountStatus } from "@/lib/user-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { status } = await request.json();

    if (!userId || !status) {
      return NextResponse.json(
        { error: "User ID and status are required" },
        { status: 400 }
      );
    }

    await updateAccountStatus(userId, status);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating account status:", error);
    return NextResponse.json(
      { error: "Failed to update account status" },
      { status: 500 }
    );
  }
}
