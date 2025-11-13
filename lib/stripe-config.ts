import Stripe from 'stripe';

// Safe getter to avoid throwing during build/import time
export const getStripe = (): Stripe => {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
  }
  return new Stripe(apiKey, {
    // Use a valid Stripe API version
    apiVersion: '2024-06-20',
    typescript: true,
  });
};

// Stripe Connect configuration
export const STRIPE_CONNECT_CONFIG = {
  // Test mode settings
  testMode: true,
  
  // Redirect URLs after onboarding
  refreshUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/seller?tab=payment`,
  returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/seller?tab=payment&success=true`,
  
  // Account type - Use 'standard' for Thailand
  // Thailand platforms must use Standard accounts with direct charges
  // to avoid loss-liable restrictions
  accountType: 'standard' as const,
  
  // Supported countries
  country: 'TH', // Thailand
};
