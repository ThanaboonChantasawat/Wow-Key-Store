// Bank account type definitions for multi-account support

export interface BankAccount {
  id: string; // Unique identifier for the account
  accountType: 'bank' | 'promptpay';
  
  // Bank account fields
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  bankBranch?: string;
  
  // PromptPay fields
  promptPayId?: string; // เบอร์โทร หรือ เลขบัตรประชาชน
  promptPayType?: 'mobile' | 'citizen_id' | 'ewallet';
  
  // Status
  isDefault: boolean; // บัญชีหลัก/ค่าเริ่มต้น
  isEnabled: boolean; // เปิดใช้งานหรือไม่
  isVerified?: boolean; // ยืนยันบัญชีแล้วหรือไม่
  verificationStatus?: 'pending' | 'verified' | 'failed'; // สถานะการยืนยัน
  
  // Omise integration
  omiseRecipientId?: string; // Omise Recipient ID
  testTransferId?: string; // Test transfer ID for verification
  
  // Metadata
  displayName?: string; // ชื่อแสดงที่ผู้ใช้ตั้งเอง (เช่น "บัญชีหลัก", "บัญชีรอง")
  createdAt: Date;
  updatedAt: Date;
  verifiedAt?: Date; // เวลาที่ยืนยันบัญชี
}

export interface BankAccountInput {
  accountType: 'bank' | 'promptpay';
  
  // Bank fields (required if accountType === 'bank')
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  bankBranch?: string;
  
  // PromptPay fields (required if accountType === 'promptpay')
  promptPayId?: string;
  promptPayType?: 'mobile' | 'citizen_id' | 'ewallet';
  
  // Optional
  displayName?: string;
  isDefault?: boolean;
  isEnabled?: boolean;
}

export interface BankAccountUpdate extends Partial<BankAccountInput> {
  id: string;
}
