'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { User, onAuthStateChanged, signOut } from 'firebase/auth'
import { auth, db } from './firebase-config'
import { doc, setDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore'

interface AuthContextType {
  user: User | null
  loading: boolean
  isInitialized: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  isInitialized: false,
  logout: async () => {}
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  const logout = useCallback(async () => {
    try {
      setLoading(true)
      await signOut(auth)
      document.cookie = 'firebase-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Update lastSeen every minute for logged in users
  useEffect(() => {
    if (!user || !db) return

    const updateLastSeen = async () => {
      try {
        const userRef = doc(db, 'users', user.uid)
        
        // ตรวจสอบสถานะผู้ใช้ก่อน
        const userDoc = await getDoc(userRef)
        if (userDoc.exists()) {
          const userData = userDoc.data()
          
          // ✅ ตรวจสอบว่าถูกแบนหรือพักการใช้งานหรือไม่
          if (userData.accountStatus === 'banned' || userData.banned === true) {
            console.log('🚫 User is banned, logging out...')
            alert('บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ')
            await logout()
            return
          }
          
          if (userData.accountStatus === 'suspended') {
            console.log('⏸ User is suspended, logging out...')
            alert('บัญชีของคุณถูกพักการใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบ')
            await logout()
            return
          }
          
          // ตรวจสอบวันหมดอายุการแบน
          if (userData.bannedUntil) {
            const bannedUntil = userData.bannedUntil.toDate ? userData.bannedUntil.toDate() : new Date(userData.bannedUntil)
            const now = new Date()
            
            if (now < bannedUntil) {
              console.log('🚫 User is still banned until:', bannedUntil)
              const daysLeft = Math.ceil((bannedUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              alert(`บัญชีของคุณถูกระงับจนถึง ${bannedUntil.toLocaleDateString('th-TH')} (อีก ${daysLeft} วัน)\nเหตุผล: ${userData.bannedReason || 'ไม่ระบุ'}`)
              await logout()
              return
            }
          }
        }
        
        // อัปเดต lastSeen
        await setDoc(userRef, {
          lastSeen: serverTimestamp()
        }, { merge: true })
        console.log('✅ LastSeen updated for user:', user.uid)
      } catch (error) {
        console.error('Error updating lastSeen:', error)
      }
    }

    // Update immediately
    updateLastSeen()

    // Then update every 1 minute
    const intervalId = setInterval(updateLastSeen, 60000) // 60 seconds

    return () => {
      clearInterval(intervalId)
    }
  }, [user, logout])

  useEffect(() => {
    let isMounted = true
    
    // ตรวจสอบ current user ทันที (ถ้าอยู่บน client และยังไม่ initialized)
    if (typeof window !== 'undefined' && !isInitialized && auth) {
      const currentUser = auth.currentUser
      if (currentUser && isMounted) {
        setUser(currentUser)
        setIsInitialized(true)
      }
    }

    if (!auth) {
      // ไม่มี auth ในสภาพแวดล้อมนี้ (เช่นขณะ prerender) ให้ข้ามไป
      return () => {}
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return
      
      // ถ้ามี user ตรวจสอบสถานะก่อน
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid)
          const userDoc = await getDoc(userRef)
          
          if (userDoc.exists()) {
            const userData = userDoc.data()
            
            // ✅ ตรวจสอบว่าถูกแบนหรือพักการใช้งานหรือไม่
            if (userData.accountStatus === 'banned' || userData.banned === true) {
              console.log('🚫 User is banned, preventing login...')
              await signOut(auth)
              alert('บัญชีของคุณถูกระงับการใช้งาน ไม่สามารถเข้าสู่ระบบได้\nกรุณาติดต่อผู้ดูแลระบบ')
              setUser(null)
              if (!isInitialized) {
                setIsInitialized(true)
              }
              return
            }
            
            if (userData.accountStatus === 'suspended') {
              console.log('⏸ User is suspended, preventing login...')
              await signOut(auth)
              alert('บัญชีของคุณถูกพักการใช้งานชั่วคราว ไม่สามารถเข้าสู่ระบบได้\nกรุณาติดต่อผู้ดูแลระบบ')
              setUser(null)
              if (!isInitialized) {
                setIsInitialized(true)
              }
              return
            }
            
            // ตรวจสอบวันหมดอายุการแบน
            if (userData.bannedUntil) {
              const bannedUntil = userData.bannedUntil.toDate ? userData.bannedUntil.toDate() : new Date(userData.bannedUntil)
              const now = new Date()
              
              if (now < bannedUntil) {
                console.log('🚫 User is still banned until:', bannedUntil)
                const daysLeft = Math.ceil((bannedUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                await signOut(auth)
                alert(`บัญชีของคุณถูกระงับจนถึง ${bannedUntil.toLocaleDateString('th-TH')} (อีก ${daysLeft} วัน)\nเหตุผล: ${userData.bannedReason || 'ไม่ระบุ'}\n\nไม่สามารถเข้าสู่ระบบได้`)
                setUser(null)
                if (!isInitialized) {
                  setIsInitialized(true)
                }
                return
              }
            }
          }
        } catch (error) {
          console.error('Error checking user status on auth:', error)
        }
      }
      
      setUser(user)
      if (!isInitialized) {
        setIsInitialized(true)
      }
      
      if (user) {
        // เก็บ token ใน cookie เมื่อ login
        try {
          const token = await user.getIdToken()
          document.cookie = `firebase-token=${token}; path=/; max-age=3600; ${location.protocol === 'https:' ? 'secure;' : ''} samesite=strict`
        } catch (error) {
          console.error('Error getting token:', error)
        }
      } else {
        // ลบ token จาก cookie เมื่อ logout
        document.cookie = 'firebase-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      }
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [isInitialized])

  const value = useMemo(() => ({
    user,
    loading,
    isInitialized,
    logout
  }), [user, loading, isInitialized, logout])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
