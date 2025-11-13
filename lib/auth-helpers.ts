import { NextRequest } from 'next/server'
import { adminAuth, adminDb } from './firebase-admin-config'

/**
 * Verify Firebase ID token from request
 */
export async function verifyIdToken(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }
    
    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    
    return decodedToken
  } catch (error) {
    console.error('Error verifying token:', error)
    return null
  }
}

/**
 * Verify Firebase ID token string directly
 */
export async function verifyIdTokenString(token: string) {
  try {
    if (!token) {
      return null
    }
    
    const decodedToken = await adminAuth.verifyIdToken(token)
    return decodedToken
  } catch (error) {
    console.error('Error verifying token string:', error)
    return null
  }
}

/**
 * Verify admin user from request
 * Returns user data if user is admin, null otherwise
 */
export async function verifyAdmin(request: NextRequest) {
  try {
    const decodedToken = await verifyIdToken(request)
    
    if (!decodedToken) {
      return null
    }
    
    // Get user data from Firestore
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get()
    
    if (!userDoc.exists) {
      return null
    }
    
    const userData = userDoc.data()
    
    // Check if user is admin or superadmin
    if (userData?.role !== 'admin' && userData?.role !== 'superadmin') {
      return null
    }
    
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: userData.role,
      ...userData
    }
  } catch (error) {
    console.error('Error verifying admin:', error)
    return null
  }
}
