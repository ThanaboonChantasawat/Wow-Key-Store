'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { User, onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebase-config'

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
  const [user, setUser] = useState<User | null>(() => auth.currentUser)
  const [loading, setLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(() => !!auth.currentUser)

  useEffect(() => {
    let isMounted = true
    
    // ตรวจสอบ current user ทันที (ถ้ายังไม่ initialized)
    if (!isInitialized) {
      const currentUser = auth.currentUser
      if (currentUser && isMounted) {
        setUser(currentUser)
        setIsInitialized(true)
      }
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
