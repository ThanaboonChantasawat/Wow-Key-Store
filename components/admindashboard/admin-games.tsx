"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, Pencil, Trash2, Upload, X, Image as ImageIcon, Star, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getAllGames, createGame, updateGame, deleteGame, type Game } from "@/lib/game-service"
import { getAllCategories, createCategory, deleteCategory, type Category } from "@/lib/category-service"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { storage } from "@/components/firebase-config"
import Image from "next/image"

export function AdminGames() {
  const [games, setGames] = useState<Game[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Category management states
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [newCategoryData, setNewCategoryData] = useState({
    name: "",
    description: ""
  })
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    imageUrl: "",
    categories: [] as string[],
    isPopular: false,
    status: "active" as 'active' | 'inactive'
  })
  
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [gamesData, categoriesData] = await Promise.all([
        getAllGames(),
        getAllCategories()
      ])
      console.log("Loaded categories:", categoriesData);
      console.log("First category:", categoriesData[0]);
      setGames(gamesData)
      setCategories(categoriesData)
    } catch (error) {
      console.error("Error loading data:", error)
      setMessage({ type: "error", text: "โหลดข้อมูลไม่สำเร็จ" })
    } finally {
      setLoading(false)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "กรุณาเลือกไฟล์รูปภาพ" })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "ขนาดไฟล์ต้องไม่เกิน 5MB" })
      return
    }

    setImageFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
    setMessage(null)
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setMessage({ type: "error", text: "กรุณากรอกชื่อเกม" })
      return
    }

    if (formData.categories.length === 0) {
      setMessage({ type: "error", text: "กรุณาเลือกหมวดหมู่อย่างน้อย 1 หมวดหมู่" })
      return
    }

    if (!editingId && !imageFile) {
      setMessage({ type: "error", text: "กรุณาเลือกรูปภาพ" })
      return
    }

    try {
      setLoading(true)
      let imageUrl = formData.imageUrl

      // Upload image if new file selected
      if (imageFile) {
        try {
          const timestamp = Date.now()
          const storageRef = ref(storage, `game-images/${timestamp}_${imageFile.name}`)
          await uploadBytes(storageRef, imageFile)
          imageUrl = await getDownloadURL(storageRef)
        } catch (uploadError) {
          console.error("Error uploading image:", uploadError)
          setMessage({ type: "error", text: "อัปโหลดรูปภาพไม่สำเร็จ" })
          setLoading(false)
          return
        }
      }

      const gameData = {
        ...formData,
        imageUrl
      }

      console.log("Saving game data:", gameData)

      if (editingId) {
        console.log("Updating game with ID:", editingId)
        await updateGame(editingId, gameData)
        setMessage({ type: "success", text: "แก้ไขเกมสำเร็จ" })
      } else {
        console.log("Creating new game")
        const newGameId = await createGame(gameData)
        console.log("Created game with ID:", newGameId)
        setMessage({ type: "success", text: "เพิ่มเกมสำเร็จ" })
      }
      
      resetForm()
      await loadData()
    } catch (error) {
      console.error("Error saving game:", error)
      setMessage({ type: "error", text: "เกิดข้อผิดพลาด" })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (game: Game) => {
    setEditingId(game.id)
    setFormData({
      name: game.name,
      description: game.description || "",
      imageUrl: game.imageUrl,
      categories: game.categories,
      isPopular: game.isPopular,
      status: game.status
    })
    setImagePreview(game.imageUrl)
  }

  const handleDelete = async (gameId: string) => {
    if (!confirm("คุณต้องการลบเกมนี้หรือไม่?")) return
    
    try {
      setLoading(true)
      await deleteGame(gameId)
      setMessage({ type: "success", text: "ลบเกมสำเร็จ" })
      await loadData()
    } catch (error) {
      console.error("Error deleting game:", error)
      setMessage({ type: "error", text: "ลบไม่สำเร็จ" })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setFormData({
      name: "",
      description: "",
      imageUrl: "",
      categories: [],
      isPopular: false,
      status: "active"
    })
    setImageFile(null)
    setImagePreview("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const toggleCategory = (categorySlug: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(categorySlug)
        ? prev.categories.filter(slug => slug !== categorySlug)
        : [...prev.categories, categorySlug]
    }))
  }

  const getCategoryNames = (categorySlugs: string[]) => {
    return categorySlugs
      .map(slug => categories.find(cat => cat.slug === slug)?.name)
      .filter(Boolean)
      .join(", ")
  }



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-[#292d32]">จัดการเกม</h2>
        </div>
        <p className="text-gray-600 ml-16">เพิ่มและจัดการเกมสำหรับผู้ขาย</p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-xl ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
        <h3 className="text-xl font-bold text-[#292d32] mb-6">
          {editingId ? "แก้ไขเกม" : "เพิ่มเกมใหม่"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-semibold text-[#292d32] mb-2">
              รูปภาพเกม <span className="text-red-500">*</span>
            </label>
            <div className="flex items-start gap-4">
              {imagePreview ? (
                <div className="relative w-40 h-40 rounded-xl overflow-hidden border-2 border-gray-200">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-40 h-40 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#ff9800] transition-colors"
                >
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">อัปโหลดรูปภาพ</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <div className="flex-1">
                <p key="size-recommendation" className="text-sm text-gray-600 mb-2">
                  • ขนาดแนะนำ: 800x600 px
                </p>
                <p key="file-type" className="text-sm text-gray-600 mb-2">
                  • ไฟล์: JPG, PNG, GIF
                </p>
                <p key="file-size" className="text-sm text-gray-600">
                  • ขนาดไม่เกิน 5MB
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-[#292d32] mb-2">
                ชื่อเกม <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="เช่น RoV, Genshin Impact"
                className="border-2 focus:border-[#ff9800]"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#292d32] mb-2">
                สถานะ
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                className="w-full px-3 py-2 border-2 rounded-md focus:border-[#ff9800] focus:outline-none"
                disabled={loading}
              >
                <option value="active">ใช้งาน</option>
                <option value="inactive">ไม่ใช้งาน</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#292d32] mb-2">
              คำอธิบาย (ไม่บังคับ)
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="เช่น เกม MOBA ยอดนิยมที่มีผู้เล่นทั่วโลก รองรับการแข่งขัน 5v5 พร้อมระบบการจัดอันดับและทัวร์นาเมนต์ระดับโลก"
              className="border-2 focus:border-[#ff9800] resize-none"
              rows={3}
              disabled={loading}
            />
          </div>

          <div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categories.filter(cat => cat && cat.slug).map((category) => (
                <div key={category.slug} className="flex items-center justify-between space-x-2 p-2 rounded-lg border border-gray-200 hover:border-[#ff9800] transition-colors">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <Checkbox
                      id={category.slug}
                      checked={formData.categories.includes(category.slug)}
                      onCheckedChange={() => toggleCategory(category.slug)}
                      disabled={loading}
                    />
                    <label
                      htmlFor={category.slug}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer truncate"
                    >
                      {category.name}
                    </label>
                  </div>
                  
                </div>
              ))}
            </div>
            {categories.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">
                ยังไม่มีหมวดหมู่ กรุณาสร้างหมวดหมู่ก่อน
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPopular"
              checked={formData.isPopular}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, isPopular: checked as boolean })
              }
              disabled={loading}
            />
            <label
              htmlFor="isPopular"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
            >
              <Star className="w-4 h-4 text-yellow-500" />
              แสดงในหน้าหลัก (เกมยอดนิยม)
            </label>
          </div>

          <div className="flex gap-4">
            <Button
              type="submit"
              className="bg-gradient-to-r from-[#ff9800] to-[#f57c00] hover:from-[#e08800] hover:to-[#d56600] text-white"
              disabled={loading}
            >
              <Plus className="w-4 h-4 mr-2" />
              {editingId ? "บันทึกการแก้ไข" : "เพิ่มเกม"}
            </Button>
            {editingId && (
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={loading}
              >
                ยกเลิก
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Games List */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-[#292d32]">
            เกมทั้งหมด ({games.length})
          </h3>
        </div>

        {loading && games.length === 0 ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff9800] mx-auto"></div>
            <p className="text-gray-500 mt-4">กำลังโหลด...</p>
          </div>
        ) : games.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p>ยังไม่มีเกม</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-100 to-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left font-bold text-[#292d32]">รูปภาพ</th>
                  <th className="px-6 py-4 text-left font-bold text-[#292d32]">ชื่อเกม</th>
                  <th className="px-6 py-4 text-left font-bold text-[#292d32]">หมวดหมู่</th>
                  <th className="px-6 py-4 text-center font-bold text-[#292d32]">สถานะ</th>
                  <th className="px-6 py-4 text-center font-bold text-[#292d32]">ยอดนิยม</th>
                  <th className="px-6 py-4 text-center font-bold text-[#292d32]">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => (
                  <tr key={game.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                        <Image
                          src={game.imageUrl}
                          alt={game.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-[#292d32]">{game.name}</td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {getCategoryNames(game.categories) || "-"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        game.status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {game.status === 'active' ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {game.isPopular && <Star className="w-5 h-5 text-yellow-500 mx-auto fill-yellow-500" />}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(game)}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          disabled={loading}
                        >
                          <Pencil className="h-4 w-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(game.id)}
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
      

    </div>
  )
}
