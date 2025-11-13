import { NextRequest, NextResponse } from "next/server";
import { getTopShopsBySales } from "@/lib/shop-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");

    const shops = await getTopShopsBySales(limit);

    return NextResponse.json(shops);
  } catch (error) {
    console.error("Error fetching top shops:", error);
    return NextResponse.json(
      { error: "Failed to fetch top shops" },
      { status: 500 }
    );
  }
}
