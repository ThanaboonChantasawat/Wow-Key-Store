"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { getShopByOwnerId, type Shop } from "@/lib/shop-service"
import { updateDoc, doc } from "firebase/firestore"
import { db } from "@/components/firebase-config"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { storage } from "@/components/firebase-config"
import { Store, Upload, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { LoadingScreen } from "@/components/ui/loading"

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
      console.log('Old logo deleted successfully:', filePath);
    }
  } catch (error) {
    console.error('Error deleting old logo:', error);
  }
};

interface SellerStoreSettingsProps {
  userId: string
}

export function SellerStoreSettings({ userId }: SellerStoreSettingsProps) {
  const [shop, setShop] = useState<Shop | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  // Form states
  const [shopName, setShopName] = useState("")
  const [description, setDescription] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [facebookUrl, setFacebookUrl] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    loadShop()
  }, [userId])

  const loadShop = async () => {
    try {
      setLoading(true)
      const shopData = await getShopByOwnerId(userId)
      
      if (shopData) {
        setShop(shopData)
        setShopName(shopData.shopName)
        setDescription(shopData.description)
        setContactEmail(shopData.contactEmail || "")
        setContactPhone(shopData.contactPhone || "")
        setFacebookUrl(shopData.facebookUrl || "")
        setLogoUrl(shopData.logoUrl || "")
      }
    } catch (error) {
      console.error("Error loading shop:", error)
      setMessage({ type: "error", text: "ไม่สามารถโหลดข้อมูลร้านค้าได้" })
    } finally {
      setLoading(false)
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setMessage({ type: "error", text: "กรุณาเลือกไฟล์รูปภาพเท่านั้น" })
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: "error", text: "ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB" })
        return
      }

      setLogoFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      setMessage(null)
    }
  }

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !shop) return null

    try {
      setUploading(true)
      
      // Delete old logo if exists
      if (shop.logoUrl) {
        await deleteImageFromStorage(shop.logoUrl);
      }
      
      const storageRef = ref(storage, `shop-logos/${shop.shopId}/${Date.now()}_${logoFile.name}`)
      await uploadBytes(storageRef, logoFile)
      const url = await getDownloadURL(storageRef)
      return url
    } catch (error) {
      console.error("Error uploading logo:", error)
      throw error
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!shop) {
      setMessage({ type: "error", text: "ไม่พบข้อมูลร้านค้า" })
      return
    }

    // Validation
    if (!shopName.trim()) {
      setMessage({ type: "error", text: "กรุณากรอกชื่อร้านค้า" })
      return
    }

    if (!description.trim()) {
      setMessage({ type: "error", text: "กรุณากรอกคำอธิบายร้านค้า" })
      return
    }

    if (!contactEmail.trim()) {
      setMessage({ type: "error", text: "กรุณากรอกอีเมลติดต่อ" })
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(contactEmail.trim())) {
      setMessage({ type: "error", text: "รูปแบบอีเมลไม่ถูกต้อง" })
      return
    }

    if (!contactPhone.trim()) {
      setMessage({ type: "error", text: "กรุณากรอกเบอร์โทรติดต่อ" })
      return
    }

    // Validate phone format
    const phoneRegex = /^0[0-9]{9}$/
    const cleanPhone = contactPhone.trim().replace(/[-\s]/g, '')
    if (!phoneRegex.test(cleanPhone)) {
      setMessage({ type: "error", text: "เบอร์โทรต้องเป็นเลข 10 หลัก เริ่มต้นด้วย 0" })
      return
    }

    if (!facebookUrl.trim()) {
      setMessage({ type: "error", text: "กรุณากรอก Facebook URL" })
      return
    }

    // Validate Facebook URL format
    const fbRegex = /^(https?:\/\/)?(www\.)?(facebook|fb)\.com\/.+/i
    if (!fbRegex.test(facebookUrl.trim())) {
      setMessage({ type: "error", text: "รูปแบบ Facebook URL ไม่ถูกต้อง" })
      return
    }

    try {
      setSaving(true)
      setMessage(null)

      let newLogoUrl = logoUrl

      // Upload new logo if selected
      if (logoFile) {
        const uploadedUrl = await uploadLogo()
        if (uploadedUrl) {
          newLogoUrl = uploadedUrl
        }
      }

      // Update shop data
      const shopRef = doc(db, "shops", shop.shopId)
      await updateDoc(shopRef, {
        shopName: shopName.trim(),
        description: description.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        facebookUrl: facebookUrl.trim(),
        logoUrl: newLogoUrl,
        updatedAt: new Date()
      })

      setLogoUrl(newLogoUrl)
      setLogoFile(null)
      setLogoPreview(null)
      setMessage({ type: "success", text: "บันทึกข้อมูลร้านค้าสำเร็จ" })
      
      // Reload shop data
      await loadShop()
    } catch (error) {
      console.error("Error updating shop:", error)
      setMessage({ type: "error", text: "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <LoadingScreen text="กำลังโหลดข้อมูลร้านค้า..." />
  }

  if (!shop) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <Store className="w-16 h-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-[#292d32] mb-2">ไม่พบข้อมูลร้านค้า</h3>
          <p className="text-gray-600">กรุณาสร้างร้านค้าก่อนใช้งานฟีเจอร์นี้</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b border-[#d9d9d9]">
        <h2 className="text-2xl font-bold text-[#292d32]">ตั้งค่าร้านค้า</h2>
        <p className="text-sm text-gray-600 mt-1">แก้ไขข้อมูลและการตั้งค่าร้านค้าของคุณ</p>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`mx-6 mt-6 p-4 rounded-lg flex items-start gap-3 ${
          message.type === "success" 
            ? "bg-green-50 border border-green-200" 
            : "bg-red-50 border border-red-200"
        }`}>
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <p className={message.type === "success" ? "text-green-800" : "text-red-800"}>
            {message.text}
          </p>
        </div>
      )}

      <div className="p-6">
        <div className="bg-[#ff9800] text-white px-6 py-3 rounded-t-lg font-semibold">ข้อมูลร้านค้า</div>
        <div className="border border-[#d9d9d9] rounded-b-lg p-6">
          <div className="flex gap-8">
            <div className="flex-shrink-0">
              <div className="text-sm font-medium text-[#292d32] mb-3">โลโก้ร้านค้า</div>
              <div className="w-32 h-32 bg-white border-2 border-[#d9d9d9] rounded-lg flex items-center justify-center overflow-hidden">
                {logoPreview || logoUrl ? (
                  <img 
                    src={logoPreview || logoUrl} 
                    alt="Store Logo" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <Store className="w-12 h-12 text-gray-400" />
                )}
              </div>
              <label htmlFor="logo-upload" className="mt-3 block">
                <div className="cursor-pointer bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg px-4 py-2 text-sm text-center transition-colors">
                  <Upload className="w-4 h-4 inline mr-2" />
                  เปลี่ยนโลโก้
                </div>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                  disabled={saving || uploading}
                />
              </label>
              <p className="text-xs text-gray-500 mt-2">
                รองรับ JPG, PNG<br />
                ขนาดไม่เกิน 5MB
              </p>
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#292d32] mb-2">
                  ชื่อร้านค้า <span className="text-red-500">*</span>
                </label>
                <Input 
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="max-w-md border-2 focus:border-[#ff9800]"
                  disabled={saving || uploading}
                  placeholder="ชื่อร้านค้าของคุณ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#292d32] mb-2">
                  คำอธิบายร้านค้า <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  className="resize-none border-2 focus:border-[#ff9800]"
                  disabled={saving || uploading}
                  placeholder="บอกเล่าเกี่ยวกับร้านค้าของคุณ..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#292d32] mb-2">
                    อีเมลติดต่อ <span className="text-red-500">*</span>
                  </label>
                  <Input 
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="border-2 focus:border-[#ff9800]"
                    disabled={saving || uploading}
                    placeholder="shop@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#292d32] mb-2">
                    เบอร์โทรติดต่อ <span className="text-red-500">*</span>
                  </label>
                  <Input 
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="border-2 focus:border-[#ff9800]"
                    disabled={saving || uploading}
                    placeholder="08X-XXX-XXXX"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#292d32] mb-2">
                  Facebook URL <span className="text-red-500">*</span>
                </label>
                <Input 
                  type="url"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  className="max-w-md border-2 focus:border-[#ff9800]"
                  disabled={saving || uploading}
                  placeholder="https://facebook.com/yourshop"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 flex justify-end gap-3 border-t border-gray-200">
        <Button 
          onClick={handleSave}
          disabled={saving || uploading}
          className="bg-[#ff9800] hover:bg-[#e08800] text-white px-8"
        >
          {saving || uploading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {uploading ? "กำลังอัปโหลดรูปภาพ..." : "กำลังบันทึก..."}
            </div>
          ) : (
            "บันทึกการเปลี่ยนแปลง"
          )}
        </Button>
      </div>
    </div>
  )
}
