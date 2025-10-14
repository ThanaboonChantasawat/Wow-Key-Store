"use client"

import { useState, useEffect } from "react"
import { Store, TrendingUp, DollarSign, Star, ArrowRight } from "lucide-react"
import { getTopShopsBySales, type Shop } from "@/lib/shop-service"
import Link from "next/link"
import Image from "next/image"

export function TopShops() {
  const [topShops, setTopShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadTopShops()
  }, [])

  const loadTopShops = async () => {
    try {
      setLoading(true)
      const shops = await getTopShopsBySales(5) // Get top 5 shops
      console.log("Top shops loaded:", shops)
      console.log("Shop logos:", shops.map(s => ({ name: s.shopName, logo: s.logoUrl })))
      setTopShops(shops)
    } catch (error) {
      console.error("Error loading top shops:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleImageError = (shopId: string) => {
    setImageErrors(prev => new Set(prev).add(shopId))
  }

  if (loading) {
    return (
      <section className="py-12 bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#ff9800]"></div>
          </div>
        </div>
      </section>
    )
  }

  if (topShops.length === 0) {
    console.log("No top shops found")
    return null
  }

  return (
    <section className="py-16 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#ff9800] to-[#f57c00] text-white px-4 py-2 rounded-full mb-4">
            <TrendingUp className="w-5 h-5" />
            <span className="font-semibold">ร้านค้ายอดนิยม</span>
          </div>
          <h2 className="text-4xl font-bold text-[#292d32] mb-3">
            ร้านค้าคุณภาพ
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            ร้านค้าที่ได้รับความไว้วางใจจากลูกค้ามากที่สุด
          </p>
        </div>

        {/* Top Shops Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
          {topShops.map((shop, index) => (
            <Link
              key={shop.shopId}
              href={`/sellerprofile/${shop.ownerId}`}
              className="group"
            >
              <div className="bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-transparent hover:border-[#ff9800] transform hover:-translate-y-2">
                {/* Rank Badge */}
                <div className="relative">
                  <div className="absolute top-3 left-3 z-10">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-lg
                      ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' : ''}
                      ${index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' : ''}
                      ${index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' : ''}
                      ${index >= 3 ? 'bg-gradient-to-br from-blue-400 to-blue-600' : ''}
                    `}>
                      {index + 1}
                    </div>
                  </div>

                  {/* Shop Logo */}
                  <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden relative">
                    {shop.logoUrl && !imageErrors.has(shop.shopId) ? (
                      <img 
                        src={shop.logoUrl} 
                        alt={shop.shopName} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={() => handleImageError(shop.shopId)}
                      />
                    ) : (
                      <Store className="w-16 h-16 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Shop Info */}
                <div className="p-5">
                  <h3 className="font-bold text-lg text-[#292d32] mb-2 truncate group-hover:text-[#ff9800] transition-colors">
                    {shop.shopName}
                  </h3>
                  
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[40px]">
                    {shop.description}
                  </p>

                  {/* Stats */}
                  <div className="space-y-2 border-t border-gray-100 pt-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-gray-600">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span>ยอดขาย</span>
                      </div>
                      <span className="font-semibold text-[#292d32]">
                        {shop.totalSales.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span>คะแนน</span>
                      </div>
                      <span className="font-semibold text-[#292d32]">
                        {shop.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* View Shop Button */}
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-center gap-2 text-[#ff9800] font-semibold text-sm group-hover:gap-3 transition-all">
                      <span>ดูร้านค้า</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* View All Shops Link */}
        <div className="text-center">
          <Link
            href="/shops"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#ff9800] to-[#f57c00] text-white px-8 py-4 rounded-xl font-semibold hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            <Store className="w-5 h-5" />
            <span>ดูร้านค้าทั้งหมด</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
