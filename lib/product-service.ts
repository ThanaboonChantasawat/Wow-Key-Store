import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  increment,
  writeBatch,
} from "firebase/firestore"
import { db } from "@/components/firebase-config"

export interface Product {
  id: string
  shopId: string
  gameId: string
  gameName: string
  name: string
  description: string
  price: number
  images: string[]
  stock: number | "unlimited" // -1 or "unlimited" for digital products
  category: string
  status: "active" | "inactive" | "out_of_stock"
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface ProductFormData {
  gameId: string
  gameName: string
  name: string
  description: string
  price: number
  images: string[]
  stock: number | "unlimited"
  category: string
  status: "active" | "inactive"
}

// Get all products (for static generation)
export async function getAllProducts(): Promise<Product[]> {
  try {
    const productsRef = collection(db, "products")
    const q = query(productsRef, where("status", "==", "active"))
    const querySnapshot = await getDocs(q)

    const products = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Product[]

    return products.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0
      const timeB = b.createdAt?.toMillis?.() || 0
      return timeB - timeA
    })
  } catch (error) {
    console.error("Error fetching all products:", error)
    return [] // Return empty array on error for static generation
  }
}

// Get all products for a specific shop
export async function getProductsByShop(shopId: string): Promise<Product[]> {
  try {
    const productsRef = collection(db, "products")
    const q = query(
      productsRef,
      where("shopId", "==", shopId)
    )
    const querySnapshot = await getDocs(q)

    // Sort by createdAt manually in JavaScript
    const products = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Product[]

    return products.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0
      const timeB = b.createdAt?.toMillis?.() || 0
      return timeB - timeA // desc order (newest first)
    })
  } catch (error) {
    console.error("Error fetching products:", error)
    throw error
  }
}

// Get single product by ID
export async function getProductById(productId: string): Promise<Product | null> {
  try {
    const productRef = doc(db, "products", productId)
    const productSnap = await getDoc(productRef)

    if (productSnap.exists()) {
      return {
        id: productSnap.id,
        ...productSnap.data(),
      } as Product
    }
    return null
  } catch (error) {
    console.error("Error fetching product:", error)
    throw error
  }
}

// Create new product
export async function createProduct(
  shopId: string,
  productData: ProductFormData
): Promise<string> {
  try {
    const batch = writeBatch(db)
    const productsRef = collection(db, "products")
    const newProductRef = doc(productsRef)

    const newProduct = {
      shopId,
      ...productData,
      stock: productData.stock === "unlimited" ? -1 : productData.stock,
      status: productData.status || "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    batch.set(newProductRef, newProduct)

    // Increment totalProducts in shop
    const shopRef = doc(db, "shops", shopId)
    batch.update(shopRef, {
      totalProducts: increment(1),
    })

    await batch.commit()
    return newProductRef.id
  } catch (error) {
    console.error("Error creating product:", error)
    throw error
  }
}

// Update product
export async function updateProduct(
  productId: string,
  productData: Partial<ProductFormData>
): Promise<void> {
  try {
    const productRef = doc(db, "products", productId)
    const updateData: Record<string, unknown> = {
      ...productData,
      updatedAt: serverTimestamp(),
    }

    // Convert "unlimited" to -1
    if (productData.stock === "unlimited") {
      updateData.stock = -1
    } else if (typeof productData.stock === "number") {
      updateData.stock = productData.stock
    }

    await updateDoc(productRef, updateData)
  } catch (error) {
    console.error("Error updating product:", error)
    throw error
  }
}

// Delete product
export async function deleteProduct(productId: string): Promise<void> {
  try {
    const productRef = doc(db, "products", productId)
    const productSnap = await getDoc(productRef)

    if (!productSnap.exists()) {
      throw new Error("Product not found")
    }

    const productData = productSnap.data()
    const shopId = productData.shopId

    const batch = writeBatch(db)
    batch.delete(productRef)

    if (shopId) {
      const shopRef = doc(db, "shops", shopId)
      batch.update(shopRef, {
        totalProducts: increment(-1),
      })
    }

    await batch.commit()
  } catch (error) {
    console.error("Error deleting product:", error)
    throw error
  }
}

// Update product status
export async function updateProductStatus(
  productId: string,
  status: "active" | "inactive" | "out_of_stock"
): Promise<void> {
  try {
    const productRef = doc(db, "products", productId)
    await updateDoc(productRef, {
      status,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error updating product status:", error)
    throw error
  }
}

// Search products by shop
export async function searchProductsByShop(
  shopId: string,
  searchTerm: string
): Promise<Product[]> {
  try {
    const products = await getProductsByShop(shopId)
    const searchLower = searchTerm.toLowerCase()

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchLower) ||
        product.gameName.toLowerCase().includes(searchLower) ||
        product.description.toLowerCase().includes(searchLower)
    )
  } catch (error) {
    console.error("Error searching products:", error)
    throw error
  }
}
