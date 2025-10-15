import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '@/components/firebase-config';

/**
 * Reset Stripe account data in Firestore
 * Use this when you delete a Stripe account in Dashboard
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    console.log('Resetting Stripe account for user:', userId);

    // Remove Stripe data from Firestore
    const shopRef = doc(db, 'shops', `shop_${userId}`);
    await updateDoc(shopRef, {
      stripeAccountId: deleteField(),
      stripeAccountStatus: deleteField(),
      stripeOnboardingCompleted: deleteField(),
      stripeChargesEnabled: deleteField(),
      stripePayoutsEnabled: deleteField(),
    });

    console.log('✅ Stripe account data cleared successfully');

    return NextResponse.json({
      success: true,
      message: 'Stripe account reset successfully. You can now create a new account.',
    });
  } catch (error: any) {
    console.error('Error resetting Stripe account:', error);
    return NextResponse.json(
      { 
        error: 'Failed to reset Stripe account',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
