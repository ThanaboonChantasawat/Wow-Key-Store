import { NextRequest, NextResponse } from "next/server";
import { updateAccountStatus } from "@/lib/user-service";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const { status } = await request.json();

		if (!id || !status) {
			return NextResponse.json(
				{ error: "User ID and status are required" },
				{ status: 400 }
			);
		}

		// Map incoming status to allowed values in updateAccountStatus
		const allowedStatuses = ["active", "banned"] as const;
		if (!allowedStatuses.includes(status)) {
			return NextResponse.json(
				{ error: "Invalid status value" },
				{ status: 400 }
			);
		}

		await updateAccountStatus(id, status);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error updating user status:", error);
		return NextResponse.json(
			{ error: "Failed to update user status" },
			{ status: 500 }
		);
	}
}

