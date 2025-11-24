// Shop type definition (separate from service to avoid importing firebase-admin in client components)

import { BankAccount } from './bank-account-types'

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
  
  // Multi-account bank information for payouts (NEW - Shopee style)
  bankAccounts?: BankAccount[];
  
  // Legacy single account fields (kept for backward compatibility, will be deprecated)
  bankAccountNumber?: string;
  bankName?: string;
  bankAccountName?: string;
  bankBranch?: string;
  promptPayId?: string;
  promptPayType?: 'mobile' | 'citizen_id' | 'ewallet';
  enableBank?: boolean;
  enablePromptPay?: boolean;
  taxId?: string; // เลขประจำตัวผู้เสียภาษี (สำหรับนิติบุคคล)
}
