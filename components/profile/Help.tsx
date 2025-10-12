"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

const faqItems = [
  { id: 1, question: "Wowkey store คืออะไร?" },
  { id: 2, question: "การชื้อสินค้าจาก Wowkeystore.com ปลอดภัยหรือไม่?" },
  { id: 3, question: "ส่งรหัสแบบจาก Wowkeystore อย่างไร?" },
  { id: 4, question: "จะใช้งานเกมที่ใช้รหัสเติมจะได้รับอะไร?" },
]

export function HelpContent() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-8">
        <h2 className="text-2xl font-semibold text-[#292d32] mb-6">ช่วยเหลือ</h2>

        {/* FAQ Section */}
        <div className="space-y-3 mb-8">
          {faqItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setOpenFaq(openFaq === item.id ? null : item.id)}
              className="w-full bg-[#ff9800] hover:bg-[#ff9800]/90 text-white px-6 py-4 rounded-full flex items-center justify-between text-left"
            >
              <span>{item.question}</span>
              <Plus className="w-5 h-5 flex-shrink-0" />
            </button>
          ))}
        </div>

        {/* Contact Section */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-[#292d32]">ต้องการติดต่อเราหรือไม่?</h3>
          <p className="text-[#292d32]">หากยังต้องการความช่วยเหลือ สามารถติดต่อไปยังตัวแทนเพื่อส่งคำถามหรือติดกับทีมงานได้เลยครับ/ค่ะ</p>
          <Button className="bg-[#ff9800] hover:bg-[#ff9800]/90 text-white px-8 py-2 rounded-full">ติดต่อทีมงาน</Button>
        </div>
      </div>
    </div>
  )
}
