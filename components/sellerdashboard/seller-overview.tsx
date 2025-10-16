"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-context"
import { getShopByOwnerId } from "@/lib/shop-service"
import { Package, ShoppingCart, Star, TrendingUp, Store } from "lucide-react"

export function SellerOverview() {
  const { user } = useAuth()
  const [shop, setShop] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadShop = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const shopData = await getShopByOwnerId(user.uid)
        setShop(shopData)
      } catch (error) {
        console.error("Error loading shop:", error)
      } finally {
        setLoading(false)
      }
    }

    loadShop()
  }, [user])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Shop Info Card */}
      {shop && (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 via-[#ff9800] to-red-500 p-6">
            <div className="flex items-center gap-4 text-white">
              {shop.logoUrl ? (
                <div className="w-20 h-20 rounded-full overflow-hidden bg-white/20 flex-shrink-0 border-4 border-white/30">
                  <img 
                    src={shop.logoUrl} 
                    alt={shop.shopName}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 border-4 border-white/30">
                  <Store className="w-10 h-10 text-white" />
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-3xl font-bold mb-2">{shop.shopName}</h2>
                <p className="text-white/90 text-sm line-clamp-2">{shop.description || 'ยินดีต้อนรับสู่ร้านค้าของเรา'}</p>
              </div>
            </div>
          </div>
          
          {/* Shop Stats */}
          <div className="p-6 bg-gradient-to-br from-gray-50 to-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              สถิติร้านค้า
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border-2 border-orange-100 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Package className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="text-3xl font-bold text-orange-600">{shop.totalProducts || 0}</div>
                </div>
                <div className="text-sm text-gray-600 font-medium">สินค้าทั้งหมด</div>
              </div>
              
              <div className="bg-white border-2 border-green-100 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-3xl font-bold text-green-600">{shop.totalSales || 0}</div>
                </div>
                <div className="text-sm text-gray-600 font-medium">ยอดขายทั้งหมด</div>
              </div>
              
              <div className="bg-white border-2 border-blue-100 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Star className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-blue-600">{shop.rating?.toFixed(1) || '0.0'}</div>
                </div>
                <div className="text-sm text-gray-600 font-medium">คะแนนเฉลี่ย</div>
              </div>
              
              <div className="bg-white border-2 border-purple-100 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-purple-600">฿{shop.totalRevenue?.toLocaleString() || '0'}</div>
                </div>
                <div className="text-sm text-gray-600 font-medium">รายได้รวม</div>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="px-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shop.contactEmail && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs text-gray-500 mb-1">อีเมลติดต่อ</div>
                  <div className="text-sm font-medium text-gray-900">{shop.contactEmail}</div>
                </div>
              )}
              {shop.contactPhone && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs text-gray-500 mb-1">เบอร์โทรติดต่อ</div>
                  <div className="text-sm font-medium text-gray-900">{shop.contactPhone}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Welcome Message */}
      <div className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200 rounded-2xl p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">👋 ยินดีต้อนรับกลับมา!</h3>
        <p className="text-gray-700">
          จัดการร้านค้าของคุณได้ง่ายๆ ผ่านแดชบอร์ดนี้ เพิ่มสินค้า ตรวจสอบคำสั่งซื้อ และดูสถิติการขายทั้งหมด
        </p>
      </div>
    </div>
  )
}
