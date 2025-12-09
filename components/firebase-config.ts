'use client'

import { initializeApp, getApps } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBrpxxwekSACHVZ6iQlbRL0X0L5immyrSE',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'wowkeystore-cbeff.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'wowkeystore-cbeff',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'wowkeystore-cbeff.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '305244438219',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:305244438219:web:3dd7aaa98b142bf56f254e',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-GG87SPY74S',
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)

// Initialize Firestore with optimized settings to prevent QUIC errors
let db: ReturnType<typeof getFirestore>
if (getApps().length === 1) {
  // Only initialize once to avoid "Firestore has already been initialized" error
  try {
    db = initializeFirestore(app, {
      // Use long-polling instead of QUIC/WebChannel to avoid ERR_QUIC_PROTOCOL_ERROR
      experimentalAutoDetectLongPolling: true,
      // Enable offline persistence with multi-tab support
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    })
  } catch (error) {
    console.warn('Firestore already initialized, using existing instance')
    db = getFirestore(app)
  }
} else {
  db = getFirestore(app)
}

export const auth = getAuth(app)
export { db }
export const storage = getStorage(app)
export const googleProvider = new GoogleAuthProvider()