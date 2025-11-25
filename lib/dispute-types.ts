// Dispute (Complaint) System Types

export type DisputeStatus = 'pending' | 'investigating' | 'resolved' | 'rejected'

export type DisputeType = 
  | 'wrong_code'           // รหัสผิด/ไม่ถูกต้อง
  | 'code_not_working'     // รหัสใช้ไม่ได้
  | 'code_already_used'    // รหัสถูกใช้ไปแล้ว
  | 'no_code_received'     // ไม่ได้รับรหัส
  | 'seller_unresponsive'  // ผู้ขายไม่ตอบ
  | 'other'                // อื่น ๆ

export interface Dispute {
  id: string
  orderId: string
  orderNumber?: string // สำหรับแสดงผล
  userId: string        // ผู้ซื้อที่รายงาน
  shopId: string
  sellerId: string      // ownerId ของร้าน
  
  type: DisputeType
  subject: string       // หัวข้อปัญหา
  description: string   // รายละเอียดปัญหา
  evidence?: string[]   // URLs ของหลักฐาน (screenshots)
  
  status: DisputeStatus
  
  // Admin response
  adminResponse?: string
  resolvedBy?: string   // Admin ID ที่จัดการ
  resolvedAt?: Date
  resolution?: 'refund' | 'resend_code' | 'dismiss'
  
  createdAt: Date
  updatedAt: Date
}

export interface CreateDisputeRequest {
  orderId: string
  type: DisputeType
  subject: string
  description: string
  evidence?: string[]
}
