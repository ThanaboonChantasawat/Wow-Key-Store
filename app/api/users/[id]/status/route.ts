import { NextRequest, NextResponse } from "next/server";
import { updateUserStatus } from "@/lib/user-service";

export async function POST(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const { id } = params;
		const { status } = await request.json();

		if (!id || !status) {
			return NextResponse.json(
				{ error: "User ID and status are required" },
				{ status: 400 }
			);
		}

		await updateUserStatus(id, status);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error updating user status:", error);
		return NextResponse.json(
			{ error: "Failed to update user status" },
			{ status: 500 }
		);
	}
}

