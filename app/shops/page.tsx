'use client'

import { useState, useEffect, useMemo } from "react"
import { Store, Star, Package, ShoppingBag, Search, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"

interface Shop {
  shopId: string
  ownerId: string
  shopName: string
  description?: string
  logoUrl?: string
  status: string
  verificationStatus: string
  totalProducts: number
  totalSales: number
  totalRevenue: number
  rating: number
}

export default function ShopsPage() {
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<'rating' | 'sales' | 'products' | 'newest'>('rating')

  useEffect(() => {
    async function fetchShops() {
      try {
        const response = await fetch('/api/shops/all')
        if (!response.ok) throw new Error('Failed to fetch shops')
        const data = await response.json()
        console.log('Fetched shops:', data)
        const activeShops = Array.isArray(data) ? data.filter((s: Shop) => s.status === 'active') : []
        console.log('Active shops:', activeShops)
        setShops(activeShops)
      } catch (error) {
        console.error("Failed to fetch shops:", error)
        setShops([])
      } finally {
        setLoading(false)
      }
    }
    fetchShops()
  }, [])

  // Filter and sort shops
  const filteredAndSortedShops = useMemo(() => {
    let result = [...shops]

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(shop => 
        shop.shopName.toLowerCase().includes(query) ||
        shop.description?.toLowerCase().includes(query)
      )
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          if (b.rating !== a.rating) return b.rating - a.rating
          return b.totalSales - a.totalSales
        case 'sales':
          return b.totalSales - a.totalSales
        case 'products':
          return b.totalProducts - a.totalProducts
        case 'newest':
          return 0 // Already sorted by default
        default:
          return 0
      }
    })

    return result
  }, [shops, searchQuery, sortBy])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff9800] mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดร้านค้า...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section - Dark Theme */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 text-white py-16 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="bg-[#ff9800]/20 p-3 rounded-xl backdrop-blur-sm">
                <Store className="w-10 h-10 text-[#ff9800]" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold">ร้านค้าทั้งหมด</h1>
            </div>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              เลือกซื้อจากร้านค้าที่ผ่านการรับรอง พร้อมบริการคุณภาพ มั่นใจได้ทุกการซื้อขาย
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto mt-8">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all">
                <Store className="w-8 h-8 mx-auto mb-2 text-[#ff9800]" />
                <div className="text-3xl font-bold">{filteredAndSortedShops.length}</div>
                <div className="text-sm text-gray-400">ร้านค้า</div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all">
                <Package className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                <div className="text-3xl font-bold">
                  {filteredAndSortedShops.reduce((sum, shop) => sum + shop.totalProducts, 0)}
                </div>
                <div className="text-sm text-gray-400">สินค้า</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {filteredAndSortedShops.length === 0 ? (
          /* Empty State */
          <Card className="border-2 border-dashed">
            <CardContent className="p-12 text-center">
              <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                ยังไม่มีร้านค้าในระบบ
              </h3>
              <p className="text-gray-600 mb-6">
                เป็นคนแรกที่เปิดร้านค้ากับเรา
              </p>
              <Link href="/seller">
                <Button className="bg-[#ff9800] hover:bg-[#e08800]">
                  <Store className="w-4 h-4 mr-2" />
                  เปิดร้านค้าเลย
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Filter & Sort Section */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="ค้นหาร้านค้า..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-2 focus:border-[#ff9800]"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'rating' | 'sales' | 'products' | 'newest')}
                className="px-4 py-2 border-2 rounded-md focus:border-[#ff9800] focus:outline-none"
              >
                <option value="rating">เรียงตามคะแนน</option>
                <option value="sales">เรียงตามยอดขาย</option>
                <option value="products">เรียงตามจำนวนสินค้า</option>
                <option value="newest">ล่าสุด</option>
              </select>
            </div>

            {/* Top Shops Section */}
            {filteredAndSortedShops.slice(0, 3).some(shop => shop.rating >= 4.5 || shop.totalSales >= 50) && (
              <div className="mb-12">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-6 h-6 text-[#ff9800]" />
                  <h2 className="text-2xl font-bold text-gray-900">
                    ร้านค้ายอดนิยม
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {filteredAndSortedShops
                    .filter(shop => shop.rating >= 4.5 || shop.totalSales >= 50)
                    .slice(0, 3)
                    .map((shop, index) => (
                      <Link key={shop.shopId} href={`/sellerprofile/${shop.ownerId}`}>
                        <Card className="group hover:shadow-2xl transition-all duration-300 border-2 border-[#ff9800]/20 hover:border-[#ff9800] relative overflow-hidden">
                          {/* Badge */}
                          <div className="absolute top-4 right-4 z-10">
                            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                              <Star className="w-3 h-3 fill-white" />
                              TOP {index + 1}
                            </div>
                          </div>
                          
                          <CardContent className="p-6">
                            {/* Logo */}
                            <div className="relative w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-4 border-[#ff9800] group-hover:scale-110 transition-transform">
                              <Image
                                src={shop.logoUrl || "/landscape-placeholder-svgrepo-com.svg"}
                                alt={shop.shopName}
                                fill
                                className="object-cover"
                              />
                            </div>

                            {/* Shop Info */}
                            <div className="text-center">
                              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#ff9800] transition-colors">
                                {shop.shopName}
                              </h3>
                              
                              {/* Rating */}
                              <div className="flex items-center justify-center gap-1 mb-3">
                                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                <span className="font-bold text-lg">{shop.rating.toFixed(1)}</span>
                                <span className="text-gray-500 text-sm">({shop.totalSales} ขาย)</span>
                              </div>

                              {/* Description */}
                              <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                                {shop.description || "ร้านค้าคุณภาพ พร้อมให้บริการ"}
                              </p>

                              {/* Stats */}
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="bg-orange-50 rounded-lg p-2">
                                  <Package className="w-4 h-4 text-[#ff9800] mx-auto mb-1" />
                                  <div className="font-bold text-gray-900">{shop.totalProducts}</div>
                                  <div className="text-gray-600 text-xs">สินค้า</div>
                                </div>
                                <div className="bg-green-50 rounded-lg p-2">
                                  <ShoppingBag className="w-4 h-4 text-green-600 mx-auto mb-1" />
                                  <div className="font-bold text-gray-900">{shop.totalSales}</div>
                                  <div className="text-gray-600 text-xs">ขายแล้ว</div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                </div>
              </div>
            )}

            {/* All Shops Grid */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                ร้านค้าทั้งหมด ({filteredAndSortedShops.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAndSortedShops.map((shop) => (
                <Link 
                  key={shop.shopId} 
                  href={`/sellerprofile/${shop.ownerId}`}
                  className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-2 border-gray-100"
                >
                  {/* Header with gradient */}
                  <div className="bg-gradient-to-r from-[#ff9800] to-[#f57c00] p-6 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10"></div>
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="w-16 h-16 rounded-full bg-white p-1 shadow-lg flex-shrink-0">
                        <Image
                          src={shop.logoUrl || "/landscape-placeholder-svgrepo-com.svg"}
                          alt={shop.shopName}
                          width={64}
                          height={64}
                          className="w-full h-full rounded-full object-cover"
                        />
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
                          {shop.verificationStatus === 'verified' && (
                            <div className="bg-green-500 rounded-full w-6 h-6 flex items-center justify-center">
                              <span className="text-white text-xs font-bold">✓</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                        <Store className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                        <div className="text-2xl font-bold text-blue-900">{shop.totalProducts}</div>
                        <div className="text-xs text-blue-600 font-medium">สินค้า</div>
                      </div>
                      <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                        <ShoppingBag className="w-5 h-5 text-green-600 mx-auto mb-1" />
                        <div className="text-2xl font-bold text-green-900">{shop.totalSales}</div>
                        <div className="text-xs text-green-600 font-medium">ยอดขาย</div>
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
                      <svg className="w-5 h-5 text-[#ff9800] group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}