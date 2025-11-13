import { NextRequest, NextResponse } from "next/server";
import { getAllUsers } from "@/lib/user-service";

export async function GET(request: NextRequest) {
  try {
    const users = await getAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error getting all users:", error);
    return NextResponse.json(
      { error: "Failed to get users" },
      { status: 500 }
    );
  }
}
