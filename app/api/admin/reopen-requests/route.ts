import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase-admin-config';
import { verifyIdTokenString } from '@/lib/auth-helpers';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    // Verify Admin
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = await verifyIdTokenString(authHeader.substring(7));
    const userId = token.uid;

    // Check if user is admin
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (!userData || !['admin', 'superadmin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { requestId, action, reviewNote } = body;

    if (!requestId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const requestRef = adminDb.collection('reopenRequests').doc(requestId);
    const requestSnap = await requestRef.get();

    if (!requestSnap.exists) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const requestData = requestSnap.data()!;

    if (action === 'approve') {
      // 1. Update request status
      await requestRef.update({
        status: 'approved',
        reviewedBy: userId,
        reviewedAt: FieldValue.serverTimestamp(),
        reviewNote: reviewNote || '',
        updatedAt: FieldValue.serverTimestamp(),
      });

      // 2. Unsuspend shop
      if (requestData.shopId) {
        await adminDb.collection('shops').doc(requestData.shopId).update({
          status: 'active',
          updatedAt: FieldValue.serverTimestamp()
        });
      }

      // 3. Delete other pending requests for this shop
      const otherRequestsSnapshot = await adminDb.collection('reopenRequests')
        .where('shopId', '==', requestData.shopId)
        .get();

      const batch = adminDb.batch();
      const bucket = adminStorage.bucket();

      for (const doc of otherRequestsSnapshot.docs) {
        if (doc.id === requestId) continue; // Skip current approved request

        const otherData = doc.data();
        
        // Delete files
        if (otherData.documentUrls && Array.isArray(otherData.documentUrls)) {
          for (const url of otherData.documentUrls) {
            try {
              // Extract file path from URL or store path in DB (better). 
              // Assuming we can't easily parse URL to path without regex, 
              // but here we might need to rely on client logic or store paths.
              // For now, let's skip file deletion here or try to parse if possible.
              // Ideally, we should store storage paths, not just download URLs.
              
              // Simple attempt to parse path from standard Firebase Storage URL
              // https://firebasestorage.googleapis.com/v0/b/bucket/o/path%2Fto%2Ffile?alt=media...
              const matches = url.match(/\/o\/(.+)\?alt=media/);
              if (matches && matches[1]) {
                const filePath = decodeURIComponent(matches[1]);
                await bucket.file(filePath).delete().catch(e => console.warn('Failed to delete file', filePath, e));
              }
            } catch (e) {
              console.warn('Error deleting file for request', doc.id, e);
            }
          }
        }

        batch.delete(doc.ref);
      }
      
      await batch.commit();

    } else if (action === 'reject') {
      await requestRef.update({
        status: 'rejected',
        reviewedBy: userId,
        reviewedAt: FieldValue.serverTimestamp(),
        reviewNote: reviewNote || '',
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error processing reopen request:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
