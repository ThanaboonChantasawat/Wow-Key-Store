import { useState, useEffect } from "react"
import { Product } from "@/lib/product-service"

export function useProducts(gameId?: string | null) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true)
        setError(null)

        const url = gameId 
          ? `/api/products?gameId=${gameId}`
          : '/api/products'

        const response = await fetch(url)
        if (!response.ok) {
          throw new Error('Failed to fetch products')
        }

        const productsData = await response.json()
        setProducts(productsData)
      } catch (err) {
        console.error("Error fetching products:", err)
        setError("ไม่สามารถโหลดสินค้าได้")
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [gameId])

  return { products, loading, error }
}

export function useSearchProducts(searchQuery: string | null) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProducts() {
      if (!searchQuery) {
        setProducts([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/products?search=${encodeURIComponent(searchQuery)}`)
        if (!response.ok) {
          throw new Error('Failed to search products')
        }

        const filtered = await response.json()
        setProducts(filtered)
      } catch (err) {
        console.error("Error searching products:", err)
        setError("ไม่สามารถค้นหาสินค้าได้")
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [searchQuery])

  return { products, loading, error }
}
