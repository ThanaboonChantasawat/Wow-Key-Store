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
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      // Alternative: use individual environment variables
      credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
    } else {
      // Development: Fallback to Application Default Credentials
      // Make sure to run: export GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccountKey.json"
      console.warn('⚠️ Using default credentials. Set FIREBASE_SERVICE_ACCOUNT_KEY environment variable for production.');
      credential = admin.credential.applicationDefault();
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
    throw error;
  }
}

const adminDb = admin.firestore();
const adminAuth = admin.auth();
const adminStorage = admin.storage();

export { adminDb, adminAuth, adminStorage };
