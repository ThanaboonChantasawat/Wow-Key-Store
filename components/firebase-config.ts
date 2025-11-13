import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBrpxxwekSACHVZ6iQlbRL0X0L5immyrSE",
  authDomain: "wowkeystore-cbeff.firebaseapp.com",
  projectId: "wowkeystore-cbeff",
  storageBucket: "wowkeystore-cbeff.firebasestorage.app",
  messagingSenderId: "305244438219",
  appId: "1:305244438219:web:3dd7aaa98b142bf56f254e",
  measurementId: "G-GG87SPY74S"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();