import { NextRequest, NextResponse } from "next/server";
import { getRecentAdminActivities } from "@/lib/admin-activity-service";
import { verifyIdTokenString } from '@/lib/auth-helpers';
import { adminDb } from '@/lib/firebase-admin-config';

export async function GET(request: NextRequest) {
  try {
    // ✅ Require authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = await verifyIdTokenString(authHeader.substring(7))
    const userId = token?.uid

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const targetUserId = searchParams.get("targetUserId"); // ✅ เพิ่มการกรองตาม targetUserId

    // ✅ ถ้าขอดูของตัวเอง ให้ดูได้เลย (ไม่ต้องเป็น superadmin)
    if (targetUserId) {
      // Verify user is requesting their own data
      if (targetUserId !== userId) {
        return NextResponse.json(
          { error: 'Forbidden: You can only view your own violation history' },
          { status: 403 }
        )
      }

      // ✅ ใช้ affectedUserId สำหรับ record ใหม่ (หลังอัปเดต)
      // Fallback ไปหา targetId/details สำหรับ record เก่า
      const activitiesSnapshot = await adminDb
        .collection('adminActivities')
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get()

      const activities = activitiesSnapshot.docs
        .map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
        }))
        .filter((activity: any) => {
          // ✅ วิธีใหม่: มี affectedUserId ตรงกับ targetUserId
          if (activity.affectedUserId === targetUserId) {
            return true
          }
          
          // ⚠️ Fallback สำหรับ record เก่า (ก่อนอัปเดต):
          // กรณีที่ 1: targetType='user' AND targetId=userId (แบน)
          if (activity.targetId === targetUserId && activity.targetType === 'user') {
            return true
          }
          
          // กรณีที่ 2: details มี userId (ลบเนื้อหา)
          if (activity.details && activity.details.includes(targetUserId)) {
            return true
          }
          
          return false
        })
        .slice(0, limit)

      console.log(`✅ Found ${activities.length} activities for user ${targetUserId}`)

      return NextResponse.json({ activities });
    }

    // ✅ ถ้าไม่ระบุ targetUserId = ขอดูทั้งหมด = ต้องเป็น superadmin
    const userDoc = await adminDb.collection('users').doc(userId!).get()
    const userData = userDoc.data()
    const userRole = userData?.role || 'buyer'

    console.log('🔍 Checking admin access:', {
      userId,
      userRole,
      requiredRole: 'superadmin or admin',
      hasAccess: userRole === 'superadmin' || userRole === 'admin'
    })

    if (userRole !== 'superadmin' && userRole !== 'admin') {
      console.log('❌ Access denied: User is not admin')
      return NextResponse.json(
        { error: 'Forbidden: Admin access required to view admin activities' },
        { status: 403 }
      )
    }

    console.log('✅ Fetching activities...')
    const activities = await getRecentAdminActivities(limit);
    console.log(`📊 Found ${activities.length} activities`)

    return NextResponse.json({ activities });
  } catch (error) {
    console.error("Error fetching admin activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin activities" },
      { status: 500 }
    );
  }
}
