"use client"

import { useState } from "react"
import { Store, TrendingUp, DollarSign, Star, ArrowRight } from "lucide-react"
import type { Shop } from "@/lib/shop-client"
import Link from "next/link"
import Image from "next/image"

interface TopShopsClientProps {
  shops: Shop[]
}

export function TopShopsClient({ shops: initialShops }: TopShopsClientProps) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  const handleImageError = (shopId: string) => {
    console.error('Failed to load shop image:', shopId)
    setImageErrors(prev => new Set(prev).add(shopId))
  }

  // Filter valid shops
  const validShops = initialShops.filter(shop => 
    shop && shop.shopId && shop.shopName && shop.ownerId
  )

  if (validShops.length === 0) {
    return null
  }

  return (
    <section className="py-8 sm:py-12 lg:py-16 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#ff9800] to-[#f57c00] text-white px-4 py-2 2xl:px-6 2xl:py-3 rounded-full mb-4">
            <TrendingUp className="w-5 h-5 2xl:w-6 2xl:h-6" />
            <span className="font-semibold 2xl:text-lg">ร้านค้าคุณภาพ</span>
          </div>
          <h2 className="text-4xl 2xl:text-5xl font-bold text-[#292d32] mb-3">
            ร้านค้ายอดนิยม
          </h2>
          <p className="text-lg 2xl:text-xl text-gray-600 max-w-2xl mx-auto">
            ร้านค้าที่ได้รับความไว้วางใจจากลูกค้ามากที่สุด
          </p>
        </div>

        {/* Shops Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 2xl:gap-8 mb-8">
          {validShops.map((shop, index) => (
            <Link
              key={shop.shopId}
              href={`/sellerprofile/${shop.ownerId}`}
              className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-2 border-gray-100"
            >
              {/* Rank Badge */}
              <div className="relative">
                <div className="absolute -top-2 -left-2 z-10 w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-xl border-4 border-white">
                  <span className="text-white font-bold text-lg">#{index + 1}</span>
                </div>
                
                {/* Header with gradient */}
                <div className="bg-gradient-to-r from-[#ff9800] to-[#f57c00] p-6 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-16 h-16 rounded-full bg-white p-1 shadow-lg flex-shrink-0">
                      {!imageErrors.has(shop.shopId) && shop.logoUrl ? (
                        <Image
                          src={shop.logoUrl}
                          alt={shop.shopName}
                          width={64}
                          height={64}
                          className="w-full h-full rounded-full object-cover"
                          onError={() => handleImageError(shop.shopId)}
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                          <Store className="w-8 h-8 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-lg truncate group-hover:text-yellow-100 transition-colors">
                        {shop.shopName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                          <Star className="w-4 h-4 text-yellow-300 fill-current" />
                          <span className="text-white text-sm font-semibold">{shop.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                    <DollarSign className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-blue-900">{shop.totalSales}</div>
                    <div className="text-xs text-blue-600 font-medium">ยอดขาย</div>
                  </div>
                  <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                    <Star className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-purple-900">{shop.totalSales}</div>
                    <div className="text-xs text-purple-600 font-medium">รีวิว</div>
                  </div>
                </div>

                {/* Description */}
                {shop.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                    {shop.description}
                  </p>
                )}

                {/* View Button */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-sm font-medium text-gray-500">ดูร้านค้า</span>
                  <ArrowRight className="w-5 h-5 text-[#ff9800] group-hover:translate-x-2 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center">
          <Link
            href="/shops"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#ff9800] to-[#f57c00] hover:from-[#e08800] hover:to-[#e06c00] text-white px-8 py-4 rounded-full font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
          >
            ดูร้านค้าทั้งหมด
            <Store className="w-6 h-6" />
          </Link>
        </div>
      </div>
    </section>
  )
}
