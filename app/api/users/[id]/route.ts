import { NextRequest, NextResponse } from "next/server";
import { getUserProfile } from "@/lib/user-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const user = await getUserProfile(id);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Serialize to JSON-safe format
    const serializedUser = {
      uid: user.uid || id, // Use user.uid or fallback to id parameter
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || null,
      role: user.role || 'buyer',
      isSeller: user.isSeller || false,
      shopId: user.shopId || null,
      accountStatus: user.accountStatus || 'active',
      emailVerified: user.emailVerified || false,
      phoneNumber: user.phoneNumber || null,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: user.updatedAt ? user.updatedAt.toISOString() : new Date().toISOString(),
    };

    return NextResponse.json(serializedUser);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}
