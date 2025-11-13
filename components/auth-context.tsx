'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { User, onAuthStateChanged, signOut } from 'firebase/auth'
import { auth, db } from './firebase-config'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'

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

  // Update lastSeen every minute for logged in users
  useEffect(() => {
    if (!user || !db) return

    const updateLastSeen = async () => {
      try {
        const userRef = doc(db, 'users', user.uid)
        await updateDoc(userRef, {
          lastSeen: serverTimestamp()
        })
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
  }, [user])

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
