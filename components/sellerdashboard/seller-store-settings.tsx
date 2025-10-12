"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export function SellerStoreSettings() {
  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b border-[#d9d9d9]">
        <h2 className="text-2xl font-bold text-[#292d32]">ตั้งค่าร้านค้า</h2>
      </div>

      <div className="p-6">
        <div className="bg-[#ff9800] text-white px-6 py-3 rounded-t-lg font-semibold">ข้อมูลร้านค้า</div>
        <div className="border border-[#d9d9d9] rounded-b-lg p-6">
          <div className="flex gap-8">
            <div className="flex-shrink-0">
              <div className="text-sm font-medium text-[#292d32] mb-3">ภาพโปรไฟล์ร้านค้า</div>
              <div className="w-32 h-32 bg-white border-2 border-[#d9d9d9] rounded-lg flex items-center justify-center">
                <img src="/game-store-icon.jpg" alt="Store Logo" className="w-24 h-24 object-contain" />
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#292d32] mb-2">ชื่อร้านค้า</label>
                <Input defaultValue="ID Hunter Shop" className="max-w-md" />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#292d32] mb-2">ข้อมูลร้านค้า</label>
                <Textarea
                  defaultValue="ร้าน ID Hunter Shop แหล่งรวมไอดีเกมทุก ๆ รายการธรรม ชื่อมาจากเรา ปลอดภัย 100% มีทุกเกมเชื่อ ตั้งแต่ RoV ขึ้น Genshin พร้อมบริการส่งทารายแบบเพื่อนพี่น้องเราคัดไว้ที่นี่ มีครบทุกเกมพร้อมรับมือ ดีเควลา เทพทุกเดร์ราคาไม่แพงใจ ทีมงานรักษาพร้อ ไม่มีด นีเดกอล!"
                  rows={6}
                  className="resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 flex justify-end">
        <Button className="bg-[#ff9800] hover:bg-[#ff9800]/90 text-white px-8">บันทึก</Button>
      </div>
    </div>
  )
}
