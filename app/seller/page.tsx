import { Button } from "@/components/ui/button"

export default function WowKeystorePage() {
  return (
      <div className="min-h-screen flex flex-col">
        {/* Main Content */}
        <main className="flex-1 bg-gray-100 py-80">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col items-center justify-center text-center">
              {/* Illustration */}
              <div className="w-48 h-48 bg-white rounded-full flex items-center justify-center mb-8 shadow-sm">
              </div>

              {/* Heading */}
              <h2 className="text-orange-400 text-3xl font-bold mb-4">ยินดีต้อนรับผู้ขายใหม่</h2>

              {/* Description */}
              <p className="text-[#3c3c3c] text-base mb-2">เริ่มต้นขายสินค้าใน WowKeystore ได้ง่าย ๆ</p>
              <p className="text-[#3c3c3c] text-base mb-8">เพียงแค่สร้างบัญชีผู้ขายของคุณ</p>

              {/* CTA Button */}
              <Button className="bg-orange-400 hover:bg-orange-500 text-white px-8 py-6 rounded-full text-base font-medium hover:scale-105">
                สร้างร้านค้า
              </Button>
            </div>
          </div>
        </main>
      </div>
  )
}
