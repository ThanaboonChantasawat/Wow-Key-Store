import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/user-service';
import { adminAuth } from '@/lib/firebase-admin-config';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // 1. Check Firebase Auth to get provider info
    try {
      const userRecord = await adminAuth.getUserByEmail(email);
      // User exists in Auth
      const providers = userRecord.providerData.map(p => p.providerId);
      return NextResponse.json({ exists: true, source: 'auth', providers });
    } catch (authError: any) {
      if (authError.code === 'auth/user-not-found') {
        // 2. If not in Auth, Check Firestore (fallback)
        const userInFirestore = await getUserByEmail(email);
        if (userInFirestore) {
          return NextResponse.json({ exists: true, source: 'firestore', providers: [] });
        }
        
        // User not found in either
        return NextResponse.json({ exists: false, providers: [] });
      }
      // Other auth errors
      throw authError;
    }

  } catch (error) {
    console.error('Error checking email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
