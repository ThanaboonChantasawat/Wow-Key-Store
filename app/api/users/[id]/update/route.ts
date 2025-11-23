import { NextRequest, NextResponse } from "next/server";
import { updateUserProfile } from "@/lib/user-service";
import { verifyIdToken } from "@/lib/auth-helpers";

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

    const body = await request.json();
    
    // Filter allowed fields to update
    // We should probably validate the body here
    // For now, we pass it to the service which takes Partial<UserProfile>
    
    await updateUserProfile(id, body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update user profile" },
      { status: 500 }
    );
  }
}
