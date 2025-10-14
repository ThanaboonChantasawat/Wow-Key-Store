"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-context"
import { getUserProfile } from "@/lib/user-service"
import { AdminDashboard } from "@/components/admindashboard/admin-dashboard"
import { Shield, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AdminPage() {
  const { user, isInitialized } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!isInitialized) return
      
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const profile = await getUserProfile(user.uid)
        setIsAdmin(profile?.role === 'admin' || profile?.role === 'superadmin')
      } catch (error) {
        console.error("Error checking admin role:", error)
        setIsAdmin(false)
      } finally {
        setLoading(false)
      }
    }

    checkAdminRole()
  }, [user, isInitialized])

  // Loading state
  if (!isInitialized || loading) {
    return (
      <div className="flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#ff9800] mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    )
  }

  // Not logged in
  if (!user) {
    return (
      <div className="flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-20">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#292d32] mb-4">กรุณาเข้าสู่ระบบ</h1>
          <p className="text-gray-600 mb-6 text-lg">
            คุณต้องเข้าสู่ระบบเพื่อเข้าถึงหน้า Admin Dashboard
          </p>
          <Button
            onClick={() => window.location.href = '/'}
            className="bg-gradient-to-r from-[#ff9800] to-[#f57c00] hover:from-[#e08800] hover:to-[#d56600] text-white px-8 py-6 text-lg font-bold rounded-xl shadow-lg"
          >
            กลับหน้าหลัก
          </Button>
        </div>
      </div>
    )
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-20">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#292d32] mb-4">ไม่มีสิทธิ์เข้าถึง</h1>
          <p className="text-gray-600 mb-6 text-lg">
            คุณไม่มีสิทธิ์เข้าถึงหน้า Admin Dashboard<br />
            เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถเข้าถึงได้
          </p>
          <Button
            onClick={() => window.location.href = '/'}
            className="bg-gradient-to-r from-[#ff9800] to-[#f57c00] hover:from-[#e08800] hover:to-[#d56600] text-white px-8 py-6 text-lg font-bold rounded-xl shadow-lg"
          >
            กลับหน้าหลัก
          </Button>
        </div>
      </div>
    )
  }

  // Is admin - show dashboard
  return <AdminDashboard userId={user.uid} />
}
