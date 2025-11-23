"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, Image as ImageIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { getAllCategories, createCategory, updateCategory, deleteCategory, type Category } from "@/lib/category-service"

export function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    slug: ""
  })
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      const data = await getAllCategories()
      setCategories(data)
    } catch (error) {
      console.error("Error loading categories:", error)
      setMessage({ type: "error", text: "โหลดข้อมูลไม่สำเร็จ" })
    } finally {
      setLoading(false)
    }
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\u0E00-\u0E7Fa-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: generateSlug(name)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setMessage({ type: "error", text: "กรุณากรอกชื่อหมวดหมู่" })
      return
    }

    try {
      setLoading(true)
      
      if (editingId) {
        // When editing, only update name and description (slug cannot be changed)
        await updateCategory(editingId, {
          name: formData.name,
          description: formData.description
        })
        setMessage({ type: "success", text: "แก้ไขหมวดหมู่สำเร็จ" })
      } else {
        // When creating, include slug
        await createCategory(formData)
        setMessage({ type: "success", text: "เพิ่มหมวดหมู่สำเร็จ" })
      }
      
      setFormData({ name: "", description: "", slug: "" })
      setEditingId(null)
      setShowModal(false)
      await loadCategories()
    } catch (error) {
      console.error("Error saving category:", error)
      const errorMessage = error instanceof Error ? error.message : "เกิดข้อผิดพลาด"
      setMessage({ type: "error", text: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (category: Category) => {
    setEditingId(category.slug)
    setFormData({
      name: category.name,
      description: category.description || "",
      slug: category.slug
    })
    setShowModal(true)
  }

  const openCreateModal = () => {
    setEditingId(null)
    setFormData({ name: "", description: "", slug: "" })
    setMessage(null)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setFormData({ name: "", description: "", slug: "" })
    setMessage(null)
  }

  const handleDelete = async (categorySlug: string) => {
    if (!confirm("คุณต้องการลบหมวดหมู่นี้หรือไม่?")) return
    
    try {
      setLoading(true)
      await deleteCategory(categorySlug)
      setMessage({ type: "success", text: "ลบหมวดหมู่สำเร็จ" })
      await loadCategories()
    } catch (error) {
      console.error("Error deleting category:", error)
      setMessage({ type: "error", text: "ลบไม่สำเร็จ" })
    } finally {
      setLoading(false)
    }
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
            จัดการหมวดหมู่เกม
          </h2>
          <p className="text-white/90 text-lg">สร้างและจัดการหมวดหมู่สำหรับเกมในระบบ</p>
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

      {/* Add Button */}
      <div className="flex justify-start">
        <Button
          onClick={openCreateModal}
          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold shadow-lg hover:shadow-xl transition-all"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          เพิ่มหมวดหมู่ใหม่
        </Button>
      </div>

      {/* Categories List */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden">
        <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-[#ff9800]" />
            หมวดหมู่ทั้งหมด ({categories.length})
          </h3>
        </div>

        {loading && categories.length === 0 ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff9800] mx-auto"></div>
            <p className="text-gray-500 mt-4">กำลังโหลด...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">ยังไม่มีหมวดหมู่</h3>
            <p className="text-gray-600">เพิ่มหมวดหมู่แรกของคุณเลย!</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-200">
                    <th className="px-6 py-4 text-left font-bold text-gray-800">ชื่อหมวดหมู่</th>
                    <th className="px-6 py-4 text-left font-bold text-gray-800">คำอธิบาย</th>
                    <th className="px-6 py-4 text-center font-bold text-gray-800">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Pagination calculations
                    // const totalPages = Math.ceil(categories.length / itemsPerPage)
                    const startIndex = (currentPage - 1) * itemsPerPage
                    const endIndex = startIndex + itemsPerPage
                    const paginatedCategories = categories.slice(startIndex, endIndex)
                    
                    return paginatedCategories.map((category) => (
                      <tr key={category.slug} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-900">{category.name}</td>
                        <td className="px-6 py-4 text-gray-600 text-sm">
                          {category.description || "-"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(category)}
                              className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                              disabled={loading}
                            >
                              <Pencil className="h-4 w-4 text-blue-600" />
                            </button>
                            <button
                              onClick={() => handleDelete(category.slug)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                              disabled={loading}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  })()}
                </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {(() => {
            const totalPages = Math.ceil(categories.length / itemsPerPage)
            const startIndex = (currentPage - 1) * itemsPerPage
            const endIndex = startIndex + itemsPerPage
            const paginatedCount = Math.min(endIndex, categories.length) - startIndex
            
            return categories.length > 0 && (
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Page Info */}
                  <div className="text-sm text-gray-600">
                    หน้า {currentPage} จาก {totalPages} (แสดง {paginatedCount} จาก {categories.length} รายการ)
                  </div>

                  {/* Pagination Buttons */}
                  {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    {/* Previous Button */}
                    <Button
                      onClick={() => {
                        setCurrentPage(prev => Math.max(1, prev - 1))
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
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
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <Button
                              key={page}
                              onClick={() => {
                                setCurrentPage(page)
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                              }}
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
                      onClick={() => {
                        setCurrentPage(prev => Math.min(totalPages, prev + 1))
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
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
            )
          })()}
        </>
        )}
      </div>

      {/* Modal สำหรับเพิ่ม/แก้ไข */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={closeModal}
        >
          <div 
            className="max-w-2xl w-full bg-white relative animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto rounded-xl shadow-xl" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`p-6 rounded-t-xl relative ${
              editingId 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                : 'bg-gradient-to-r from-green-500 to-green-600'
            }`}>
              {/* Close Button */}
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors z-10"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              <h3 className="text-2xl font-bold text-white flex items-center gap-3 pr-10">
                {editingId ? (
                  <>
                    <Pencil className="w-7 h-7" />
                    <div>
                      <div>แก้ไขหมวดหมู่</div>
                      <div className="text-sm text-white/90 font-medium mt-1">
                        {formData.name}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <Plus className="w-7 h-7" />
                    เพิ่มหมวดหมู่ใหม่
                  </>
                )}
              </h3>
            </div>

            {/* Modal Message */}
            {message && (
              <div className="p-4 border-b border-gray-200">
                <div
                  className={`p-3 rounded-lg ${
                    message.type === "success"
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  <span className="font-medium text-sm">{message.text}</span>
                </div>
              </div>
            )}

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  ชื่อหมวดหมู่ <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="เช่น MOBA, RPG, FPS"
                  className="border-2 focus:border-[#ff9800]"
                  disabled={loading}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  คำอธิบาย (ไม่บังคับ)
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="อธิบายแนวเกม, ใส่ชื่อเกมดังๆ, และสิ่งที่คนมองหา (เช่น สกิน, แรงค์)"
                  className="border-2 focus:border-[#ff9800] resize-none"
                  rows={4}
                  disabled={loading}
                />
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  disabled={loading}
                  className="flex-1 border-2"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  className={`flex-1 ${
                    editingId
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                      : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                  } text-white font-bold shadow-md`}
                  disabled={loading}
                >
                  {loading ? (
                    'กำลังบันทึก...'
                  ) : editingId ? (
                    <>
                      <Pencil className="w-4 h-4 mr-2" />
                      บันทึกการแก้ไข
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      เพิ่มหมวดหมู่
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
