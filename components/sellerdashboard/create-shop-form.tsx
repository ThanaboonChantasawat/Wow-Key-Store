"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Store, Upload, AlertCircle, CheckCircle2 } from "lucide-react"
import { createShop } from "@/lib/shop-service"
import { updateUserProfile, getUserProfile } from "@/lib/user-service"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { storage } from "@/components/firebase-config"

interface CreateShopFormProps {
  userId: string
  onShopCreated: () => void
}

export function CreateShopForm({ userId, onShopCreated }: CreateShopFormProps) {
  const [shopName, setShopName] = useState("")
  const [description, setDescription] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: "error", text: "กรุณาเลือกไฟล์รูปภาพเท่านั้น" })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "ขนาดไฟล์ต้องไม่เกิน 5MB" })
      return
    }

    setLogoFile(file)
    
    // Create preview URL
    const reader = new FileReader()
    reader.onloadend = () => {
      setLogoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
    setMessage(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!shopName.trim()) {
      setMessage({ type: "error", text: "กรุณากรอกชื่อร้านค้า" })
      return
    }
    
    if (!description.trim()) {
      setMessage({ type: "error", text: "กรุณากรอกคำอธิบายร้านค้า" })
      return
    }

    try {
      setLoading(true)
      setMessage(null)

      let logoUrl: string | undefined = undefined

      // Upload logo only if file is selected
      if (logoFile) {
        try {
          const storageRef = ref(storage, `shop-logos/${userId}/${Date.now()}_${logoFile.name}`)
          await uploadBytes(storageRef, logoFile)
          logoUrl = await getDownloadURL(storageRef)
        } catch (uploadError) {
          console.error("Error uploading logo:", uploadError)
          setMessage({ type: "error", text: "อัปโหลดโลโก้ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" })
          setLoading(false)
          return
        }
      }

      // Create shop in Firestore
      const shopData: {
        shopName: string;
        description: string;
        logoUrl?: string;
        contactEmail?: string;
        contactPhone?: string;
      } = {
        shopName: shopName.trim(),
        description: description.trim()
      };

      // Only add optional fields if they have values
      if (logoUrl) shopData.logoUrl = logoUrl;
      if (contactEmail.trim()) shopData.contactEmail = contactEmail.trim();
      if (contactPhone.trim()) shopData.contactPhone = contactPhone.trim();

      await createShop(userId, shopData)

      // Update user profile to seller role (only if not already admin)
      const currentProfile = await getUserProfile(userId)
      if (currentProfile?.role !== 'admin') {
        await updateUserProfile(userId, {
          role: 'seller',
          isSeller: true
        })
      }

      setMessage({ type: "success", text: "สร้างร้านค้าสำเร็จ! กำลังเข้าสู่แดชบอร์ด..." })
      
      setTimeout(() => {
        onShopCreated()
      }, 1500)
    } catch (error) {
      console.error("Error creating shop:", error)
      setMessage({ type: "error", text: "เกิดข้อผิดพลาดในการสร้างร้านค้า กรุณาลองใหม่อีกครั้ง" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-[#ff9800] to-[#f57c00] rounded-full flex items-center justify-center mx-auto mb-4">
            <Store className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-[#292d32] mb-2">สร้างร้านค้าของคุณ</h1>
          <p className="text-gray-600 text-lg">กรอกข้อมูลร้านค้าเพื่อเริ่มต้นขายสินค้า</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          {/* Message */}
          {message && (
            <div
              className={`p-4 rounded-xl flex items-start gap-3 ${
                message.type === "success"
                  ? "bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border border-green-200"
                  : "bg-gradient-to-r from-red-50 to-pink-50 text-red-800 border border-red-200"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              )}
              <span className="font-medium">{message.text}</span>
            </div>
          )}

          {/* Shop Logo */}
          <div>
            <label className="block text-sm font-semibold text-[#292d32] mb-3">
              โลโก้ร้านค้า (ไม่บังคับ)
            </label>
            <div className="flex items-center gap-4">
              {logoPreview && (
                <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200">
                  <img src={logoPreview} alt="Shop logo preview" className="w-full h-full object-cover" />
                </div>
              )}
              <label className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {logoPreview ? "เปลี่ยนโลโก้" : "เลือกโลโก้"}
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoSelect}
                  className="hidden"
                  disabled={loading}
                />
              </label>
              {logoPreview && (
                <p className="text-xs text-gray-500">
                  รูปจะถูกอัปโหลดเมื่อกดสร้างร้านค้า
                </p>
              )}
            </div>
          </div>

          {/* Shop Name */}
          <div>
            <label className="block text-sm font-semibold text-[#292d32] mb-2">
              ชื่อร้านค้า <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="กรอกชื่อร้านค้า"
              className="border-2 focus:border-[#ff9800]"
              disabled={loading}
              maxLength={50}
            />
            <p className="text-xs text-gray-500 mt-1">{shopName.length}/50 ตัวอักษร</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-[#292d32] mb-2">
              คำอธิบายร้านค้า <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="บอกเล่าเกี่ยวกับร้านค้าของคุณ สินค้าที่ขาย และจุดเด่นของร้าน"
              className="border-2 focus:border-[#ff9800] min-h-[120px]"
              disabled={loading}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">{description.length}/500 ตัวอักษร</p>
          </div>

          {/* Contact Email */}
          <div>
            <label className="block text-sm font-semibold text-[#292d32] mb-2">
              อีเมลติดต่อ (ไม่บังคับ)
            </label>
            <Input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="shop@example.com"
              className="border-2 focus:border-[#ff9800]"
              disabled={loading}
            />
          </div>

          {/* Contact Phone */}
          <div>
            <label className="block text-sm font-semibold text-[#292d32] mb-2">
              เบอร์โทรติดต่อ (ไม่บังคับ)
            </label>
            <Input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="08X-XXX-XXXX"
              className="border-2 focus:border-[#ff9800]"
              disabled={loading}
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-[#ff9800] to-[#f57c00] hover:from-[#e08800] hover:to-[#d56600] text-white font-bold py-6 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  กำลังสร้างร้านค้า...
                </div>
              ) : (
                "สร้างร้านค้า"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
