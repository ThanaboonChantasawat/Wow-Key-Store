"use client"

import { useState, useEffect } from "react"
import { Wallet } from "lucide-react"
import { getShopByOwnerId } from "@/lib/shop-client"
import { useAuth } from "@/components/auth-context"
import { LoadingScreen } from "@/components/ui/loading"
import { BankAccountsManager } from "./bank-accounts-manager"

export function SellerPaymentSettings() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [shopId, setShopId] = useState<string>('')

  useEffect(() => {
    async function loadShop() {
      if (!user) return
      
      try {
        setLoading(true)
        const shop = await getShopByOwnerId(user.uid)
        if (shop) {
          setShopId(shop.shopId)
        }
      } catch (error) {
        console.error('Error loading shop:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadShop()
  }, [user])

  if (loading) {
    return <LoadingScreen text="กำลังโหลดข้อมูลบัญชีรับเงิน..." />
  }

  if (!shopId) {
    return (
      <div className="text-center py-6 sm:py-8">
        <p className="text-muted-foreground text-sm sm:text-base">ไม่พบข้อมูลร้านค้า กรุณาสร้างร้านค้าก่อน</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 text-white">
        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          <Wallet className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10" />
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">บัญชีรับเงิน</h2>
        </div>
        <p className="text-white/90 text-xs sm:text-sm lg:text-base">ตั้งค่าบัญชีธนาคาร/PromptPay เพื่อรับเงินจากการขายผ่าน Omise</p>
      </div>

      {/* Bank Account Settings - Multi-account support like Shopee */}
      <div className="w-full">
        <BankAccountsManager shopId={shopId} />
      </div>
    </div>
  )
}


