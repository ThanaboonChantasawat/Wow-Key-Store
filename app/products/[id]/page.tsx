'use client'

import { useEffect, useState } from "react"
import { useParams, notFound } from "next/navigation"
import ProductDetail from "@/components/product/ProductDetail"
import { GameWithCategories, GameImageContainer } from "@/lib/types"
import { Loader2 } from "lucide-react"

interface Product {
  id: string
  name: string
  description?: string
  price?: number
  images: string[]
  gameId?: string
  shopId?: string
  shopName?: string
}

export default function ProductDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchProduct() {
      try {
        const response = await fetch(`/api/products/${id}`)
        if (!response.ok) {
          setError(true)
          return
        }
        const data = await response.json()
        setProduct(data)
      } catch (err) {
        console.error('Error fetching product:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchProduct()
    }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f2f2f4]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#ff9800] mx-auto mb-4" />
          <p className="text-gray-600">กำลังโหลดข้อมูลสินค้า...</p>
        </div>
      </div>
    )
  }

  if (error || !product) {
    notFound()
  }

  // Convert product.images (string[]) into GameImageContainer[] expected by ProductDetail
  const gameImages: GameImageContainer[] = product.images && product.images.length > 0
    ? [{ images: product.images.map((url, idx) => ({ url, isCover: idx === 0, order: idx })) }]
    : []

  // Build GameWithCategories-like object for ProductDetail
  const gameData: GameWithCategories & { shopId?: string; shopName?: string } = {
    id: product.id,
    gameId: product.gameId || product.id,
    name: product.name,
    description: product.description || "",
    price: product.price || 0,
    gameImages,
    categoryIds: [],
    categories: [],
    shopId: product.shopId,
    shopName: product.shopName,
  }

  return (
    <div className="min-h-screen bg-[#f2f2f4]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <ProductDetail game={gameData} />
      </main>
    </div>
  )
}
