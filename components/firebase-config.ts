import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } 
from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCoEqY9Ax40ucR7P1LDXrphXuQ7yyRaW74",
  authDomain: "wowkeystore.firebaseapp.com",
  projectId: "wowkeystore",
  storageBucket: "wowkeystore.firebasestorage.app",
  messagingSenderId: "537411532355",
  appId: "1:537411532355:web:c20cc97469cb040325c6f6",
  measurementId: "G-D0XMP82TRP"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

// เพิ่ม scope สำหรับขอ email จาก Facebook
facebookProvider.addScope('email');
facebookProvider.addScope('public_profile');