'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Upload, Trash2, GripVertical, Eye, EyeOff, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface SliderImage {
  id: string
  url: string
  order: number
  active: boolean
  createdAt: string
}

export function SliderManagement() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [images, setImages] = useState<SliderImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<{ id: string; url: string } | null>(null)

  useEffect(() => {
    fetchImages()
  }, [])

  const fetchImages = async () => {
    try {
      const token = await user?.getIdToken()
      const response = await fetch('/api/slider?activeOnly=false', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setImages(data.images || [])
      }
    } catch (error) {
      console.error('Error fetching slider images:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (max 50MB for high quality images)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "ขนาดไฟล์ใหญ่เกินไป",
        description: "ขนาดไฟล์ต้องไม่เกิน 50MB",
        variant: "destructive",
      })
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "ไฟล์ไม่ถูกต้อง",
        description: "กรุณาเลือกไฟล์รูปภาพเท่านั้น",
        variant: "destructive",
      })
      return
    }

    // Check limit
    if (images.length >= 5) {
      toast({
        title: "ถึงขีดจำกัด",
        description: "สามารถอัปโหลดรูปได้สูงสุด 5 รูปเท่านั้น",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    try {
      const token = await user?.getIdToken()
      const formData = new FormData()
      formData.append('file', file)
      formData.append('order', String(images.length + 1))

      const response = await fetch('/api/slider', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (response.ok) {
        toast({
          title: "✅ อัปโหลดสำเร็จ",
          description: "เพิ่มรูปหน้าแรกเรียบร้อยแล้ว",
        })
        fetchImages()
      } else {
        const data = await response.json()
        toast({
          title: "เกิดข้อผิดพลาด",
          description: data.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปโหลดรูปได้",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      e.target.value = '' // Reset input
    }
  }

  const openDeleteDialog = (id: string, url: string) => {
    setImageToDelete({ id, url })
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!imageToDelete) return

    try {
      const token = await user?.getIdToken()
      const response = await fetch(`/api/slider?id=${imageToDelete.id}&url=${encodeURIComponent(imageToDelete.url)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        toast({
          title: "✅ ลบสำเร็จ",
          description: "ลบรูปหน้าแรกเรียบร้อยแล้ว",
        })
        fetchImages()
      } else {
        const data = await response.json()
        toast({
          title: "เกิดข้อผิดพลาด",
          description: data.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting image:', error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบรูปได้",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setImageToDelete(null)
    }
  }

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      const token = await user?.getIdToken()
      const response = await fetch('/api/slider', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id,
          updates: { active: !currentActive },
        }),
      })

      if (response.ok) {
        toast({
          title: "✅ อัปเดตสำเร็จ",
          description: `${!currentActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}รูปหน้าแรกแล้ว`,
        })
        fetchImages()
      } else {
        const data = await response.json()
        toast({
          title: "เกิดข้อผิดพลาด",
          description: data.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error toggling active:', error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตสถานะได้",
        variant: "destructive",
      })
    }
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newImages = [...images]
    const draggedImage = newImages[draggedIndex]
    newImages.splice(draggedIndex, 1)
    newImages.splice(index, 0, draggedImage)

    setImages(newImages)
    setDraggedIndex(index)
  }

  const handleDragEnd = async () => {
    if (draggedIndex === null) return

    try {
      const token = await user?.getIdToken()
      const imageIds = images.map(img => img.id)

      const response = await fetch('/api/slider/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ imageIds }),
      })

      if (response.ok) {
        toast({
          title: "✅ จัดเรียงสำเร็จ",
          description: "จัดเรียงรูปหน้าแรกเรียบร้อยแล้ว",
        })
        fetchImages()
      } else {
        const data = await response.json()
        toast({
          title: "เกิดข้อผิดพลาด",
          description: data.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error reordering images:', error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถจัดเรียงรูปได้",
        variant: "destructive",
      })
    } finally {
      setDraggedIndex(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#ff9800]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-[#ff9800]" />
            จัดการรูปหน้าแรก
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            อัปโหลดและจัดการรูปภาพสำหรับหน้าแรก (สูงสุด 5 รูป) • ขนาดไฟล์ไม่เกิน 50MB
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border shadow-sm">
            <span className="text-sm text-gray-500">จำนวนรูป:</span>
            <Badge variant="secondary" className="font-mono">
              {images.length}/5
            </Badge>
          </div>
          
          <label className={images.length >= 5 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}>
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              disabled={isUploading || images.length >= 5}
              className="hidden"
            />
            <Button
              type="button"
              disabled={isUploading || images.length >= 5}
              className="pointer-events-none bg-gradient-to-r from-[#ff9800] to-[#f57c00] hover:from-[#e08800] hover:to-[#d56600] text-white shadow-md transition-all hover:scale-105"
              asChild
            >
              <span>
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? 'กำลังอัปโหลด...' : 'อัปโหลดรูปใหม่'}
              </span>
            </Button>
          </label>
        </div>
      </div>

      {/* Images List */}
      {images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-dashed border-gray-300 shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <ImageIcon className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">ยังไม่มีรูปหน้าแรก</h3>
          <p className="text-sm text-gray-500 mt-1">อัปโหลดรูปภาพเพื่อแสดงในสไลด์หน้าแรก</p>
        </div>
      ) : (
        <div className="space-y-4">
          {images.map((image, index) => (
            <div
              key={image.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`group relative bg-white rounded-xl border transition-all duration-200 ${
                draggedIndex === index ? 'opacity-50 scale-[0.98]' : 'opacity-100 hover:shadow-md hover:border-orange-200'
              } ${
                !image.active && 'bg-gray-50'
              }`}
            >
              <div className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                {/* Drag Handle & Order */}
                <div className="flex items-center gap-3 sm:flex-col sm:gap-1 text-gray-400 cursor-move hover:text-gray-600">
                  <GripVertical className="w-5 h-5" />
                  <span className="text-xs font-mono font-medium">#{index + 1}</span>
                </div>

                {/* Image Preview */}
                <div className="relative w-full sm:w-64 aspect-video rounded-lg overflow-hidden bg-gray-100 border shadow-sm group-hover:shadow-md transition-shadow">
                  <Image
                    src={image.url}
                    alt={`Slider ${index + 1}`}
                    fill
                    className={`object-cover transition-opacity ${!image.active ? 'opacity-60 grayscale' : ''}`}
                  />
                  {!image.active && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                      <Badge variant="secondary" className="bg-black/50 text-white border-none backdrop-blur-sm">
                        ซ่อนอยู่
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">รูปภาพลำดับที่ {image.order}</h4>
                    {image.active ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">
                        กำลังแสดง
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500 border-gray-300">
                        ซ่อน
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    อัปโหลดเมื่อ: {new Date(image.createdAt).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 mt-2 sm:mt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(image.id, image.active)}
                    className={image.active ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50" : "text-green-600 hover:text-green-700 hover:bg-green-50"}
                  >
                    {image.active ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-2" />
                        ซ่อน
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        แสดง
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDeleteDialog(image.id, image.url)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <ImageIcon className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-blue-900 mb-1">คำแนะนำการใช้งาน</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside opacity-80">
            <li>ลากและวางที่แถบด้านซ้ายเพื่อเรียงลำดับรูปภาพ</li>
            <li>รูปภาพจะแสดงตามลำดับที่กำหนด</li>
            <li>แนะนำให้ใช้รูปภาพขนาด 1920x1080 พิกเซล หรืออัตราส่วน 16:9 เพื่อความสวยงาม</li>
          </ul>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบ</DialogTitle>
            <DialogDescription>
              คุณแน่ใจหรือไม่ที่จะลบรูปหน้าแรกนี้? การกระทำนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              ลบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

