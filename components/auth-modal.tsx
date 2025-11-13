'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, EyeOff } from 'lucide-react'
import { signInWithEmailAndPassword, signInWithPopup, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth, googleProvider } from '@/components/firebase-config'
import { createUserProfile } from '@/lib/user-client'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultTab?: 'login' | 'register'
}

export function AuthModal({ isOpen, onClose, defaultTab = 'login' }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(defaultTab)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Login form state
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
    rememberMe: false
  })
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  // Register form state
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const resetForms = () => {
    setLoginData({ email: '', password: '', rememberMe: false })
    setRegisterData({ name: '', email: '', password: '', confirmPassword: '' })
    setError('')
    setShowLoginPassword(false)
    setShowRegisterPassword(false)
    setShowConfirmPassword(false)
  }

  const handleClose = () => {
    resetForms()
    onClose()
  }

  const handleTabChange = (tab: 'login' | 'register') => {
    setActiveTab(tab)
    setError('')
  }

  // Login handlers
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await signInWithEmailAndPassword(auth, loginData.email, loginData.password)
      handleClose()
    } catch {
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
    } finally {
      setLoading(false)
    }
  }

  // Register handlers
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (registerData.password !== registerData.confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน')
      setLoading(false)
      return
    }

    if (registerData.password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
      setLoading(false)
      return
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        registerData.email,
        registerData.password
      )
      
      await updateProfile(userCredential.user, {
        displayName: registerData.name
      })

      // Create user profile in Firestore
      await createUserProfile(
        userCredential.user.uid,
        registerData.name,
        null, // photoURL will be null initially
        registerData.email,
        userCredential.user.emailVerified
      )

      handleClose()
    } catch (err: unknown) {
      const error = err as { code?: string }
      if (error.code === 'auth/email-already-in-use') {
        setError('อีเมลนี้ถูกใช้งานแล้ว')
      } else if (error.code === 'auth/weak-password') {
        setError('รหัสผ่านไม่ปลอดภัยเพียงพอ')
      } else {
        setError('เกิดข้อผิดพลาดในการสมัครสมาชิก')
      }
    } finally {
      setLoading(false)
    }
  }

  // Social login handlers
  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')

    try {
      const result = await signInWithPopup(auth, googleProvider)
      const user = result.user
      
      // Check if user profile exists, if not create it
  const { getUserProfile, updateLastLogin } = await import('@/lib/user-client')
      const existingProfile = await getUserProfile(user.uid)
      
      if (!existingProfile) {
        await createUserProfile(
          user.uid,
          user.displayName || 'Google User',
          user.photoURL,
          user.email || undefined,
          user.emailVerified
        )
      } else {
        // Update last login
        await updateLastLogin(user.uid)
      }
      
      handleClose()
    } catch {
      setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0 bg-white">
        {/* Header with tabs */}
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between mb-4">
            <DialogTitle className="text-2xl font-bold text-[#000000]">
              {activeTab === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
            </DialogTitle>
          </div>
          
          {/* Tab buttons */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => handleTabChange('login')}
              className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'login'
                  ? 'border-[#ff9800] text-[#ff9800]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              เข้าสู่ระบบ
            </button>
            <button
              onClick={() => handleTabChange('register')}
              className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'register'
                  ? 'border-[#ff9800] text-[#ff9800]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              สมัครสมาชิก
            </button>
          </div>
        </DialogHeader>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {activeTab === 'login' ? (
            // Login Form
            <div>
              <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
                <Input
                  type="email"
                  placeholder="อีเมล"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff9800] focus:border-transparent"
                  required
                />

                <div className="relative">
                  <Input
                    type={showLoginPassword ? "text" : "password"}
                    placeholder="รหัสผ่าน"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff9800] focus:border-transparent"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={loginData.rememberMe}
                      onCheckedChange={(checked) => setLoginData({ ...loginData, rememberMe: checked as boolean })}
                    />
                    <label htmlFor="remember" className="text-sm text-[#3c3c3c] cursor-pointer">
                      จำข้อมูลของฉัน
                    </label>
                  </div>
                  <button type="button" className="text-sm text-[#ff9800] hover:underline">
                    ลืมรหัสผ่าน?
                  </button>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#ff9800] hover:bg-[#ff9800]/90 text-white font-semibold py-3 px-4 rounded-md transition-colors duration-200"
                >
                  {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                </Button>
              </form>
            </div>
          ) : (
            // Register Form
            <div>
              <form onSubmit={handleRegister} className="space-y-4 mb-6">
                <Input
                  type="text"
                  placeholder="ชื่อ-นามสกุล"
                  value={registerData.name}
                  onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff9800] focus:border-transparent"
                  required
                />

                <Input
                  type="email"
                  placeholder="อีเมล"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff9800] focus:border-transparent"
                  required
                />

                <div className="relative">
                  <Input
                    type={showRegisterPassword ? "text" : "password"}
                    placeholder="รหัสผ่าน"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff9800] focus:border-transparent"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showRegisterPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="ยืนยันรหัสผ่าน"
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff9800] focus:border-transparent"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#ff9800] hover:bg-[#ff9800]/90 text-white font-semibold py-3 px-4 rounded-md transition-colors duration-200"
                >
                  {loading ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
                </Button>
              </form>
            </div>
          )}

          {/* Social Login Buttons */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              variant="outline"
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              sign in with Google
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
