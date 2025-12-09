import { NextRequest, NextResponse } from "next/server";
import { updateUserProfile } from "@/lib/user-service";
import { verifyIdToken, checkUserBanStatus } from "@/lib/auth-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Verify authentication
    const token = await verifyIdToken(request);
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Ensure user is updating their own profile or is admin
    // For now, let's just check if the token uid matches the id in params
    if (token.uid !== id) {
      // TODO: Add admin check here if admins should be allowed to update other users
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }
    
    // Check if user is banned
    const banError = await checkUserBanStatus(id);
    if (banError) {
      return NextResponse.json({ error: banError }, { status: 403 });
    }

    const body = await request.json();
    
    // Filter allowed fields to update
    const allowedFields = ['displayName', 'photoURL', 'phoneNumber', 'email'];
    const updates: any = {};
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }
    
    await updateUserProfile(id, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update user profile" },
      { status: 500 }
    );
  }
}
