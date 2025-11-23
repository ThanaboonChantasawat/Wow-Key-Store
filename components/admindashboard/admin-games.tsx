"use client"

import { useState, useEffect, useRef } from "react"
import { Gamepad2, Search, Plus, Edit2, Trash2, X, Check, AlertCircle, Filter, CheckCircle, XCircle, AlertTriangle, Star, Image as ImageIcon, Pencil, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getAllGames, createGame, updateGame, deleteGame, type Game } from "@/lib/game-service"
import { getAllCategories, type Category } from "@/lib/category-service"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { storage } from "@/components/firebase-config"
import Image from "next/image"

// Helper function to delete old image from Firebase Storage
const deleteImageFromStorage = async (imageUrl: string) => {
  if (!imageUrl || !imageUrl.includes('firebasestorage.googleapis.com')) {
    return; // Skip if not a Firebase Storage URL
  }
  
  try {
    // Extract the file path from the URL
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
    // Don't throw error, continue with the update
  }
};

export function AdminGames() {
  const [games, setGames] = useState<Game[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    imageUrl: "",
    categories: [] as string[],
    isPopular: false,
    status: "active" as 'active' | 'inactive'
  })
  
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

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
          // Delete old image if updating and URL exists
          if (editingId && formData.imageUrl) {
            await deleteImageFromStorage(formData.imageUrl);
          }
          
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

  // Pagination calculations
  const filteredGames = games.filter(game => {
    const matchesSearch = game.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || 
                          (statusFilter === "popular" && game.isPopular) ||
                          game.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalPages = Math.ceil(filteredGames.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentGames = filteredGames.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input 
          type="search" 
          placeholder="ค้นหาเกม..." 
          className="pl-10 bg-white"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card 
          className={`p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${statusFilter === 'all' ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-500 ring-offset-2' : 'bg-white border-transparent hover:border-orange-200'}`}
          onClick={() => setStatusFilter('all')}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${statusFilter === 'all' ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <Gamepad2 className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${statusFilter === 'all' ? 'text-orange-900' : 'text-gray-900'}`}>{games.length}</div>
              <div className={`text-xs sm:text-sm font-medium truncate ${statusFilter === 'all' ? 'text-orange-700' : 'text-gray-500'}`}>ทั้งหมด</div>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${statusFilter === 'active' ? 'bg-green-50 border-green-500 ring-2 ring-green-500 ring-offset-2' : 'bg-white border-transparent hover:border-green-200'}`}
          onClick={() => setStatusFilter('active')}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${statusFilter === 'active' ? 'bg-gradient-to-br from-green-500 to-green-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${statusFilter === 'active' ? 'text-green-900' : 'text-gray-900'}`}>{games.filter(g => g.status === 'active').length}</div>
              <div className={`text-xs sm:text-sm font-medium truncate ${statusFilter === 'active' ? 'text-green-700' : 'text-gray-500'}`}>ใช้งานอยู่</div>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${statusFilter === 'inactive' ? 'bg-red-50 border-red-500 ring-2 ring-red-500 ring-offset-2' : 'bg-white border-transparent hover:border-red-200'}`}
          onClick={() => setStatusFilter('inactive')}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${statusFilter === 'inactive' ? 'bg-gradient-to-br from-red-500 to-red-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <XCircle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${statusFilter === 'inactive' ? 'text-red-900' : 'text-gray-900'}`}>{games.filter(g => g.status === 'inactive').length}</div>
              <div className={`text-xs sm:text-sm font-medium truncate ${statusFilter === 'inactive' ? 'text-red-700' : 'text-gray-500'}`}>ระงับ</div>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${statusFilter === 'popular' ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-500 ring-offset-2' : 'bg-white border-transparent hover:border-purple-200'}`}
          onClick={() => setStatusFilter('popular')}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${statusFilter === 'popular' ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <Star className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${statusFilter === 'popular' ? 'text-purple-900' : 'text-gray-900'}`}>{games.filter(g => g.isPopular).length}</div>
              <div className={`text-xs sm:text-sm font-medium truncate ${statusFilter === 'popular' ? 'text-purple-700' : 'text-gray-500'}`}>ยอดนิยม</div>
            </div>
          </div>
        </Card>
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
        className="bg-gradient-to-r from-[#ff9800] to-[#f57c00] hover:from-[#e08800] hover:to-[#d56600] text-white font-bold"
        disabled={loading}
      >
        <Plus className="w-5 h-5 mr-2" />
        เพิ่มเกมใหม่
      </Button>

      {/* Games List */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#ff9800]" />
              เกมทั้งหมด ({games.length})
            </h3>
            {totalPages > 1 && (
              <div className="text-sm text-gray-600">
                หน้า {currentPage} / {totalPages}
              </div>
            )}
          </div>
        </div>

        {loading && games.length === 0 ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff9800] mx-auto"></div>
            <p className="text-gray-500 mt-4">กำลังโหลด...</p>
          </div>
        ) : games.length === 0 ? (
          <div className="p-12 text-center">
            <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">ยังไม่มีเกม</h4>
            <p className="text-sm sm:text-base text-gray-600">เพิ่มเกมแรกของคุณเลย!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-200">
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-bold text-gray-800 text-xs sm:text-sm">รูปภาพ</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-bold text-gray-800 text-xs sm:text-sm">ชื่อเกม</th>
                  <th className="hidden lg:table-cell px-6 py-4 text-left font-bold text-gray-800 text-sm">หมวดหมู่</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-center font-bold text-gray-800 text-xs sm:text-sm whitespace-nowrap">สถานะ</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-center font-bold text-gray-800 text-xs sm:text-sm">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {currentGames.map((game) => (
                  <tr key={game.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={game.imageUrl}
                          alt={game.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="font-semibold text-[#292d32] text-sm sm:text-base">{game.name}</div>
                      <div className="lg:hidden text-xs text-gray-600 mt-1">
                        {getCategoryNames(game.categories) || "-"}
                      </div>
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4 text-gray-600 text-sm">
                      {getCategoryNames(game.categories) || "-"}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                      <span className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                        game.status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {game.status === 'active' ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="flex items-center justify-center gap-1 sm:gap-2">
                        <button
                          onClick={() => handleEdit(game)}
                          className="p-1.5 sm:p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          disabled={loading}
                          title="แก้ไข"
                        >
                          <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(game.id)}
                          className="p-1.5 sm:p-2 hover:bg-red-50 rounded-lg transition-colors"
                          disabled={loading}
                          title="ลบ"
                        >
                          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && games.length > 0 && (
          <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Page Info */}
              <div className="text-sm text-gray-600">
                หน้า {currentPage} จาก {totalPages} (แสดง {currentGames.length} จาก {games.length} รายการ)
              </div>

              {/* Pagination Buttons */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                {/* Previous Button */}
                <Button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                  className="px-3"
                >
                  ← ก่อนหน้า
                </Button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={page}
                          onClick={() => goToPage(page)}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          className={`w-9 h-9 p-0 ${
                            currentPage === page
                              ? "bg-[#ff9800] hover:bg-[#e08800] text-white"
                              : ""
                          }`}
                        >
                          {page}
                        </Button>
                      )
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return (
                        <span key={page} className="px-2 text-gray-400">
                          ...
                        </span>
                      )
                    }
                    return null
                  })}
                </div>

                {/* Next Button */}
                <Button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                  className="px-3"
                >
                  ถัดไป →
                </Button>
              </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={closeModal}
        >
          <div 
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 bg-white rounded-xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`p-6 rounded-t-xl relative ${
              editingId 
                ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500' 
                : 'bg-gradient-to-r from-green-600 via-green-500 to-emerald-500'
            }`}>
              {/* Close Button */}
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors z-10"
                type="button"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              <h3 className="text-2xl font-bold text-white flex items-center gap-2 pr-10">
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

              <div className="hidden">
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
          </div>
        </div>
      )}
      

    </div>
  )
}
