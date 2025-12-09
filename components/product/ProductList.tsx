"use client"

import GameCard from "@/components/card/GameCard"
import { Product } from "@/lib/product-service"
import { GameWithCategories } from "@/lib/types"
import { Loader2 } from "lucide-react"

interface ProductListProps {
  products: Product[]
  loading?: boolean
  error?: string | null
}

export default function ProductList({ products, loading, error }: ProductListProps) {
  // Convert Products to GameWithCategories format for GameCard
  const gamesData: GameWithCategories[] = products.map(product => ({
    id: product.id,
    gameId: product.gameId,
    name: product.name,
    description: product.description,
    price: product.price,
    gameImages: product.images.length > 0 
      ? [{
          images: product.images.map((url, index) => ({
            url,
            isCover: index === 0,
            order: index
          }))
        }]
      : [],
    categoryIds: [],
    categories: [],
    shopId: product.shopId, // Add shopId to identify as product
    shopName: product.shopName, // Add shopName to display in card
    shopLogoUrl: product.shopLogoUrl // Add shop logo
  } as GameWithCategories & { shopId: string; shopName?: string; shopLogoUrl?: string }))

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff9800]" />
        <span className="ml-2 text-gray-600">กำลังโหลดข้อมูล...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 font-medium mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-[#ff9800] hover:bg-[#e08800] text-white px-4 py-2 rounded"
        >
          ลองใหม่
        </button>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎮</div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">ไม่พบสินค้า</h3>
        <p className="text-gray-600">ลองเปลี่ยนเกมหรือค้นหาใหม่</p>
      </div>
    )
  }

  return <GameCard games={gamesData} loading={false} />
}
