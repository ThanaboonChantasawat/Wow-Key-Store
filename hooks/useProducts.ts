import { useState, useEffect } from "react"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { db } from "@/components/firebase-config"
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

        const productsRef = collection(db, "products")
        let q

        if (gameId) {
          // Filter by gameId and only active products
          q = query(
            productsRef,
            where("gameId", "==", gameId),
            where("status", "==", "active")
          )
        } else {
          // Get all active products
          q = query(
            productsRef,
            where("status", "==", "active")
          )
        }

        const snapshot = await getDocs(q)
        const productsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[]

        // Sort by createdAt manually
        productsData.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || 0
          const timeB = b.createdAt?.toMillis?.() || 0
          return timeB - timeA
        })

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

        const productsRef = collection(db, "products")
        const q = query(
          productsRef,
          where("status", "==", "active")
        )

        const snapshot = await getDocs(q)
        const productsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[]

        // Filter by search query (client-side)
        const searchLower = searchQuery.toLowerCase()
        const filtered = productsData.filter(
          (product) =>
            product.name.toLowerCase().includes(searchLower) ||
            product.gameName.toLowerCase().includes(searchLower) ||
            product.description?.toLowerCase().includes(searchLower)
        )

        // Sort by createdAt
        filtered.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || 0
          const timeB = b.createdAt?.toMillis?.() || 0
          return timeB - timeA
        })

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
