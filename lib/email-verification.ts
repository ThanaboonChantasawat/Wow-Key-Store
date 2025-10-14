/**
 * Email Verification Helper
 * ตรวจสอบว่าผู้ใช้ยืนยันอีเมลแล้วหรือยัง
 */

import { User } from "firebase/auth";

/**
 * ตรวจสอบว่า user ยืนยันอีเมลแล้วหรือยัง
 * @param user - Firebase Auth User
 * @returns true ถ้ายืนยันแล้ว, false ถ้ายังไม่ยืนยัน
 */
export function isEmailVerified(user: User | null): boolean {
  if (!user) return false;
  
  // Social login (Google/Facebook) ที่มี emailVerified = true
  if (user.emailVerified) return true;
  
  // ถ้าไม่มีอีเมลเลย ถือว่ายังไม่ verify
  if (!user.email) return false;
  
  return false;
}

/**
 * ตรวจสอบว่าต้องยืนยันอีเมลก่อนทำธุรกรรมหรือไม่
 * @param user - Firebase Auth User
 * @returns object { canProceed: boolean, message: string }
 */
export function canProceedWithTransaction(user: User | null): {
  canProceed: boolean;
  message: string;
} {
  if (!user) {
    return {
      canProceed: false,
      message: "กรุณาเข้าสู่ระบบก่อนทำธุรกรรม"
    };
  }

  if (!user.email) {
    return {
      canProceed: false,
      message: "กรุณากรอกอีเมลในหน้า Profile ก่อนทำธุรกรรม"
    };
  }

  if (!user.emailVerified) {
    return {
      canProceed: false,
      message: "กรุณายืนยันอีเมลก่อนทำธุรกรรม คุณสามารถส่งอีเมลยืนยันได้ที่หน้า Profile"
    };
  }

  return {
    canProceed: true,
    message: ""
  };
}

/**
 * รับข้อความแจ้งเตือนสำหรับผู้ที่ยังไม่ยืนยันอีเมล
 * @param user - Firebase Auth User
 * @returns ข้อความแจ้งเตือน
 */
export function getVerificationWarningMessage(user: User | null): string | null {
  if (!user) return null;
  
  if (!user.email) {
    return "⚠️ กรุณากรอกอีเมลเพื่อใช้งานฟีเจอร์เต็มรูปแบบ";
  }
  
  if (!user.emailVerified) {
    return "⚠️ กรุณายืนยันอีเมลเพื่อสามารถซื้อขายสินค้าได้";
  }
  
  return null;
}
