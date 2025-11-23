'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Store, Star, Package, ShoppingBag } from 'lucide-react'

interface ShopStats {
  shopId: string
  shopName: string
  shopLogo: string
  shopDescription: string
  ownerId: string
  totalProducts: number
  totalSales: number
  rating: number
  reviewCount: number
}

interface ShopCardProps {
  shopId: string
}

export function ShopCard({ shopId }: ShopCardProps) {
  const router = useRouter()
  const [stats, setStats] = useState<ShopStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!shopId) return

    const fetchShopStats = async () => {
      try {
        const response = await fetch(`/api/shops/${shopId}/stats`)
        
        if (!response.ok) {
          const errorData = await response.json()
          console.error('Shop Stats API Error:', errorData)
          throw new Error(errorData.error || 'Failed to fetch shop stats')
        }
        
        const data = await response.json()
        console.log('Shop stats:', data)
        setStats(data)
      } catch (error: any) {
        console.error('Error fetching shop stats:', error)
        // Don't show error to user, just don't show the card
      } finally {
        setLoading(false)
      }
    }

    fetchShopStats()
  }, [shopId])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) return null

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Shop Header */}
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16 border-2 border-orange-200">
              <AvatarImage src={stats.shopLogo} alt={stats.shopName} />
              <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white">
                <Store className="w-8 h-8" />
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-[#292d32] truncate">
                {stats.shopName}
              </h3>
              {stats.shopDescription && (
                <p className="text-sm text-gray-600 line-clamp-3 mt-1">
                  {stats.shopDescription.length > 100 
                    ? `${stats.shopDescription.substring(0, 100)}...` 
                    : stats.shopDescription}
                </p>
              )}
            </div>
          </div>

          {/* Shop Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-orange-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-orange-600 mb-1">
                <Package className="w-4 h-4" />
                <span className="text-xs font-medium">สินค้า</span>
              </div>
              <p className="text-lg font-bold text-[#292d32]">
                {stats.totalProducts}
              </p>
            </div>

            <div className="bg-green-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <ShoppingBag className="w-4 h-4" />
                <span className="text-xs font-medium">ยอดขาย</span>
              </div>
              <p className="text-lg font-bold text-[#292d32]">
                {stats.totalSales}
              </p>
            </div>

            <div className="bg-yellow-50 rounded-lg p-3 col-span-2">
              <div className="flex items-center gap-2 text-yellow-600 mb-1">
                <Star className="w-4 h-4" />
                <span className="text-xs font-medium">คะแนนร้านค้า</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold text-[#292d32]">
                  {stats.rating.toFixed(1)}
                </p>
                <span className="text-xs text-gray-500">
                  ({stats.reviewCount} รีวิว)
                </span>
              </div>
            </div>
          </div>

          {/* Visit Shop Button */}
          <div className="flex justify-center">
            <Button
              onClick={() => router.push(`/sellerprofile/${stats.ownerId}`)}
              className="w-full max-w-xs bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold"
            >
              <Store className="w-4 h-4 mr-2" />
              เยี่ยมชมร้านค้า
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
