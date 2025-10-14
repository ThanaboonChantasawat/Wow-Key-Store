"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, Pencil, Trash2, Upload, X, Image as ImageIcon, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card } from "@/components/ui/card"
import { getAllGames, createGame, updateGame, deleteGame, type Game } from "@/lib/game-service"
import { getAllCategories, type Category } from "@/lib/category-service"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { storage } from "@/components/firebase-config"
import Image from "next/image"

export function AdminGames() {
  const [games, setGames] = useState<Game[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  
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
      setShowModal(false)
      await loadData()
    } catch (error) {
      console.error("Error saving game:", error)
      setMessage({ type: "error", text: "เกิดข้อผิดพลาด" })
    } finally {
      setLoading(false)
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
    setShowModal(true)
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
      {/* Header - Orange Gradient */}
      <div className="bg-gradient-to-r from-orange-500 via-[#ff9800] to-red-500 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
        <div className="relative z-10">
          <h2 className="text-4xl font-bold mb-2 drop-shadow-lg flex items-center gap-3">
            <ImageIcon className="w-10 h-10" />
            จัดการเกม
          </h2>
          <p className="text-white/90 text-lg">เพิ่มและจัดการเกมสำหรับผู้ขายในระบบ</p>
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

      {/* Add Game Button */}
      <Button 
        onClick={openCreateModal}
        className="bg-gradient-to-r from-green-600 via-green-500 to-emerald-500 hover:from-green-700 hover:via-green-600 hover:to-emerald-600 text-white font-bold shadow-lg"
        size="lg"
      >
        <Plus className="w-5 h-5 mr-2" />
        เพิ่มเกมใหม่
      </Button>

      {/* Games List */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden">
        <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-[#ff9800]" />
            เกมทั้งหมด ({games.length})
          </h3>
        </div>

        {loading && games.length === 0 ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff9800] mx-auto"></div>
            <p className="text-gray-500 mt-4">กำลังโหลด...</p>
          </div>
        ) : games.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">🎮</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">ยังไม่มีเกม</h3>
            <p className="text-gray-600">เพิ่มเกมแรกของคุณเลย!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-200">
                  <th className="px-6 py-4 text-left font-bold text-gray-800">รูปภาพ</th>
                  <th className="px-6 py-4 text-left font-bold text-gray-800">ชื่อเกม</th>
                  <th className="px-6 py-4 text-left font-bold text-gray-800">หมวดหมู่</th>
                  <th className="px-6 py-4 text-center font-bold text-gray-800">สถานะ</th>
                  <th className="px-6 py-4 text-center font-bold text-gray-800">ยอดนิยม</th>
                  <th className="px-6 py-4 text-center font-bold text-gray-800">จัดการ</th>
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

      {/* Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={closeModal}
        >
          <Card 
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
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
            <div className={`p-6 rounded-t-xl ${
              editingId 
                ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500' 
                : 'bg-gradient-to-r from-green-600 via-green-500 to-emerald-500'
            }`}>
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                {editingId ? (
                  <>
                    <Pencil className="w-6 h-6" />
                    แก้ไขเกม
                  </>
                ) : (
                  <>
                    <Plus className="w-6 h-6" />
                    เพิ่มเกมใหม่
                  </>
                )}
              </h3>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                    <p className="text-sm text-gray-600 mb-2">
                      • ขนาดแนะนำ: 800x600 px
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      • ไฟล์: JPG, PNG, GIF
                    </p>
                    <p className="text-sm text-gray-600">
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
                    autoFocus
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
                  placeholder="เช่น เกม MOBA ยอดนิยมที่มีผู้เล่นทั่วโลก รองรับการแข่งขัน 5v5"
                  className="border-2 focus:border-[#ff9800] resize-none"
                  rows={3}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#292d32] mb-2">
                  หมวดหมู่ <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {categories.filter(cat => cat && cat.slug).map((category) => (
                    <div key={category.slug} className="flex items-center justify-between space-x-2 p-2 rounded-lg border border-gray-200 hover:border-[#ff9800] transition-colors">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <Checkbox
                          id={`modal-${category.slug}`}
                          checked={formData.categories.includes(category.slug)}
                          onCheckedChange={() => toggleCategory(category.slug)}
                          disabled={loading}
                        />
                        <label
                          htmlFor={`modal-${category.slug}`}
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
                  id="modal-isPopular"
                  checked={formData.isPopular}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, isPopular: checked as boolean })
                  }
                  disabled={loading}
                />
                <label
                  htmlFor="modal-isPopular"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                >
                  <Star className="w-4 h-4 text-yellow-500" />
                  แสดงในหน้าหลัก (เกมยอดนิยม)
                </label>
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
                      เพิ่มเกม
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
