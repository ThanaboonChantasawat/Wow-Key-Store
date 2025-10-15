import { stripe, STRIPE_CONNECT_CONFIG } from './stripe-config';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/components/firebase-config';

export interface StripeAccountInfo {
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  created: number;
  country: string;
  currency: string;
}

/**
 * Create a Stripe Connect Account for a seller
 */
export async function createStripeConnectAccount(
  userId: string,
  email: string,
  shopName: string
): Promise<{ accountId: string; accountLink: string }> {
  try {
    console.log('Creating Stripe Connect account for:', { userId, email, shopName });
    
    // Create Stripe Connect account for Thailand
    // Must include both card_payments and transfers capabilities
    const account = await stripe.accounts.create({
      type: STRIPE_CONNECT_CONFIG.accountType,
      country: STRIPE_CONNECT_CONFIG.country,
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }, // Required with card_payments
      },
      metadata: {
        userId: userId,
        shopName: shopName,
      },
    });

    console.log('Stripe account created:', account.id);

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: STRIPE_CONNECT_CONFIG.refreshUrl,
      return_url: STRIPE_CONNECT_CONFIG.returnUrl,
      type: 'account_onboarding',
    });

    console.log('Account link created:', accountLink.url);

    // Save Stripe account ID to Firestore
    const shopRef = doc(db, 'shops', `shop_${userId}`);
    await updateDoc(shopRef, {
      stripeAccountId: account.id,
      stripeAccountStatus: 'incomplete',
      stripeOnboardingCompleted: false,
      updatedAt: new Date(),
    });

    return {
      accountId: account.id,
      accountLink: accountLink.url,
    };
  } catch (error) {
    console.error('Error creating Stripe Connect account:', error);
    throw error;
  }
}

/**
 * Get Stripe Connect account details
 */
export async function getStripeAccountInfo(
  accountId: string
): Promise<StripeAccountInfo | null> {
  try {
    const account = await stripe.accounts.retrieve(accountId);

    return {
      accountId: account.id,
      chargesEnabled: account.charges_enabled || false,
      payoutsEnabled: account.payouts_enabled || false,
      detailsSubmitted: account.details_submitted || false,
      created: account.created || 0,
      country: account.country || '',
      currency: account.default_currency || 'thb',
    };
  } catch (error) {
    console.error('Error retrieving Stripe account:', error);
    return null;
  }
}

/**
 * Create account link for existing account (for re-onboarding or updates)
 */
export async function createAccountLink(
  accountId: string
): Promise<string> {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: STRIPE_CONNECT_CONFIG.refreshUrl,
      return_url: STRIPE_CONNECT_CONFIG.returnUrl,
      type: 'account_onboarding',
    });

    return accountLink.url;
  } catch (error) {
    console.error('Error creating account link:', error);
    throw error;
  }
}

/**
 * Create login link for existing account (to access Stripe Dashboard)
 */
export async function createLoginLink(
  accountId: string
): Promise<string> {
  try {
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    return loginLink.url;
  } catch (error) {
    console.error('Error creating login link:', error);
    throw error;
  }
}

/**
 * Update shop's Stripe account status in Firestore
 */
export async function updateShopStripeStatus(
  userId: string,
  accountId: string
): Promise<void> {
  try {
    const accountInfo = await getStripeAccountInfo(accountId);
    
    if (!accountInfo) {
      throw new Error('Failed to retrieve Stripe account info');
    }

    const shopRef = doc(db, 'shops', `shop_${userId}`);
    await updateDoc(shopRef, {
      stripeAccountId: accountId,
      stripeAccountStatus: accountInfo.chargesEnabled && accountInfo.payoutsEnabled ? 'active' : 'incomplete',
      stripeOnboardingCompleted: accountInfo.detailsSubmitted,
      stripeChargesEnabled: accountInfo.chargesEnabled,
      stripePayoutsEnabled: accountInfo.payoutsEnabled,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error updating shop Stripe status:', error);
    throw error;
  }
}

/**
 * Update shop Stripe status with provided data (no API call)
 */
export async function updateShopStripeStatusDirect(
  userId: string,
  statusData: {
    accountId: string
    chargesEnabled: boolean
    payoutsEnabled: boolean
    detailsSubmitted: boolean
  }
): Promise<void> {
  try {
    const shopRef = doc(db, 'shops', `shop_${userId}`);
    await updateDoc(shopRef, {
      stripeAccountId: statusData.accountId,
      stripeAccountStatus: statusData.chargesEnabled && statusData.payoutsEnabled ? 'active' : 'incomplete',
      stripeOnboardingCompleted: statusData.detailsSubmitted,
      stripeChargesEnabled: statusData.chargesEnabled,
      stripePayoutsEnabled: statusData.payoutsEnabled,
      updatedAt: new Date(),
    });
    console.log('Shop Stripe status updated successfully');
  } catch (error) {
    console.error('Error updating shop Stripe status:', error);
    throw error;
  }
}

/**
 * Check if shop can receive payments
 */
export async function canReceivePayments(userId: string): Promise<boolean> {
  try {
    const shopRef = doc(db, 'shops', `shop_${userId}`);
    const shopSnap = await getDoc(shopRef);
    
    if (!shopSnap.exists()) {
      return false;
    }

    const shopData = shopSnap.data();
    const stripeAccountId = shopData.stripeAccountId;

    if (!stripeAccountId) {
      return false;
    }

    const accountInfo = await getStripeAccountInfo(stripeAccountId);
    
    return accountInfo?.chargesEnabled === true && accountInfo?.payoutsEnabled === true;
  } catch (error) {
    console.error('Error checking payment capability:', error);
    return false;
  }
}
