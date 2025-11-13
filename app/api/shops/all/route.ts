import { NextRequest, NextResponse } from "next/server";
import { getAllShops } from "@/lib/shop-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as 'pending' | 'active' | 'rejected' | 'suspended' | 'closed' | null;

    const shops = await getAllShops(status || undefined);

    return NextResponse.json(shops);
  } catch (error) {
    console.error("Error fetching shops:", error);
    return NextResponse.json(
      { error: "Failed to fetch shops" },
      { status: 500 }
    );
  }
}
