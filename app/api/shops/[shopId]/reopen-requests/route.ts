import { NextRequest, NextResponse } from "next/server";
import { deleteAllReopenRequestsByShopId } from "@/lib/reopen-request-service";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { shopId } = await params;

    if (!shopId) {
      return NextResponse.json(
        { error: "Shop ID is required" },
        { status: 400 }
      );
    }

    await deleteAllReopenRequestsByShopId(shopId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting reopen requests:", error);
    return NextResponse.json(
      { error: "Failed to delete reopen requests" },
      { status: 500 }
    );
  }
}
