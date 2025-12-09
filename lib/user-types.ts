export interface UserProfile {
  displayName: string;
  email: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  role: 'buyer' | 'seller' | 'admin' | 'superadmin';
  isSeller: boolean;
  isVerified: boolean;
  emailVerified: boolean;
  accountStatus: 'active' | 'suspended' | 'banned';
  shopId?: string | null; // ID of seller's shop
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // ✅ Violation tracking
  violations?: number; // จำนวนครั้งที่ถูกดำเนินการ
  lastViolation?: Date; // วันที่ถูกดำเนินการล่าสุด
  
  // ✅ Suspension information (พักการใช้งานชั่วคราว)
  suspendedReason?: string; // เหตุผลที่ถูกพักการใช้งาน
  suspendedBy?: string; // UID ของแอดมินที่พักการใช้งาน
  suspendedAt?: Date; // วันที่ถูกพักการใช้งาน
  
  // ✅ Ban information (แบนมีกำหนดเวลาหรือถาวร)
  banned?: boolean; // สถานะการแบน
  bannedUntil?: Date; // แบนจนถึงวันที่
  bannedReason?: string; // เหตุผลที่ถูกแบน
  bannedBy?: string; // UID ของแอดมินที่แบน
}
