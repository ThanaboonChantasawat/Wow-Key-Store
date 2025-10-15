import { NextRequest, NextResponse } from 'next/server';
import { createStripeConnectAccount } from '@/lib/stripe-service';

export async function POST(request: NextRequest) {
  try {
    const { userId, email, shopName } = await request.json();

    console.log('Received request:', { userId, email, shopName });

    if (!userId || !email || !shopName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await createStripeConnectAccount(userId, email, shopName);

    return NextResponse.json({
      success: true,
      accountId: result.accountId,
      onboardingUrl: result.accountLink,
    });
  } catch (error: any) {
    console.error('Error in create-connect-account:', error);
    
    // Return detailed error message
    return NextResponse.json(
      { 
        error: 'Failed to create Stripe Connect account',
        details: error.message || 'Unknown error',
        type: error.type || 'api_error'
      },
      { status: 500 }
    );
  }
}
