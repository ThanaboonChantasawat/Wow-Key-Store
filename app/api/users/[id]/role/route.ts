import { NextRequest, NextResponse } from "next/server";
import { updateUserRole } from "@/lib/user-service";

export async function POST(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const { id } = params;
		const { role } = await request.json();

		if (!id || !role) {
			return NextResponse.json(
				{ error: "User ID and role are required" },
				{ status: 400 }
			);
		}

		await updateUserRole(id, role);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error updating user role:", error);
		return NextResponse.json(
			{ error: "Failed to update user role" },
			{ status: 500 }
		);
	}
}

