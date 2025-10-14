"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, Pencil, Trash2, Upload, X, Image as ImageIcon, Search, Package } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
import { getShopByOwnerId } from "@/lib/shop-service"
import { updateUserProfile } from "@/lib/user-service"
import { getAllGames, type Game } from "@/lib/game-service"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { storage } from "@/components/firebase-config"
import { useAuth } from "@/components/auth-context"
import Image from "next/image"

export function SellerProducts() {
  const { profile, loading: profileLoading } = useUserProfile()
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [shopId, setShopId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<ProductFormData>({
    gameId: "",
    gameName: "",
    name: "",
    description: "",
    price: 0,
    images: [],
    stock: "unlimited",
    category: "",
    status: "active",
  })
  
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
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
      setLoading(false)
      return
    }

    // If profile has shopId, use it
    if (profile?.shopId) {
      setShopId(profile.shopId)
      return
    }

    // If profile doesn't have shopId but user exists, check if shop exists
    try {
      const shop = await getShopByOwnerId(user.uid)
      if (shop) {
        // Found shop, update user profile with shopId
        setShopId(shop.shopId)
        await updateUserProfile(user.uid, {
          shopId: shop.shopId,
          isSeller: true,
          role: "seller",
        })
        console.log("Updated user profile with shopId:", shop.shopId)
      } else {
        setLoading(false)
      }
    } catch (error) {
      console.error("Error checking shop:", error)
      setLoading(false)
    }
  }

  const loadData = async () => {
    if (!shopId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const [productsData, gamesData] = await Promise.all([
        getProductsByShop(shopId),
        getAllGames(),
      ])
      setProducts(productsData)
      setGames(gamesData.filter((g) => g.status === "active"))
    } catch (error) {
      console.error("Error loading data:", error)
      setMessage({ type: "error", text: "โหลดข้อมูลไม่สำเร็จ" })
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!shopId) return
    
    try {
      setLoading(true)
      if (searchQuery.trim()) {
        const results = await searchProductsByShop(shopId, searchQuery)
        setProducts(results)
      } else {
        await loadData()
      }
    } catch (error) {
      console.error("Error searching:", error)
      setMessage({ type: "error", text: "ค้นหาไม่สำเร็จ" })
    } finally {
      setLoading(false)
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
      stock: product.stock === -1 ? "unlimited" : product.stock,
      category: product.category,
      status: product.status === "out_of_stock" ? "active" : product.status,
    })
    setImagePreviews(product.images)
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
      setLoading(true)
      let imageUrls = formData.images

      // Upload new images if any
      if (imageFiles.length > 0) {
        const uploadPromises = imageFiles.map(async (file) => {
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
        stock: formData.stock === "unlimited" ? "unlimited" : Number(formData.stock),
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
      setLoading(false)
    }
  }

  const handleDelete = async (productId: string) => {
    if (!confirm("คุณต้องการลบสินค้านี้หรือไม่?")) return

    try {
      setLoading(true)
      await deleteProduct(productId)
      setMessage({ type: "success", text: "ลบสินค้าสำเร็จ" })
      await loadData()
    } catch (error) {
      console.error("Error deleting product:", error)
      setMessage({ type: "error", text: "ลบไม่สำเร็จ" })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setFormData({
      gameId: "",
      gameName: "",
      name: "",
      description: "",
      price: 0,
      images: [],
      stock: "unlimited",
      category: "",
      status: "active",
    })
    setImageFiles([])
    setImagePreviews([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  if (!shopId) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-800 mb-2">ยังไม่มีร้านค้า</h3>
        <p className="text-gray-600">กรุณาสร้างร้านค้าก่อนเพื่อเพิ่มสินค้า</p>
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

        {loading && products.length === 0 ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff9800] mx-auto"></div>
            <p className="text-gray-500 mt-4">กำลังโหลด...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">ยังไม่มีสินค้า</h3>
            <p className="text-gray-600">เพิ่มสินค้าแรกของคุณเลย!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#ff9800] text-white">
                  <th className="px-6 py-4 text-left font-semibold">สินค้า</th>
                  <th className="px-6 py-4 text-left font-semibold">เกม</th>
                  <th className="px-6 py-4 text-center font-semibold">ราคา</th>
                  <th className="px-6 py-4 text-center font-semibold">คลังสินค้า</th>
                  <th className="px-6 py-4 text-center font-semibold">สถานะ</th>
                  <th className="px-6 py-4 text-center font-semibold">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {product.images.length > 0 ? (
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200">
                            <Image
                              src={product.images[0]}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div className="font-semibold text-gray-900">{product.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{product.gameName}</td>
                    <td className="px-6 py-4 text-center font-semibold text-[#ff9800]">
                      ฿{product.price.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600">
                      {product.stock === -1 ? "ไม่จำกัด" : product.stock}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          product.status === "active"
                            ? "bg-green-100 text-green-700"
                            : product.status === "out_of_stock"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {product.status === "active"
                          ? "เปิดขาย"
                          : product.status === "out_of_stock"
                          ? "สินค้าหมด"
                          : "ปิดขาย"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          disabled={loading}
                        >
                          <Pencil className="h-4 w-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onMouseDown={(e) => {
            // Prevent closing when starting drag from modal
            if (e.target !== e.currentTarget) {
              e.stopPropagation()
            }
          }}
          onClick={(e) => {
            // Only close if clicking directly on backdrop
            if (e.target === e.currentTarget) {
              // Check if there's text selection (user was selecting text)
              const selection = window.getSelection()
              if (selection && selection.toString().length > 0) {
                return // Don't close if user was selecting text
              }
              closeModal()
            }
          }}
        >
          <Card
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 p-0 border-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
              type="button"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            {/* Header */}
            <div
              className={`p-6 rounded-t-xl ${
                editingId
                  ? "bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500"
                  : "bg-gradient-to-r from-green-600 via-green-500 to-emerald-500"
              }`}
            >
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                {editingId ? (
                  <>
                    <Pencil className="w-6 h-6" />
                    แก้ไขสินค้า
                  </>
                ) : (
                  <>
                    <Plus className="w-6 h-6" />
                    เพิ่มสินค้าใหม่
                  </>
                )}
              </h3>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Game Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  เลือกเกม <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.gameId}
                  onChange={(e) => handleGameSelect(e.target.value)}
                  className="w-full px-3 py-2 border-2 rounded-md focus:border-[#ff9800] focus:outline-none"
                  disabled={loading}
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
                  disabled={loading}
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
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    placeholder="0"
                    min="0"
                    className="border-2 focus:border-[#ff9800]"
                    disabled={loading}
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
                      value={formData.stock === "unlimited" ? "" : formData.stock}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          stock: e.target.value ? Number(e.target.value) : "unlimited",
                        })
                      }
                      placeholder="ไม่จำกัด"
                      min="0"
                      className="border-2 focus:border-[#ff9800]"
                      disabled={loading || formData.stock === "unlimited"}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          stock: formData.stock === "unlimited" ? 0 : "unlimited",
                        })
                      }
                      className="whitespace-nowrap"
                    >
                      {formData.stock === "unlimited" ? "กำหนดจำนวน" : "ไม่จำกัด"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  คำอธิบาย
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="อธิบายรายละเอียดสินค้า เช่น ระดับ, ไอเทม, สกิน, ตัวละคร"
                  className="border-2 focus:border-[#ff9800] resize-none"
                  rows={4}
                  disabled={loading}
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
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <div className="relative w-full aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                          <Image src={preview} alt={`Preview ${index + 1}`} fill className="object-cover" />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        {index === 0 && (
                          <div className="absolute bottom-0 left-0 right-0 bg-green-500 text-white text-xs text-center py-1">
                            รูปหลัก
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
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
                  disabled={loading}
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
                  disabled={loading}
                  className="flex-1"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-[#ff9800] to-[#f57c00] hover:from-[#e08800] hover:to-[#d56600] text-white font-bold"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                      กำลังบันทึก...
                    </span>
                  ) : editingId ? (
                    <>
                      <Pencil className="w-4 h-4 mr-2" />
                      บันทึกการแก้ไข
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      เพิ่มสินค้า
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
