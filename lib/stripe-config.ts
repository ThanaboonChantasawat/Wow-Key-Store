import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

// Initialize Stripe with TypeScript support
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-09-30.clover',
  typescript: true,
});

// Stripe Connect configuration
export const STRIPE_CONNECT_CONFIG = {
  // Test mode settings
  testMode: true,
  
  // Redirect URLs after onboarding
  refreshUrl: `${process.env.NEXT_PUBLIC_APP_URL}/seller?tab=payment`,
  returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/seller?tab=payment&success=true`,
  
  // Account type - Use 'standard' for Thailand
  // Thailand platforms must use Standard accounts with direct charges
  // to avoid loss-liable restrictions
  accountType: 'standard' as const,
  
  // Supported countries
  country: 'TH', // Thailand
};
