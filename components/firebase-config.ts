import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBrpxxwekSACHVZ6iQlbRL0X0L5immyrSE",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "wowkeystore-cbeff.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "wowkeystore-cbeff",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "wowkeystore-cbeff.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "305244438219",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:305244438219:web:3dd7aaa98b142bf56f254e",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-GG87SPY74S"
};

// Initialize Firebase only if it hasn't been initialized yet
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Only initialize client-side services if we're in the browser
export const auth = typeof window !== 'undefined' ? getAuth(app) : null;
export const db = typeof window !== 'undefined' ? getFirestore(app) : null;
export const storage = typeof window !== 'undefined' ? getStorage(app) : null;
export const googleProvider = typeof window !== 'undefined' ? new GoogleAuthProvider() : null;