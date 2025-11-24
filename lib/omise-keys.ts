/**
 * Get Omise API Keys based on current mode (test/live)
 */

import { adminDb } from './firebase-admin-config'

interface OmiseKeys {
  publicKey: string
  secretKey: string
  mode: 'test' | 'live'
}

let cachedKeys: OmiseKeys | null = null
let lastFetch = 0
const CACHE_TTL = 60000 // 1 minute cache

export async function getOmiseKeys(): Promise<OmiseKeys> {
  // Return cached keys if still valid
  if (cachedKeys && Date.now() - lastFetch < CACHE_TTL) {
    return cachedKeys
  }

  try {
    const settingsRef = adminDb.collection('settings').doc('omise')
    const doc = await settingsRef.get()

    let mode: 'test' | 'live' = 'test'
    let publicKey = process.env.OMISE_PUBLIC_KEY || ''
    let secretKey = process.env.OMISE_SECRET_KEY || ''

    if (doc.exists) {
      const data = doc.data()
      mode = data?.mode || 'test'
      
      // Get keys from Firestore if available
      if (data?.keys) {
        const modeKeys = data.keys[mode]
        if (modeKeys?.publicKey && modeKeys?.secretKey) {
          publicKey = modeKeys.publicKey
          secretKey = modeKeys.secretKey
        }
      }
    }

    // Fallback to environment variables if no keys in Firestore
    if (!publicKey || !secretKey) {
      publicKey = process.env.OMISE_PUBLIC_KEY || ''
      secretKey = process.env.OMISE_SECRET_KEY || ''
      
      // Detect mode from key prefix if not set
      if (publicKey.startsWith('pkey_test_') || secretKey.startsWith('skey_test_')) {
        mode = 'test'
      } else if (publicKey.startsWith('pkey_') || secretKey.startsWith('skey_')) {
        mode = 'live'
      }
    }

    cachedKeys = { publicKey, secretKey, mode }
    lastFetch = Date.now()

    console.log(`🔑 Omise Keys Mode: ${mode}`)
    console.log(`🔑 Public Key: ${publicKey.substring(0, 15)}...`)
    
    return cachedKeys
  } catch (error) {
    console.error('Error getting Omise keys:', error)
    
    // Fallback to environment variables
    const publicKey = process.env.OMISE_PUBLIC_KEY || ''
    const secretKey = process.env.OMISE_SECRET_KEY || ''
    const mode: 'test' | 'live' = publicKey.startsWith('pkey_test_') ? 'test' : 'live'
    
    return { publicKey, secretKey, mode }
  }
}

// Clear cache (useful for testing)
export function clearOmiseKeysCache() {
  cachedKeys = null
  lastFetch = 0
}
