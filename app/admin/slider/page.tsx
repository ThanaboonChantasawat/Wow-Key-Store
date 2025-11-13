import { SliderManagement } from '@/components/admindashboard/slider-management'

export default function AdminSliderPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#292d32]">🖼️ จัดการรูป Slider</h1>
        <p className="text-gray-600 mt-2">อัปโหลดและจัดการรูปภาพสำหรับ Slider หน้าแรก</p>
      </div>
      
      <SliderManagement />
    </div>
  )
}
