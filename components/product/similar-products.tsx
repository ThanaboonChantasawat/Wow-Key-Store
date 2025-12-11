'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Eye, ShoppingCart } from 'lucide-react'

interface SimilarProduct {
  id: string
  name: string
  price: number
  gameImages?: any[]
  images?: string[]
  views: number
  similarityScore: number
}

interface SimilarProductsProps {
  productId: string
}

export function SimilarProducts({ productId }: SimilarProductsProps) {
  const router = useRouter()
  const [products, setProducts] = useState<SimilarProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!productId) return

    const fetchSimilarProducts = async () => {
      try {
        console.log('Fetching similar products for:', productId)
        const response = await fetch(`/api/products/${productId}/similar?limit=6`)
        
        if (!response.ok) {
          const errorData = await response.json()
          console.error('API Error:', errorData)
          throw new Error(errorData.error || 'Failed to fetch similar products')
        }
        
        const data = await response.json()
        console.log('Similar products response:', data)
        console.log('Number of products:', data.products?.length || 0)
        setProducts(data.products || [])
      } catch (error: any) {
        console.error('Error fetching similar products:', error)
        // Don't show error to user, just log it
        setProducts([])
      } finally {
        setLoading(false)
      }
    }

    fetchSimilarProducts()
  }, [productId])

  const getProductImage = (product: SimilarProduct) => {
    // Try images array first (from products collection)
    if (product.images && product.images.length > 0) {
      return product.images[0]
    }

    // Try gameImages (from games collection)
    if (!product.gameImages || product.gameImages.length === 0) {
      return '/placeholder-game.jpg'
    }

    // Check if gameImages[0] has images array
    if (product.gameImages[0]?.images && Array.isArray(product.gameImages[0].images)) {
      const coverImage = product.gameImages[0].images.find((img: any) => img.isCover)
      return coverImage?.url || product.gameImages[0].images[0]?.url || '/placeholder-game.jpg'
    }

    // Fallback for old structure
    if (product.gameImages[0]?.url) {
      return product.gameImages[0].url
    }

    // Check if it's a direct array of URLs
    if (typeof product.gameImages[0] === 'string') {
      return product.gameImages[0]
    }

    return '/placeholder-game.jpg'
  }

  if (loading) {
    return (
      <div>
        <h2 className="text-xl font-bold text-[#292d32] mb-4">กำลังโหลดสินค้าที่อื่นๆ...</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-0">
                <div className="aspect-square bg-gray-200"></div>
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 sm:p-12 border border-gray-200">
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-full flex items-center justify-center shadow-lg">
            <svg 
              className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" 
              />
            </svg>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
              ไม่พบสินค้าที่อื่นๆ
            </h3>
            <p className="text-gray-600 text-sm sm:text-base">
              ขออภัย ขณะนี้ยังไม่มีสินค้าที่อื่นๆในระบบ
            </p>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">
              ลองเลือกดูสินค้าอื่น ๆ ในหมวดหมู่ต่าง ๆ ของเรา
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-[#292d32] mb-4 sm:mb-6">
        สินค้าที่อื่นๆ {products.length > 0 && <span className="text-gray-500 text-base">({products.length} รายการ)</span>}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {products.map((product) => (
          <Card
            key={product.id}
            className="group cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden"
            onClick={() => router.push(`/products/${product.id}`)}
          >
            <CardContent className="p-0">
              {/* Product Image */}
              <div className="relative aspect-square overflow-hidden bg-gray-100">
                <Image
                  src={getProductImage(product)}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                />
                
                {/* Views Badge */}
                {product.views > 0 && (
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {product.views}
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-3 space-y-2">
                <h3 className="font-medium text-sm line-clamp-2 text-[#292d32] group-hover:text-orange-600 transition-colors">
                  {product.name}
                </h3>
                
                <div className="flex items-center justify-between">
                  <p className="text-orange-600 font-bold text-base">
                    ฿{product.price.toLocaleString()}
                  </p>
                  <ShoppingCart className="w-4 h-4 text-gray-400 group-hover:text-orange-600 transition-colors" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
