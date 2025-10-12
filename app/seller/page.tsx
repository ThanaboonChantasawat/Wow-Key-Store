"use client"

import { useState, useEffect } from "react"
import { SellerDashboard } from "@/components/sellerdashboard/seller-dashboard"
import { CreateShopForm } from "@/components/sellerdashboard/create-shop-form"
import { useAuth } from "@/components/auth-context"
import { getShopByOwnerId } from "@/lib/shop-service"
import { Store, AlertCircle } from "lucide-react"

export default function SellerPage() {
  const { user, isInitialized } = useAuth()
  const [hasShop, setHasShop] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkShop = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const shop = await getShopByOwnerId(user.uid)
        setHasShop(shop !== null)
      } catch (error) {
        console.error("Error checking shop:", error)
      } finally {
        setLoading(false)
      }
    }

    if (isInitialized) {
      checkShop()
    }
  }, [user, isInitialized])

  const handleShopCreated = () => {
    setHasShop(true)
  }

  // Loading state
  if (!isInitialized || loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f2f2f4] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff9800] mb-4"></div>
        <p className="text-gray-600">กำลังโหลด...</p>
      </div>
    )
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f2f2f4]">
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center max-w-md">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-[#292d32] mb-2">กรุณาเข้าสู่ระบบ</h2>
            <p className="text-gray-600 mb-6">คุณต้องเข้าสู่ระบบเพื่อเข้าถึงหน้านี้</p>
          </div>
        </div>
      </div>
    )
  }

  // No shop yet - show create shop form
  if (!hasShop) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f2f2f4]">
        <CreateShopForm userId={user.uid} onShopCreated={handleShopCreated} />
      </div>
    )
  }

  // Has shop - show dashboard
  return (
    <div className="min-h-screen flex flex-col bg-[#f2f2f4]">
      <SellerDashboard />
    </div>
  )
}
