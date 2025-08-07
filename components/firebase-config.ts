import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCoEqY9Ax40ucR7P1LDXrphXuQ7yyRaW74",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "wowkeystore.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "wowkeystore",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "wowkeystore.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "537411532355",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:537411532355:web:c20cc97469cb040325c6f6",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-D0XMP82TRP"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Configure providers
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

export const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope('email');