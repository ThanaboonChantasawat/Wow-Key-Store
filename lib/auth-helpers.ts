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

/**
 * Verify user is not banned
 * Returns error message if user is banned, null if user is allowed to proceed
 * @param userId - User ID to check
 * @param allowSupport - If true, allows banned users to contact support team (default: false)
 */
export async function checkUserBanStatus(userId: string, allowSupport: boolean = false): Promise<string | null> {
  try {
    const userDoc = await adminDb.collection('users').doc(userId).get()
    
    if (!userDoc.exists) {
      return 'User not found'
    }
    
    const userData = userDoc.data()
    
    // Check if user is permanently banned
    if (userData?.accountStatus === 'banned' || userData?.banned === true) {
      // Check if ban has expiration date
      if (userData?.bannedUntil) {
        const bannedUntil = userData.bannedUntil.toDate ? userData.bannedUntil.toDate() : new Date(userData.bannedUntil)
        const now = new Date()
        
        // If ban has expired, auto-unban
        if (now >= bannedUntil) {
          await adminDb.collection('users').doc(userId).update({
            banned: false,
            bannedUntil: null,
            accountStatus: 'active'
          })
          console.log('✅ Auto-unbanned user:', userId)
          return null
        }
        
        // ✅ Allow support contact even when banned
        if (allowSupport) {
          console.log('✅ Allowing banned user to contact support:', userId)
          return null
        }
        
        // Ban is still active
        const daysLeft = Math.ceil((bannedUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return `บัญชีของคุณถูกระงับจนถึง ${bannedUntil.toLocaleDateString('th-TH')} (อีก ${daysLeft} วัน)\nเหตุผล: ${userData.bannedReason || 'ไม่ระบุ'}`
      }
      
      // ✅ Allow support contact even when permanently banned
      if (allowSupport) {
        console.log('✅ Allowing permanently banned user to contact support:', userId)
        return null
      }
      
      // Permanent ban without expiration
      return `บัญชีของคุณถูกระงับการใช้งานถาวร\nเหตุผล: ${userData.bannedReason || 'ไม่ระบุ'}`
    }
    
    // Check if user is suspended
    if (userData?.accountStatus === 'suspended') {
      // ✅ Allow support contact even when suspended
      if (allowSupport) {
        console.log('✅ Allowing suspended user to contact support:', userId)
        return null
      }
      
      const suspendedReason = userData.suspendedReason || 'ไม่ระบุ'
      const suspendedAt = userData.suspendedAt?.toDate ? userData.suspendedAt.toDate() : (userData.suspendedAt ? new Date(userData.suspendedAt) : null)
      const suspendedInfo = suspendedAt ? `\nพักการใช้งานเมื่อ: ${suspendedAt.toLocaleDateString('th-TH')}` : ''
      return `บัญชีของคุณถูกพักการใช้งานชั่วคราว${suspendedInfo}\nเหตุผล: ${suspendedReason}\nกรุณาติดต่อทีมงานเพื่อขอปลดพัก`
    }
    
    return null
  } catch (error) {
    console.error('Error checking user ban status:', error)
    return 'Error checking ban status'
  }
}

/**
 * Verify user and check ban status
 * Returns { user, banError } where banError is null if user is allowed
 */
export async function verifyUserAndCheckBan(token: string) {
  try {
    const decodedToken = await verifyIdTokenString(token)
    
    if (!decodedToken) {
      return { user: null, banError: 'Invalid token' }
    }
    
    const banError = await checkUserBanStatus(decodedToken.uid)
    
    return {
      user: decodedToken,
      banError
    }
  } catch (error) {
    console.error('Error verifying user and checking ban:', error)
    return { user: null, banError: 'Verification error' }
  }
}
