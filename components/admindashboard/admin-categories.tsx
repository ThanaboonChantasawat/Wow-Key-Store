"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { getAllCategories, createCategory, updateCategory, deleteCategory, type Category } from "@/lib/category-service"

export function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    slug: ""
  })
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

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

  const handleCancel = () => {
    setEditingId(null)
    setFormData({ name: "", description: "", slug: "" })
    setMessage(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-[#292d32]">จัดการหมวดหมู่เกม</h2>
        </div>
        <p className="text-gray-600 ml-16">สร้างและจัดการหมวดหมู่สำหรับเกม</p>
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
      <div className={`rounded-2xl shadow-lg p-8 border-2 ${
        editingId 
          ? 'bg-blue-50 border-blue-300' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center gap-3 mb-6">
          {editingId && (
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Pencil className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <h3 className="text-xl font-bold text-[#292d32]">
              {editingId ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่ใหม่"}
            </h3>
            {editingId && (
              <p className="text-sm text-blue-600 font-medium">
                กำลังแก้ไข: {formData.name}
              </p>
            )}
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-[#292d32] mb-2">
              ชื่อหมวดหมู่ <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="เช่น MOBA, RPG, FPS"
              className="border-2 focus:border-[#ff9800]"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#292d32] mb-2">
              คำอธิบาย (ไม่บังคับ)
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="อธิบายแนวเกม, ใส่ชื่อเกมดังๆ, และสิ่งที่คนมองหา (เช่น สกิน, แรงค์)"
              className="border-2 focus:border-[#ff9800] resize-none"
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="flex gap-4">
            <Button
              type="submit"
              className="bg-gradient-to-r from-[#ff9800] to-[#f57c00] hover:from-[#e08800] hover:to-[#d56600] text-white"
              disabled={loading}
            >
              <Plus className="w-4 h-4 mr-2" />
              {editingId ? "บันทึกการแก้ไข" : "เพิ่มหมวดหมู่"}
            </Button>
            {editingId && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
              >
                ยกเลิก
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Categories List */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-[#292d32]">
            หมวดหมู่ทั้งหมด ({categories.length})
          </h3>
        </div>

        {loading && categories.length === 0 ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff9800] mx-auto"></div>
            <p className="text-gray-500 mt-4">กำลังโหลด...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p>ยังไม่มีหมวดหมู่</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-100 to-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left font-bold text-[#292d32]">ชื่อหมวดหมู่</th>
                  <th className="px-6 py-4 text-left font-bold text-[#292d32]">คำอธิบาย</th>
                  <th className="px-6 py-4 text-center font-bold text-[#292d32]">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.slug} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-[#292d32]">{category.name}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
