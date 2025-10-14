import { notFound } from "next/navigation"
import ProductDetail from "@/components/product/ProductDetail"
import { getProductById, getAllProducts } from "@/lib/product-service"
import { GameWithCategories, GameImageContainer } from "@/lib/types"

// Generate static params for static export
export async function generateStaticParams() {
  try {
    const products = await getAllProducts()
    return products.map((p) => ({ id: p.id }))
  } catch (error) {
    console.error("Error generating static params:", error)
    return []
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const product = await getProductById(id)
  if (!product) {
    notFound()
  }

  // Convert product.images (string[]) into GameImageContainer[] expected by ProductDetail
  const gameImages: GameImageContainer[] = product.images && product.images.length > 0
    ? [{ images: product.images.map((url, idx) => ({ url, isCover: idx === 0 })) }]
    : []

  // Build GameWithCategories-like object for ProductDetail
  const gameData: GameWithCategories = {
    id: product.id,
    gameId: product.gameId || product.id,
    name: product.name,
    description: product.description || "",
    price: product.price || 0,
    gameImages,
    categoryIds: [],
    categories: [],
    // attach shopId as extra property for downstream components
  } as unknown as GameWithCategories

  // @ts-ignore attach shopId dynamically (ProductDetail/GameCard check this)
  ;(gameData as any).shopId = product.shopId

  return (
    <div className="min-h-screen bg-[#f2f2f4]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <ProductDetail game={gameData} />
      </main>
    </div>
  )
}
