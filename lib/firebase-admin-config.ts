import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

if (!getApps().length) {
  try {
    // Use environment variables for production (Vercel)
    // Fall back to local serviceAccountKey.json for development
    let credential;
    
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // Production: use environment variable
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      credential = admin.credential.cert(serviceAccount as admin.ServiceAccount);
    } else {
      // Development: use local JSON file
      try {
        const serviceAccount = require('../serviceAccountKey.json');
        credential = admin.credential.cert(serviceAccount as admin.ServiceAccount);
      } catch (err) {
        console.error('❌ serviceAccountKey.json not found. Please add FIREBASE_SERVICE_ACCOUNT_KEY environment variable.');
        throw new Error('Firebase service account credentials not configured');
      }
    }
    
    admin.initializeApp({
      credential,
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
