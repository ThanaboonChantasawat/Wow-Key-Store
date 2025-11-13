import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin-config";

// This endpoint returns a signed upload URL for client-side upload
// This avoids CORS issues and server-side storage bucket problems
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get filename from request
    const { filename, contentType } = await request.json();

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "Filename and contentType are required" },
        { status: 400 }
      );
    }

    // Validate content type
    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Generate path
    const timestamp = Date.now();
    const filePath = `shop-logos/${userId}/${timestamp}_${filename}`;

    // Return the path for client-side upload
    // Client will use Firebase Client SDK to upload directly
    return NextResponse.json({
      uploadPath: filePath,
      userId: userId,
    });
  } catch (error: any) {
    console.error("Error generating upload path:", error);
    return NextResponse.json(
      { error: "Failed to generate upload path" },
      { status: 500 }
    );
  }
}
