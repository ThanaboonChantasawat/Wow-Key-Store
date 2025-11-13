import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';
import serviceAccount from '../serviceAccountKey.json';

if (!getApps().length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      databaseURL: "https://wowkeystore-cbeff.firebaseio.com",
      storageBucket: "wowkeystore-cbeff.firebasestorage.app"
    });
    console.log('✅ Firebase Admin initialized successfully');
    console.log('📦 Storage bucket:', admin.storage().bucket().name);
  } catch (error) {
    console.error('❌ Firebase admin initialization error', error);
  }
}

const adminDb = admin.firestore();
const adminAuth = admin.auth();
const adminStorage = admin.storage();

export { adminDb, adminAuth, adminStorage };
