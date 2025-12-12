"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, Pencil, Trash2, Upload, X, Image as ImageIcon, Search, Package, AlertTriangle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LoadingScreen, Loading } from "@/components/ui/loading"
import { useUserProfile } from "@/hooks/useUserProfile"
import {
  getProductsByShop,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProductsByShop,
  type Product,
  type ProductFormData,
} from "@/lib/product-service"
import { getShopByOwnerId } from "@/lib/shop-client"
import { updateUserProfile } from "@/lib/user-client"
import { getAllGames, type Game } from "@/lib/game-service"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { storage } from "@/components/firebase-config"
import { useAuth } from "@/components/auth-context"
import Image from "next/image"

// Helper function to ensure minimum loading time for better UX
const withMinimumLoadingTime = async <T,>(
  promiseOrFunction: Promise<T> | (() => Promise<T>),
  minimumMs: number = 500
): Promise<T> => {
  const start = Date.now()
  const promise = typeof promiseOrFunction === 'function' ? promiseOrFunction() : promiseOrFunction
  const result = await promise
  const elapsed = Date.now() - start
  const remaining = minimumMs - elapsed
  
  if (remaining > 0) {
    await new Promise(resolve => setTimeout(resolve, remaining))
  }
  
  return result
}

// Helper function to delete old image from Firebase Storage
const deleteImageFromStorage = async (imageUrl: string) => {
  if (!imageUrl || !imageUrl.includes('firebasestorage.googleapis.com')) {
    return;
  }
  
  try {
    const decodedUrl = decodeURIComponent(imageUrl);
    const pathMatch = decodedUrl.match(/\/o\/(.+?)\?/);
    
    if (pathMatch && pathMatch[1]) {
      const filePath = pathMatch[1];
      const imageRef = ref(storage, filePath);
      await deleteObject(imageRef);
      console.log('Old image deleted successfully:', filePath);
    }
  } catch (error) {
    console.error('Error deleting old image:', error);
  }
};

export function SellerProducts() {
  const { profile } = useUserProfile()
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [loadingShop, setLoadingShop] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [shopId, setShopId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<ProductFormData>({
    gameId: "",
    gameName: "",
    name: "",
    description: "",
    price: "" as any, // Allow empty string for easier editing
    images: [],
    stock: 0,
    category: "",
    status: "active",
  })
  
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [primaryImageIndex, setPrimaryImageIndex] = useState<number>(0) // Track primary image
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    initializeShopId()
  }, [profile, user])

  useEffect(() => {
    if (shopId) {
      loadData()
    }
  }, [shopId])

  const initializeShopId = async () => {
    if (!user) {
      setLoadingShop(false)
      return
    }

    try {
      await withMinimumLoadingTime(async () => {
        // If profile has shopId, use it
        if (profile?.shopId) {
          setShopId(profile.shopId)
          return
        }

        // If profile doesn't have shopId but user exists, check if shop exists
        const shop = await getShopByOwnerId(user.uid)
        if (shop) {
          // Found shop, update user profile with shopId
          setShopId(shop.shopId)
          
          // Only update role to seller if current role is buyer
          // Don't change admin/superadmin roles
          const updateData: Record<string, unknown> = {
            shopId: shop.shopId,
            isSeller: true,
          }
          
          if (profile?.role === "buyer") {
            updateData.role = "seller"
          }
          
          await updateUserProfile(user.uid, updateData)
          console.log("Updated user profile with shopId:", shop.shopId)
        }
      })
    } catch (error) {
      console.error("Error checking shop:", error)
    } finally {
      setLoadingShop(false)
    }
  }

  const loadData = async () => {
    if (!shopId) {
      setLoadingProducts(false)
      return
    }

    try {
      setLoadingProducts(true)
      await withMinimumLoadingTime(async () => {
        const [productsData, gamesData] = await Promise.all([
          getProductsByShop(shopId),
          getAllGames(),
        ])
        setProducts(productsData)
        setGames(gamesData.filter((g) => g.status === "active"))
      })
    } catch (error) {
      console.error("Error loading data:", error)
      setMessage({ type: "error", text: "โหลดข้อมูลไม่สำเร็จ" })
    } finally {
      setLoadingProducts(false)
    }
  }

  const handleSearch = async () => {
    if (!shopId) return
    
    try {
      setLoadingProducts(true)
      await withMinimumLoadingTime(async () => {
        if (searchQuery.trim()) {
          const results = await searchProductsByShop(shopId, searchQuery)
          setProducts(results)
        } else {
          const productsData = await getProductsByShop(shopId)
          setProducts(productsData)
        }
      })
    } catch (error) {
      console.error("Error searching:", error)
      setMessage({ type: "error", text: "ค้นหาไม่สำเร็จ" })
    } finally {
      setLoadingProducts(false)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Limit to 5 images
    if (imageFiles.length + files.length > 5) {
      setMessage({ type: "error", text: "สามารถอัปโหลดได้สูงสุด 5 รูป" })
      return
    }

    // Validate file types and sizes
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        setMessage({ type: "error", text: "กรุณาเลือกไฟล์รูปภาพเท่านั้น" })
        return false
      }
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: "error", text: `${file.name} มีขนาดเกิน 5MB` })
        return false
      }
      return true
    })

    setImageFiles([...imageFiles, ...validFiles])

    // Create previews
    validFiles.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })

    setMessage(null)
  }

  const handleRemoveImage = (index: number) => {
    setImageFiles(imageFiles.filter((_, i) => i !== index))
    setImagePreviews(imagePreviews.filter((_, i) => i !== index))
    
    // Adjust primary image index if needed
    if (index === primaryImageIndex) {
      // If removing primary image, set first image as primary
      setPrimaryImageIndex(0)
    } else if (index < primaryImageIndex) {
      // If removing image before primary, adjust index
      setPrimaryImageIndex(primaryImageIndex - 1)
    }
  }

  const handleGameSelect = (gameId: string) => {
    const selectedGame = games.find((g) => g.id === gameId)
    if (selectedGame) {
      setFormData({
        ...formData,
        gameId: selectedGame.id,
        gameName: selectedGame.name,
      })
    }
  }

  const openCreateModal = () => {
    resetForm()
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    resetForm()
  }

  const handleEdit = (product: Product) => {
    setEditingId(product.id)
    setFormData({
      gameId: product.gameId,
      gameName: product.gameName,
      name: product.name,
      description: product.description,
      price: product.price,
      images: product.images,
      stock: product.stock === -1 ? 0 : product.stock,
      category: product.category,
      status: product.status === "out_of_stock" ? "active" : product.status,
    })
    setImagePreviews(product.images)
    setPrimaryImageIndex(0) // Reset to first image when editing
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!shopId) {
      setMessage({ type: "error", text: "ไม่พบข้อมูลร้านค้า" })
      return
    }

    if (!formData.gameId || !formData.name || !formData.price) {
      setMessage({ type: "error", text: "กรุณากรอกข้อมูลให้ครบถ้วน" })
      return
    }

    if (!editingId && imageFiles.length === 0) {
      setMessage({ type: "error", text: "กรุณาเลือกรูปภาพอย่างน้อย 1 รูป" })
      return
    }

    try {
      setLoadingProducts(true)
      let imageUrls = formData.images

      // Upload new images if any
      if (imageFiles.length > 0) {
        // Delete old images if editing (optional: only if replacing all images)
        if (editingId && formData.images.length > 0) {
          for (const oldUrl of formData.images) {
            await deleteImageFromStorage(oldUrl);
          }
          imageUrls = []; // Clear old URLs since we're replacing them
        }
        
        // Reorder files to put primary image first
        const reorderedFiles = [...imageFiles]
        if (primaryImageIndex > 0) {
          const primaryFile = reorderedFiles[primaryImageIndex]
          reorderedFiles.splice(primaryImageIndex, 1)
          reorderedFiles.unshift(primaryFile)
        }
        
        const uploadPromises = reorderedFiles.map(async (file) => {
          const timestamp = Date.now()
          const storageRef = ref(storage, `product-images/${shopId}/${timestamp}_${file.name}`)
          await uploadBytes(storageRef, file)
          return await getDownloadURL(storageRef)
        })
        const newUrls = await Promise.all(uploadPromises)
        imageUrls = [...imageUrls, ...newUrls]
      }

      const productData: ProductFormData = {
        ...formData,
        images: imageUrls,
        price: Number(formData.price),
        stock: Number(formData.stock),
      }

      if (editingId) {
        await updateProduct(editingId, productData)
        setMessage({ type: "success", text: "แก้ไขสินค้าสำเร็จ" })
      } else {
        await createProduct(shopId, productData)
        setMessage({ type: "success", text: "เพิ่มสินค้าสำเร็จ" })
      }

      setShowModal(false)
      resetForm()
      await loadData()
    } catch (error) {
      console.error("Error saving product:", error)
      setMessage({ type: "error", text: "เกิดข้อผิดพลาด" })
    } finally {
      setLoadingProducts(false)
    }
  }

  const handleDelete = (productId: string) => {
    setProductToDelete(productId)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!productToDelete) return

    try {
      setLoadingProducts(true)
      await deleteProduct(productToDelete)
      setMessage({ type: "success", text: "ลบสินค้าสำเร็จ" })
      await loadData()
    } catch (error) {
      console.error("Error deleting product:", error)
      setMessage({ type: "error", text: "ลบไม่สำเร็จ" })
    } finally {
      setLoadingProducts(false)
      setShowDeleteDialog(false)
      setProductToDelete(null)
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setFormData({
      gameId: "",
      gameName: "",
      name: "",
      description: "",
      price: "" as any,
      images: [],
      stock: 0,
      category: "",
      status: "active",
    })
    setImageFiles([])
    setImagePreviews([])
    setPrimaryImageIndex(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Show loading while checking for shop
  if (loadingShop) {
    return <LoadingScreen text="กำลังโหลดข้อมูลร้านค้า..." />
  }

  // Show "no shop" message only after loading is complete
  if (!shopId) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-800 mb-2">ยังไม่มีร้านค้า</h3>
        <p className="text-gray-600 mb-6">กรุณาสร้างร้านค้าก่อนเพื่อเพิ่มสินค้า</p>
        <Button
          onClick={() => window.location.href = '/seller'}
          className="bg-[#ff9800] hover:bg-[#ff9800]/90"
        >
          สร้างร้านค้า
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 via-[#ff9800] to-red-500 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
        <div className="relative z-10">
          <h2 className="text-4xl font-bold mb-2 drop-shadow-lg flex items-center gap-3">
            <Package className="w-10 h-10" />
            สินค้าของฉัน
          </h2>
          <p className="text-white/90 text-lg">จัดการสินค้าและอัปเดตข้อมูล</p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 animate-in fade-in duration-200 ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border-2 border-green-200"
              : "bg-red-50 text-red-800 border-2 border-red-200"
          }`}
        >
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Search and Add Button */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <Button
          onClick={openCreateModal}
          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold shadow-lg hover:shadow-xl transition-all"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          เพิ่มสินค้าใหม่
        </Button>

        <div className="flex gap-2 w-full sm:w-auto">
          <Input
            type="search"
            placeholder="ค้นหาสินค้า..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full sm:w-64"
          />
          <Button onClick={handleSearch} variant="outline">
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Products List */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden">
        <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-[#ff9800]" />
            สินค้าทั้งหมด ({products.length})
          </h3>
        </div>

        {loadingProducts ? (
          <div className="p-12">
            <Loading text="กำลังโหลดสินค้า..." />
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">ยังไม่มีสินค้า</h3>
            <p className="text-gray-600">เพิ่มสินค้าแรกของคุณเลย!</p>
          </div>
        ) : (
          <>
            {/* Mobile, Tablet & Laptop Card Layout */}
            <div className="block xl:hidden space-y-4">
              {products.map((product) => (
                <div 
                  key={product.id}
                  className="bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      {product.images.length > 0 ? (
                        <div className="relative w-32 h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-xl overflow-hidden border-2 border-gray-200 shadow-sm bg-white">
                          <Image
                            src={product.images[0]}
                            alt={product.name}
                            fill
                            className="object-cover p-1 rounded-md"
                          />
                        </div>
                      ) : (
                        <div className="w-32 h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-2 border-gray-300">
                          <ImageIcon className="w-14 h-14 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-base md:text-lg mb-2 line-clamp-2">
                        {product.name}
                      </h3>
                      
                      {/* Game Badge */}
                      <div className="mb-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-medium text-xs md:text-sm">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                          </svg>
                          {product.gameName}
                        </span>
                      </div>

                      {/* Price */}
                      <div className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500 mb-3">
                        ฿{product.price.toLocaleString()}
                      </div>

                      {/* Stock & Status */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {/* Stock */}
                        {product.stock === -1 ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-50 text-purple-700 font-semibold text-xs">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            ไม่จำกัด
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-semibold text-xs">
                            {product.stock} ชิ้น
                          </span>
                        )}

                        {/* Status */}
                        {product.status === "active" ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-green-400 to-green-500 text-white font-bold text-xs">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            เปิดขาย
                          </span>
                        ) : product.status === "out_of_stock" ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-red-400 to-red-500 text-white font-bold text-xs">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            หมด
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-gray-400 to-gray-500 text-white font-bold text-xs">
                            ปิดขาย
                          </span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-semibold text-sm transition-colors"
                          disabled={loadingProducts}
                        >
                          <Pencil className="h-4 w-4" />
                          แก้ไข
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-semibold text-sm transition-colors"
                          disabled={loadingProducts}
                        >
                          <Trash2 className="h-4 w-4" />
                          ลบ
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table Layout (Extra Large screens only - 1280px+) */}
            <div className="hidden xl:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-orange-500 via-[#ff9800] to-orange-600 text-white">
                  <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">สินค้า</th>
                  <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">เกม</th>
                  <th className="px-6 py-4 text-center font-bold text-sm uppercase tracking-wider">ราคา</th>
                  <th className="px-6 py-4 text-center font-bold text-sm uppercase tracking-wider">คลังสินค้า</th>
                  <th className="px-6 py-4 text-center font-bold text-sm uppercase tracking-wider">สถานะ</th>
                  <th className="px-6 py-4 text-center font-bold text-sm uppercase tracking-wider">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product, index) => (
                  <tr 
                    key={product.id} 
                    className={`border-b border-gray-100 hover:bg-gradient-to-r hover:from-orange-50 hover:to-transparent transition-all duration-200 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 ">
                        {product.images.length > 0 ? (
                          <div className="relative  w-20 h-20 lg:w-30 lg:h-30 rounded-xl overflow-hidden border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow bg-white flex-shrink-0">
                            <Image
                              src={product.images[0]}
                              alt={product.name}
                              fill
                              className="object-cover p-1 rounded-md"
                            />
                          </div>
                        ) : (
                          <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-2 border-gray-300 flex-shrink-0">
                            <ImageIcon className="w-10 h-10 text-gray-400" />
                          </div>
                        )}
                        <div className="max-w-xs">
                          <div className="font-bold text-gray-900 text-base line-clamp-2 leading-tight">{product.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-medium text-sm">
                        {product.gameName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                        ฿{product.price.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {product.stock === -1 ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 font-semibold text-sm">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          ไม่จำกัด
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 font-semibold text-sm">
                          {product.stock} ชิ้น
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {product.status === "active" ? (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-green-400 to-green-500 text-white font-bold text-sm shadow-md">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          เปิดขาย
                        </span>
                      ) : product.status === "out_of_stock" ? (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-red-400 to-red-500 text-white font-bold text-sm shadow-md">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          สินค้าหมด
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-gray-400 to-gray-500 text-white font-bold text-sm shadow-md">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                          ปิดขาย
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="group p-2.5 hover:bg-blue-50 rounded-xl transition-all duration-200 border-2 border-transparent hover:border-blue-200"
                          disabled={loadingProducts}
                          title="แก้ไข"
                        >
                          <Pencil className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="group p-2.5 hover:bg-red-50 rounded-xl transition-all duration-200 border-2 border-transparent hover:border-red-200"
                          disabled={loadingProducts}
                          title="ลบ"
                        >
                          <Trash2 className="h-5 w-5 text-red-600 group-hover:scale-110 transition-transform" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60" onClick={closeModal}>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div 
                className="relative w-full max-w-4xl bg-white rounded-lg shadow-xl transform transition-all"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10 rounded-t-lg">
                  <h3 className="text-lg font-semibold">
                    {editingId ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}
                  </h3>
                  <button
                    onClick={closeModal}
                    className="p-2 hover:bg-gray-100 rounded-full"
                    type="button"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="max-h-[70vh] overflow-y-auto">
                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Game Selection */}
                <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  เลือกเกม <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.gameId}
                  onChange={(e) => handleGameSelect(e.target.value)}
                  className="w-full px-3 py-2 border-2 rounded-md focus:border-[#ff9800] focus:outline-none"
                  disabled={loadingProducts}
                  required
                >
                  <option value="">-- เลือกเกม --</option>
                  {games.map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  ชื่อสินค้า <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น บัญชี RoV ระดับ 60 มีสกิน 50+"
                  className="border-2 focus:border-[#ff9800]"
                  disabled={loadingProducts}
                  required
                  autoFocus
                />
              </div>

              {/* Price and Stock */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    ราคา (บาท) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={formData.price}
                    onChange={(e) => {
                      const value = e.target.value
                      // Allow empty string or valid numbers
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setFormData({ ...formData, price: value as any })
                      }
                    }}
                    placeholder="ใส่ราคาสินค้า"
                    className="border-2 focus:border-[#ff9800]"
                    disabled={loadingProducts}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    คลังสินค้า
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={formData.stock}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          stock: e.target.value ? Number(e.target.value) : 0,
                        })
                      }
                      placeholder="จำนวนสินค้า"
                      min="0"
                      className="border-2 focus:border-[#ff9800]"
                      disabled={loadingProducts}
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  คำอธิบาย <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="อธิบายรายละเอียดสินค้า เช่น ระดับ, ไอเทม, สกิน, ตัวละคร"
                  className="border-2 focus:border-[#ff9800] resize-none"
                  rows={4}
                  disabled={loadingProducts}
                  required
                />
              </div>

              {/* Images */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  รูปภาพสินค้า {!editingId && <span className="text-red-500">*</span>}
                  <span className="text-xs font-normal text-gray-500 ml-2">(สูงสุด 5 รูป)</span>
                </label>
                
                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <p className="text-xs text-blue-800">
                        💡 <strong>คลิกที่รูปภาพ</strong>เพื่อเลือกเป็นรูปหลักที่จะแสดงในหน้าร้าน
                      </p>
                    </div>
                    <div className="grid grid-cols-5 gap-2 mb-3">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <div 
                            className={`relative w-full aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                              index === primaryImageIndex 
                                ? 'border-green-500 ring-2 ring-green-300' 
                                : 'border-gray-200 hover:border-[#ff9800]'
                            }`}
                            onClick={() => setPrimaryImageIndex(index)}
                            title="คลิกเพื่อตั้งเป็นรูปหลัก"
                          >
                            <Image src={preview} alt={`Preview ${index + 1}`} fill className="object-cover" />
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveImage(index)
                            }}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          {index === primaryImageIndex && (
                            <div className="absolute bottom-0 left-0 right-0 bg-green-500 text-white text-xs text-center py-1 font-semibold">
                              รูปหลัก
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Upload Button */}
                {imagePreviews.length < 5 && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#ff9800] transition-colors"
                  >
                    <Upload className="w-10 h-10 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600 font-medium">คลิกเพื่ออัปโหลดรูปภาพ</span>
                    <span className="text-xs text-gray-500 mt-1">JPG, PNG, GIF (สูงสุด 5MB)</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  สถานะ
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as "active" | "inactive" })
                  }
                  className="w-full px-3 py-2 border-2 rounded-md focus:border-[#ff9800] focus:outline-none"
                  disabled={loadingProducts}
                >
                  <option value="active">เปิดขาย</option>
                  <option value="inactive">ปิดขาย</option>
                </select>
              </div>

              {/* Footer */}
              <div className="flex gap-4 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  disabled={loadingProducts}
                  className="flex-1"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-[#ff9800] to-[#f57c00] hover:from-[#e08800] hover:to-[#d56600] text-white"
                  disabled={loadingProducts}
                >
                  {loadingProducts ? "กำลังบันทึก..." : editingId ? "บันทึก" : "เพิ่มสินค้า"}
                </Button>
              </div>
            </form>
          </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <DialogTitle className="text-xl">ยืนยันการลบสินค้า</DialogTitle>
            </div>
            <DialogDescription className="text-base pt-2">
              คุณแน่ใจหรือไม่ที่จะลบสินค้านี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false)
                setProductToDelete(null)
              }}
              disabled={loadingProducts}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={loadingProducts}
              className="bg-red-600 hover:bg-red-700"
            >
              {loadingProducts ? "กำลังลบ..." : "ลบสินค้า"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
