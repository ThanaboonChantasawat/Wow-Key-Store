import { NextRequest, NextResponse } from "next/server";
import { updateUserRole, getUserProfile } from "@/lib/user-service";
import { logActivity } from "@/lib/admin-activity-service";
import { cookies } from "next/headers";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const { role } = await request.json();

		if (!id || !role) {
			return NextResponse.json(
				{ error: "User ID and role are required" },
				{ status: 400 }
			);
		}

		// Get admin ID from session
		const cookieStore = await cookies();
		const adminId = cookieStore.get("userId")?.value;

		// 🛡️ Prevent superadmin from demoting themselves
		if (adminId && adminId === id) {
			const adminProfile = await getUserProfile(adminId);
			if (adminProfile?.role === 'superadmin' && role !== 'superadmin') {
				return NextResponse.json(
					{ error: "คุณไม่สามารถปลด superadmin ของตัวเองได้" },
					{ status: 403 }
				);
			}
		}

		// Get user info before update for logging
		const userProfile = await getUserProfile(id);

		await updateUserRole(id, role);

		// 📝 Log admin activity
		if (adminId && userProfile) {
			try {
				await logActivity(
					adminId,
					'update_user_role',
					`Updated user role: ${userProfile.displayName || userProfile.email || id} from ${userProfile.role} to ${role}`,
					{ userId: id, oldRole: userProfile.role, newRole: role, userEmail: userProfile.email, targetType: 'user', targetId: id, targetName: userProfile.email || '', affectedUserId: id }
				);
			} catch (logError) {
				console.error("Error logging admin activity:", logError);
			}
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error updating user role:", error);
		return NextResponse.json(
			{ error: "Failed to update user role" },
			{ status: 500 }
		);
	}
}

