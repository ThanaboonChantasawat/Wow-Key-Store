import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  getDocs,
  serverTimestamp,
  Timestamp
} from "firebase/firestore"
import { db } from "@/components/firebase-config"

export interface AdminActivity {
  id: string
  adminId: string
  adminName: string
  adminEmail: string
  action: string // 'approve_shop', 'reject_shop', 'suspend_shop', 'unsuspend_shop', 'change_role', 'delete_user', etc.
  targetType: string // 'shop', 'user', 'product', 'order', 'game', 'category'
  targetId: string
  targetName: string
  details: string // คำอธิบายเพิ่มเติม
  createdAt: Timestamp
}

// บันทึกกิจกรรม Admin
export async function logAdminActivity(
  adminId: string,
  adminName: string,
  adminEmail: string,
  action: string,
  targetType: string,
  targetId: string,
  targetName: string,
  details: string
): Promise<void> {
  try {
    await addDoc(collection(db, "adminActivities"), {
      adminId,
      adminName,
      adminEmail,
      action,
      targetType,
      targetId,
      targetName,
      details,
      createdAt: serverTimestamp()
    })
  } catch (error) {
    console.error("Error logging admin activity:", error)
    throw error
  }
}

// ดึงกิจกรรมล่าสุด
export async function getRecentAdminActivities(limitCount: number = 10): Promise<AdminActivity[]> {
  try {
    const q = query(
      collection(db, "adminActivities"),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    )
    
    const snapshot = await getDocs(q)
    const activities: AdminActivity[] = []
    
    snapshot.forEach((doc) => {
      activities.push({
        id: doc.id,
        ...doc.data()
      } as AdminActivity)
    })
    
    return activities
  } catch (error) {
    console.error("Error fetching admin activities:", error)
    return []
  }
}

// Helper functions สำหรับสร้างข้อความอธิบาย
export function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    'approve_shop': 'อนุมัติร้านค้า',
    'reject_shop': 'ปฏิเสธร้านค้า',
    'suspend_shop': 'ระงับร้านค้า',
    'unsuspend_shop': 'ยกเลิกระงับร้านค้า',
    'change_role': 'เปลี่ยนบทบาทผู้ใช้',
    'change_user_status': 'เปลี่ยนสถานะผู้ใช้',
    'delete_user': 'ลบผู้ใช้',
    'approve_reopen': 'อนุมัติคำขอเปิดร้านค้า',
    'reject_reopen': 'ปฏิเสธคำขอเปิดร้านค้า',
    'delete_reopen': 'ลบคำขอเปิดร้านค้า',
    'create_game': 'เพิ่มเกมใหม่',
    'update_game': 'แก้ไขเกม',
    'delete_game': 'ลบเกม',
    'create_category': 'เพิ่มหมวดหมู่ใหม่',
    'update_category': 'แก้ไขหมวดหมู่',
    'delete_category': 'ลบหมวดหมู่'
  }
  return labels[action] || action
}

export function getActionIcon(action: string): string {
  if (action.includes('approve')) return '✅'
  if (action.includes('reject')) return '❌'
  if (action.includes('suspend')) return '🚫'
  if (action.includes('unsuspend')) return '✅'
  if (action.includes('delete')) return '🗑️'
  if (action.includes('create') || action.includes('add')) return '➕'
  if (action.includes('update') || action.includes('edit') || action.includes('change')) return '✏️'
  return '📝'
}

export function getActionColor(action: string): string {
  if (action.includes('approve') || action.includes('unsuspend')) return 'from-green-500 to-green-600'
  if (action.includes('reject')) return 'from-red-500 to-red-600'
  if (action.includes('suspend')) return 'from-orange-500 to-orange-600'
  if (action.includes('delete')) return 'from-red-500 to-red-600'
  if (action.includes('create')) return 'from-blue-500 to-blue-600'
  if (action.includes('update') || action.includes('change')) return 'from-yellow-500 to-yellow-600'
  return 'from-gray-500 to-gray-600'
}
