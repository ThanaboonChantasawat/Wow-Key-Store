// Shop type definition (separate from service to avoid importing firebase-admin in client components)
export interface Shop {
  shopId: string;
  ownerId: string;
  shopName: string;
  description: string;
  logoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  facebookUrl?: string;
  lineId?: string;
  idCardNumber?: string;
  businessRegistration?: string;
  status: 'pending' | 'active' | 'rejected' | 'suspended' | 'closed';
  verificationStatus: 'pending' | 'verified' | 'rejected';
  rejectionReason?: string;
  suspensionReason?: string;
  suspendedBy?: string;
  suspendedAt?: Date;
  verifiedBy?: string;
  verifiedAt?: Date;
  totalProducts: number;
  totalSales: number;
  totalRevenue: number;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
  // Stripe Connect fields
  stripeAccountId?: string | null;
  stripeAccountStatus?: 'active' | 'incomplete' | null;
  stripeOnboardingCompleted?: boolean;
  stripeChargesEnabled?: boolean;
  stripePayoutsEnabled?: boolean;
  
  // Bank account information for payouts
  bankAccountNumber?: string;
  bankName?: string;
  bankAccountName?: string;
  bankBranch?: string;
  promptPayId?: string; // เบอร์โทร หรือ เลขบัตรประชาชน สำหรับ PromptPay
  promptPayType?: 'mobile' | 'citizen_id' | 'ewallet'; // ประเภท PromptPay
  taxId?: string; // เลขประจำตัวผู้เสียภาษี (สำหรับนิติบุคคล)
}
