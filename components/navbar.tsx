import { Search, ShoppingBag, MessageCircle, Bell } from 'lucide-react'
import { Button } from "@/components/ui/button"
import Link from 'next/link'

export function Navbar() {
  return (
    <>
      {/* Header */}
      <header className="bg-[#ff9800] py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button>
          <Link href={'/'} className="text-2xl font-bold text-black">WowKeystore</Link>
          </button>

          <div className="relative flex-1 max-w-xl mx-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-transparent rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              placeholder="ค้นหา"
            />
          </div>

          <div className="flex items-center space-x-4">
            <Link href="/cart" className="p-2 rounded-full bg-white/20 hover:bg-white hover:text-[#ff9800] transition-colors duration-200">
              <ShoppingBag className="h-5 w-5" />
            </Link>
            <Link href="/notifications" className="p-2 rounded-full bg-white/20 hover:bg-white hover:text-[#ff9800] transition-colors duration-200">
              <Bell className="h-5 w-5" />
            </Link>
            <Button className="bg-[#292d32] hover:bg-[#3c3c3c] text-white rounded-md px-4 py-2">
              เข้าสู่ระบบ
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <ul className="flex space-x-8 justify-center">
            <li className="py-4">
              <a href="/products" className="text-gray-700 hover:text-[#ff9800]">
                สินค้าทั้งหมด
              </a>
            </li>
            <li className="py-4">
              <a href="#" className="text-gray-700 hover:text-[#ff9800]">
                ขายสินค้ากับเรา
              </a>
            </li>
            <li className="py-4">
              <a href="#" className="text-gray-700 hover:text-[#ff9800]">
                ไอดีเกมของฉัน
              </a>
            </li>
            <li className="py-4">
              <a href="#" className="text-gray-700 hover:text-[#ff9800]">
                ช่วยเหลือ
              </a>
            </li>
          </ul>
        </div>
      </nav>
    </>
  )
}
