import { NextRequest, NextResponse } from 'next/server';
import { createLoginLink } from '@/lib/stripe-service';

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    console.log('Creating dashboard link for account:', accountId);

    const dashboardUrl = await createLoginLink(accountId);

    console.log('Dashboard URL created:', dashboardUrl);

    return NextResponse.json({
      success: true,
      dashboardUrl,
    });
  } catch (error: any) {
    console.error('Error in create-dashboard-link:', error);
    
    // Check if it's a Stripe error
    const errorMessage = error.message || 'Failed to create dashboard link';
    const errorType = error.type || 'unknown';
    
    return NextResponse.json(
      { 
        error: 'Failed to create dashboard link',
        details: errorMessage,
        type: errorType,
      },
      { status: 500 }
    );
  }
}
