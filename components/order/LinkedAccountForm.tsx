"use client"

import { useState } from "react"
import { FullAccessAccountInfo } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { AlertCircle, Send, Eye, EyeOff } from "lucide-react"

interface FullAccessFormProps {
  orderId: string
  onSubmit: (info: FullAccessAccountInfo) => Promise<void>
  initialData?: FullAccessAccountInfo
  disabled?: boolean
}

export function FullAccessForm({ onSubmit, initialData, disabled }: FullAccessFormProps) {
  const [formData, setFormData] = useState<Partial<FullAccessAccountInfo>>(initialData || {})
  const [submitting, setSubmitting] = useState(false)
  const [showPasswords, setShowPasswords] = useState({
    game: false,
    email: false
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.gameUsername || !formData.gamePassword || !formData.linkedEmail || !formData.linkedEmailPassword) {
      alert('กรุณากรอกข้อมูลที่จำเป็นทั้งหมด')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(formData as FullAccessAccountInfo)
    } catch (error) {
      console.error('Error submitting:', error)
      alert('เกิดข้อผิดพลาดในการส่งข้อมูล')
    } finally {
      setSubmitting(false)
    }
  }

  const isFormValid = formData.gameUsername && formData.gamePassword && 
                      formData.linkedEmail && formData.linkedEmailPassword

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* คำแนะนำ */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">กรุณากรอกข้อมูลครบถ้วนและตรวจสอบความถูกต้อง</p>
              <p className="text-blue-700">
                ข้อมูลเหล่านี้จะถูกส่งให้ผู้ซื้อเพื่อเข้าถึงบัญชีและเปลี่ยนแปลงข้อมูลความปลอดภัย
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game Account Info */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            <div className="w-2 h-2 bg-[#ff9800] rounded-full"></div>
            ข้อมูลบัญชีเกม
          </h4>

          {/* Username/Email */}
          <div className="space-y-2">
            <Label htmlFor="gameUsername">
              Username/Email สำหรับล็อกอินเกม <span className="text-red-500">*</span>
            </Label>
            <Input
              id="gameUsername"
              type="text"
              placeholder="เช่น playeruser123 หรือ player@email.com"
              value={formData.gameUsername || ''}
              onChange={(e) => setFormData({ ...formData, gameUsername: e.target.value })}
              disabled={disabled || submitting}
              required
            />
          </div>

          {/* Game Password */}
          <div className="space-y-2">
            <Label htmlFor="gamePassword">
              Password สำหรับล็อกอินเกม <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="gamePassword"
                type={showPasswords.game ? "text" : "password"}
                placeholder="รหัสผ่านเกม"
                value={formData.gamePassword || ''}
                onChange={(e) => setFormData({ ...formData, gamePassword: e.target.value })}
                disabled={disabled || submitting}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, game: !showPasswords.game })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPasswords.game ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Linked Email Info */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            <div className="w-2 h-2 bg-[#ff9800] rounded-full"></div>
            ข้อมูลอีเมลที่ผูกกับบัญชี
          </h4>

          {/* Linked Email */}
          <div className="space-y-2">
            <Label htmlFor="linkedEmail">
              Email ที่ผูกกับไอดีเกม <span className="text-red-500">*</span>
            </Label>
            <Input
              id="linkedEmail"
              type="email"
              placeholder="linked@email.com"
              value={formData.linkedEmail || ''}
              onChange={(e) => setFormData({ ...formData, linkedEmail: e.target.value })}
              disabled={disabled || submitting}
              required
            />
          </div>

          {/* Email Password */}
          <div className="space-y-2">
            <Label htmlFor="linkedEmailPassword">
              Password ของ Email ที่ผูก <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="linkedEmailPassword"
                type={showPasswords.email ? "text" : "password"}
                placeholder="รหัสผ่านอีเมล"
                value={formData.linkedEmailPassword || ''}
                onChange={(e) => setFormData({ ...formData, linkedEmailPassword: e.target.value })}
                disabled={disabled || submitting}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, email: !showPasswords.email })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPasswords.email ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optional Info */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            ข้อมูลเพิ่มเติม (ถ้ามี)
          </h4>

          {/* Backup Codes */}
          <div className="space-y-2">
            <Label htmlFor="backupCodes">
              Backup Codes 2FA
            </Label>
            <Textarea
              id="backupCodes"
              placeholder="กรอก Backup Codes ถ้ามีการเปิดใช้งาน 2FA (แต่ละโค้ดขึ้นบรรทัดใหม่)"
              rows={4}
              value={formData.backupCodes || ''}
              onChange={(e) => setFormData({ ...formData, backupCodes: e.target.value })}
              disabled={disabled || submitting}
            />
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="additionalNotes">
              หมายเหตุเพิ่มเติม
            </Label>
            <Textarea
              id="additionalNotes"
              placeholder="เช่น คำแนะนำเพิ่มเติม หรือข้อมูลสำคัญอื่นๆ"
              rows={3}
              value={formData.additionalNotes || ''}
              onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
              disabled={disabled || submitting}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={!isFormValid || disabled || submitting}
          className="bg-[#ff9800] hover:bg-[#ff9800]/90 text-white"
        >
          {submitting ? (
            <>กำลังส่งข้อมูล...</>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              ส่งมอบข้อมูลให้ผู้ซื้อ
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
