import { NextRequest, NextResponse } from 'next/server';
import { getStripeAccountInfo } from '@/lib/stripe-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    const accountInfo = await getStripeAccountInfo(accountId);

    if (!accountInfo) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      account: accountInfo,
    });
  } catch (error) {
    console.error('Error in get-account-status:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve account status' },
      { status: 500 }
    );
  }
}
