import { NextRequest, NextResponse } from 'next/server';
import { createAccountLink } from '@/lib/stripe-service';

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    const onboardingUrl = await createAccountLink(accountId);

    return NextResponse.json({
      success: true,
      onboardingUrl,
    });
  } catch (error) {
    console.error('Error in create-account-link:', error);
    return NextResponse.json(
      { error: 'Failed to create account link' },
      { status: 500 }
    );
  }
}
