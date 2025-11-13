'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Upload, Trash2, GripVertical, Eye, EyeOff, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { useToast } from '@/hooks/use-toast'

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

  const handleDelete = async (id: string, url: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบรูปนี้?')) return

    try {
      const token = await user?.getIdToken()
      const response = await fetch(`/api/slider?id=${id}&url=${encodeURIComponent(url)}`, {
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
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#ff9800] mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-6 h-6 text-[#ff9800]" />
          จัดการรูปหน้าแรก
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          อัปโหลดและจัดการรูปภาพสำหรับหน้าแรก (สูงสุด 5 รูป) • ขนาดไฟล์ไม่เกิน 50MB
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm">
              {images.length} / 5 รูป
            </Badge>
            {images.filter(img => img.active).length > 0 && (
              <Badge className="bg-green-600 text-sm">
                ✅ แสดง {images.filter(img => img.active).length} รูป
              </Badge>
            )}
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
              className="pointer-events-none"
              asChild
            >
              <span>
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? 'กำลังอัปโหลด...' : 'อัปโหลดรูปใหม่'}
              </span>
            </Button>
          </label>
        </div>

        {/* Images Grid */}
        {images.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl">
            <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">ยังไม่มีรูปหน้าแรก</p>
            <p className="text-sm text-gray-500">อัปโหลดรูปเพื่อแสดงบนหน้าแรก</p>
          </div>
        ) : (
          <div className="space-y-3">
            {images.map((image, index) => (
              <div
                key={image.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`border rounded-xl p-4 transition-all ${
                  draggedIndex === index ? 'opacity-50' : 'opacity-100'
                } hover:shadow-lg cursor-move ${
                  image.active ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Drag Handle */}
                  <div className="flex-shrink-0">
                    <GripVertical className="w-5 h-5 text-gray-400" />
                  </div>

                  {/* Order Badge */}
                  <div className="flex-shrink-0">
                    <Badge variant="outline" className="font-bold">
                      #{image.order}
                    </Badge>
                  </div>

                  {/* Image Preview */}
                  <div className="relative w-32 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 border-gray-300">
                    <Image
                      src={image.url}
                      alt={`Slider ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {image.active ? (
                        <Badge className="bg-green-600">✅ แสดง</Badge>
                      ) : (
                        <Badge variant="outline">❌ ซ่อน</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      อัปโหลดเมื่อ: {new Date(image.createdAt).toLocaleDateString('th-TH')}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(image.id, image.active)}
                    >
                      {image.active ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(image.id, image.url)}
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
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-900 font-semibold mb-2">💡 คำแนะนำ:</p>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>ลากและวางเพื่อเรียงลำดับรูป</li>
            <li>กดปุ่ม 👁️ เพื่อแสดง/ซ่อนรูปในหน้าแรก</li>
            <li>รูปจะเปลี่ยนอัตโนมัติทุก 5 วินาที</li>
            <li>แนะนำขนาดรูป 1920x1080 หรือ 16:9</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
