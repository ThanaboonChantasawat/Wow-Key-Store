import { NextRequest, NextResponse } from "next/server";
import { updateLastLogin } from "@/lib/user-service";

export async function POST(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const { id } = params;

		if (!id) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 }
			);
		}

		await updateLastLogin(id);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error updating last login:", error);
		return NextResponse.json(
			{ error: "Failed to update last login" },
			{ status: 500 }
		);
	}
}

