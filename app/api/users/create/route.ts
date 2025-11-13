import { NextRequest, NextResponse } from "next/server";
import { createUserProfile } from "@/lib/user-service";

export async function POST(request: NextRequest) {
  try {
    const { userId, displayName, photoURL, email, emailVerified } = await request.json();

    if (!userId || !displayName) {
      return NextResponse.json(
        { error: "User ID and display name are required" },
        { status: 400 }
      );
    }

    await createUserProfile(userId, displayName, photoURL, email, emailVerified);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating user profile:", error);
    return NextResponse.json(
      { error: "Failed to create user profile" },
      { status: 500 }
    );
  }
}
