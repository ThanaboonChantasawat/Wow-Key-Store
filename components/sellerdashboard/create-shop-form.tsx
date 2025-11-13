"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Store, Upload, AlertCircle, CheckCircle2 } from "lucide-react"
import { type Shop, createShop } from "@/lib/shop-client"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { storage } from "@/components/firebase-config"
import { useAuth } from "@/components/auth-context"
import { canProceedWithTransaction } from "@/lib/email-verification"
import { EmailVerificationWarning } from "@/components/email-verification-warning"

interface CreateShopFormProps {
  userId: string
  onShopCreated: () => void
  existingShop?: Shop | null
}

export function CreateShopForm({ userId, onShopCreated, existingShop }: CreateShopFormProps) {
  const { user } = useAuth()
  const [shopName, setShopName] = useState("")
  const [description, setDescription] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [facebookUrl, setFacebookUrl] = useState("")
  const [lineId, setLineId] = useState("")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Load existing shop data if editing
  useEffect(() => {
    if (existingShop) {
      setShopName(existingShop.shopName)
      setDescription(existingShop.description)
      setContactEmail(existingShop.contactEmail || "")
      setContactPhone(existingShop.contactPhone || "")
      setFacebookUrl(existingShop.facebookUrl || "")
      setLineId(existingShop.lineId || "")
      if (existingShop.logoUrl) {
        setLogoPreview(existingShop.logoUrl)
      }
    }
  }, [existingShop])

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

    // Check email verification before creating shop
    const verification = canProceedWithTransaction(user)
    if (!verification.canProceed) {
      setMessage({ type: "error", text: verification.message })
      window.scrollTo({ top: 0, behavior: 'smooth' })
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

    // Validate phone format (Thai phone number: 10 digits starting with 0)
    const phoneRegex = /^0[0-9]{9}$/
    const cleanPhone = contactPhone.trim().replace(/[-\s]/g, '')
    if (!phoneRegex.test(cleanPhone)) {
      setMessage({ type: "error", text: "เบอร์โทรต้องเป็นเลข 10 หลัก เริ่มต้นด้วย 0" })
      return
    }

    // Validate Facebook URL is required
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
      setLoading(true)
      setMessage(null)

      let logoUrl: string | undefined = undefined

      // Upload logo only if file is selected
      if (logoFile) {
        try {
          console.log('🔄 Starting upload with Client SDK...');
          
          // Use Firebase Client SDK for upload (no CORS issues, no server bucket needed)
          const storageRef = ref(storage, `shop-logos/${userId}/${Date.now()}_${logoFile.name}`);
          
          console.log('📤 Uploading to:', storageRef.fullPath);
          
          await uploadBytes(storageRef, logoFile);
          logoUrl = await getDownloadURL(storageRef);
          
          console.log('✅ Upload successful! URL:', logoUrl);
        } catch (uploadError: any) {
          console.error("❌ Error uploading logo:", uploadError);
          console.error("Error details:", uploadError.message);
          
          setMessage({ 
            type: "error", 
            text: `อัปโหลดโลโก้ไม่สำเร็จ: ${uploadError.message || 'กรุณาลองใหม่อีกครั้ง'}` 
          });
          setLoading(false);
          return;
        }
      } else if (existingShop?.logoUrl) {
        // Keep existing logo if no new file selected
        logoUrl = existingShop.logoUrl
      }

      // Create shop in Firestore
      const shopData: {
        shopName: string;
        description: string;
        logoUrl?: string;
        contactEmail: string;
        contactPhone: string;
        facebookUrl: string;
      } = {
        shopName: shopName.trim(),
        description: description.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        facebookUrl: facebookUrl.trim()
      };

      // Only add logo if it exists
      if (logoUrl) shopData.logoUrl = logoUrl;

      // Call API to create shop
      await createShop(userId, shopData);

      // Note: User role will be updated to 'seller' only after admin approves the shop
      // This prevents users from accessing seller features before approval

      const successMessage = existingShop 
        ? "ส่งคำขอแก้ไขร้านค้าสำเร็จ! รอ Admin ตรวจสอบและอนุมัติภายใน 24-48 ชั่วโมง"
        : "ส่งคำขอสร้างร้านค้าสำเร็จ! รอ Admin ตรวจสอบและอนุมัติภายใน 24-48 ชั่วโมง"
      
      setMessage({ type: "success", text: successMessage })
      
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
    <div className="flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-[#ff9800] to-[#f57c00] rounded-full flex items-center justify-center mx-auto mb-4">
            <Store className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-[#292d32] mb-2">
            {existingShop ? "แก้ไขข้อมูลร้านค้า" : "สร้างร้านค้าของคุณ"}
          </h1>
          <p className="text-gray-600 text-lg">
            {existingShop ? "แก้ไขข้อมูลร้านค้าตามที่ Admin แจ้ง" : "กรอกข้อมูลร้านค้าเพื่อเริ่มต้นขายสินค้า"}
          </p>
        </div>

        {/* Email Verification Warning */}
        {!existingShop && (
          <div className="mb-6">
            <EmailVerificationWarning action="create-shop" />
          </div>
        )}

  {/* Form */}
  <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 space-y-6">
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Logo preview and upload */}
            <div className="col-span-1 flex flex-col items-center">
              <label className="block text-sm font-semibold text-[#292d32] mb-3">โลโก้ร้านค้า</label>
              <div className="w-36 h-36 rounded-xl overflow-hidden border-2 border-gray-200 mb-3 bg-white flex items-center justify-center">
                {logoPreview ? (
                  // keep simple <img> here since preview may be data URL
                  <img src={logoPreview} alt="Shop logo preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-gray-400">
                    <Store className="w-10 h-10 mx-auto mb-1" />
                    <div className="text-xs">ไม่มีรูป</div>
                  </div>
                )}
              </div>
              <label className="w-full">
                <div className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm font-medium">{logoPreview ? "เปลี่ยนโลโก้" : "อัปโหลดโลโก้"}</span>
                </div>
                <input type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" disabled={loading} />
              </label>
              <p className="text-xs text-gray-500 mt-2 text-center">ขนาดแนะนำ: 500x500px (PNG/ JPG) • ไม่เกิน 5MB</p>
            </div>

            {/* Right: Form fields */}
            <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-[#292d32] mb-2">ชื่อร้านค้า <span className="text-red-500">*</span></label>
                <Input type="text" value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="กรอกชื่อร้านค้า" className="border-2 focus:border-[#ff9800]" disabled={loading} maxLength={50} />
                <p className="text-xs text-gray-500 mt-1">{shopName.length}/50 ตัวอักษร</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-[#292d32] mb-2">คำอธิบายร้านค้า <span className="text-red-500">*</span></label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="บอกเกี่ยวกับร้านค้าของคุณ เกมที่ขาย และจุดเด่นของร้าน" className="border-2 focus:border-[#ff9800] min-h-[120px]" disabled={loading} maxLength={500} />
                <p className="text-xs text-gray-500 mt-1">{description.length}/500 ตัวอักษร</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#292d32] mb-2">อีเมลติดต่อ <span className="text-red-500">*</span></label>
                <Input 
                  type="email" 
                  value={contactEmail} 
                  onChange={(e) => setContactEmail(e.target.value)} 
                  placeholder="shop@example.com" 
                  className="border-2 focus:border-[#ff9800]" 
                  disabled={loading} 
                  required 
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#292d32] mb-2">เบอร์โทรติดต่อ <span className="text-red-500">*</span></label>
                <Input 
                  type="tel" 
                  value={contactPhone} 
                  onChange={(e) => setContactPhone(e.target.value)} 
                  placeholder="08X-XXX-XXXX" 
                  className="border-2 focus:border-[#ff9800]" 
                  disabled={loading} 
                  required 
                />
                <p className="text-xs text-gray-500 mt-1">ตัวอย่าง: 081-234-5678</p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-[#292d32] mb-2">Facebook URL <span className="text-red-500">*</span></label>
                <Input 
                  type="url" 
                  value={facebookUrl} 
                  onChange={(e) => setFacebookUrl(e.target.value)} 
                  placeholder="https://facebook.com/yourshop" 
                  className="border-2 focus:border-[#ff9800]" 
                  disabled={loading}
                  required 
                />
                <p className="text-xs text-gray-500 mt-1">สำหรับยืนยันตัวตน</p>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">ข้อมูลสำคัญ:</p>
                <p>• ร้านค้าของคุณจะถูกส่งไปตรวจสอบโดย Admin ก่อนเปิดใช้งาน</p>
                <p>• จำเป็นต้องกรอกข้อมูลติดต่อและ Facebook URL ครบถ้วนเพื่อการยืนยันตัวตน</p>
                <p>• Admin จะตรวจสอบและอนุมัติภายใน 24-48 ชั่วโมง</p>
              </div>
            </div>
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
                  {existingShop ? "กำลังบันทึก..." : "กำลังสร้างร้านค้า..."}
                </div>
              ) : (
                existingShop ? "บันทึกและส่งตรวจสอบใหม่" : "สร้างร้านค้า"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
