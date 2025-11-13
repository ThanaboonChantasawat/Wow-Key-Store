"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-context"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Bell, Mail, Shield, ShoppingBag, Store } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface NotificationPreferences {
  inApp: boolean
  orderUpdates: boolean
  shopUpdates: boolean
  paymentUpdates: boolean
}

export default function NotificationSettingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    inApp: true,
    orderUpdates: true,
    shopUpdates: true,
    paymentUpdates: true,
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (user) {
      loadPreferences()
    }
  }, [user])

  const loadPreferences = async () => {
    // TODO: Load from Firestore
    // For now, using default values
  }

  const handleSave = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      // TODO: Save to Firestore
      // await updateNotificationPreferences(user.uid, preferences)

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error("Error saving preferences:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <Bell className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">กรุณาเข้าสู่ระบบ</h1>
          <p className="text-gray-600 mb-4">คุณต้องเข้าสู่ระบบเพื่อตั้งค่าการแจ้งเตือน</p>
          <Button
            onClick={() => router.push("/")}
            className="bg-[#ff9800] hover:bg-[#e08800] text-white"
          >
            กลับหน้าแรก
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/notifications"
            className="text-[#ff9800] hover:underline mb-4 inline-block"
          >
            ← กลับไปการแจ้งเตือน
          </Link>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            ตั้งค่าการแจ้งเตือน
          </h1>
          <p className="text-gray-600">
            จัดการการแจ้งเตือนที่คุณต้องการรับ
          </p>
        </div>

        {/* Settings Cards */}
        <div className="space-y-4">
          {/* General Settings */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="w-6 h-6 text-[#ff9800]" />
              <h2 className="text-xl font-bold text-gray-800">การแจ้งเตือนทั่วไป</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3">
                <div>
                  <h3 className="font-semibold text-gray-800">การแจ้งเตือนในแอป</h3>
                  <p className="text-sm text-gray-600">แสดงการแจ้งเตือนใน WowKeyStore</p>
                </div>
                <Switch
                  checked={preferences.inApp}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, inApp: checked })
                  }
                />
              </div>
            </div>
          </Card>

          {/* Order Updates */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <ShoppingBag className="w-6 h-6 text-[#ff9800]" />
              <h2 className="text-xl font-bold text-gray-800">คำสั่งซื้อ</h2>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">อัปเดตคำสั่งซื้อ</h3>
                <p className="text-sm text-gray-600">
                  แจ้งเตือนเมื่อสถานะคำสั่งซื้อเปลี่ยนแปลง
                </p>
              </div>
              <Switch
                checked={preferences.orderUpdates}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, orderUpdates: checked })
                }
              />
            </div>
          </Card>

          {/* Shop Updates */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Store className="w-6 h-6 text-[#ff9800]" />
              <h2 className="text-xl font-bold text-gray-800">ร้านค้า</h2>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">อัปเดตร้านค้า</h3>
                <p className="text-sm text-gray-600">
                  แจ้งเตือนเกี่ยวกับการอนุมัติร้านค้า คำสั่งซื้อใหม่ และการระงับ
                </p>
              </div>
              <Switch
                checked={preferences.shopUpdates}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, shopUpdates: checked })
                }
              />
            </div>
          </Card>

          {/* Payment Updates */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Mail className="w-6 h-6 text-[#ff9800]" />
              <h2 className="text-xl font-bold text-gray-800">การชำระเงิน</h2>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">อัปเดตการชำระเงิน</h3>
                <p className="text-sm text-gray-600">
                  แจ้งเตือนเมื่อชำระเงินสำเร็จหรือล้มเหลว
                </p>
              </div>
              <Switch
                checked={preferences.paymentUpdates}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, paymentUpdates: checked })
                }
              />
            </div>
          </Card>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex gap-4">
          <Button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-[#ff9800] hover:bg-[#e08800] text-white"
          >
            {loading ? "กำลังบันทึก..." : saved ? "✓ บันทึกแล้ว" : "บันทึกการตั้งค่า"}
          </Button>
          <Button
            onClick={() => router.push("/notifications")}
            variant="outline"
          >
            ยกเลิก
          </Button>
        </div>
      </div>
    </div>
  )
}
