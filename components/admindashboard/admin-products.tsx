"use client"

import { useState } from "react"
import { Package, MoreVertical, Search, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

interface Product {
  id: string;
  name: string;
  image: string;
  category: string;
  price: number;
  seller: string;
  status: string;
}

export function AdminProducts() {
  const [currentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const totalPages = 1

  // Mock data - ในอนาคตจะดึงจาก Firestore
  const products: Product[] = []

  return (
    <div className="space-y-6">
      {/* Header - Orange Gradient */}
      <div className="bg-gradient-to-r from-orange-500 via-[#ff9800] to-red-500 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
        <div className="relative z-10">
          <h2 className="text-4xl font-bold mb-2 drop-shadow-lg flex items-center gap-3">
            <Package className="w-10 h-10" />
            จัดการสินค้า
          </h2>
          <p className="text-white/90 text-lg">ตรวจสอบและจัดการสินค้าในระบบ</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input 
          type="search" 
          placeholder="ค้นหาสินค้า..." 
          className="pl-10 bg-white"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card 
          className={`p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${statusFilter === 'all' ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-500 ring-offset-2' : 'bg-white border-transparent hover:border-orange-200'}`}
          onClick={() => setStatusFilter('all')}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${statusFilter === 'all' ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <Package className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${statusFilter === 'all' ? 'text-orange-900' : 'text-gray-900'}`}>{products.length}</div>
              <div className={`text-xs sm:text-sm font-medium truncate ${statusFilter === 'all' ? 'text-orange-700' : 'text-gray-500'}`}>ทั้งหมด</div>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${statusFilter === 'active' ? 'bg-green-50 border-green-500 ring-2 ring-green-500 ring-offset-2' : 'bg-white border-transparent hover:border-green-200'}`}
          onClick={() => setStatusFilter('active')}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${statusFilter === 'active' ? 'bg-gradient-to-br from-green-500 to-green-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${statusFilter === 'active' ? 'text-green-900' : 'text-gray-900'}`}>{products.filter(p => p.status === 'active').length}</div>
              <div className={`text-xs sm:text-sm font-medium truncate ${statusFilter === 'active' ? 'text-green-700' : 'text-gray-500'}`}>ใช้งานอยู่</div>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${statusFilter === 'inactive' ? 'bg-red-50 border-red-500 ring-2 ring-red-500 ring-offset-2' : 'bg-white border-transparent hover:border-red-200'}`}
          onClick={() => setStatusFilter('inactive')}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${statusFilter === 'inactive' ? 'bg-gradient-to-br from-red-500 to-red-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <XCircle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${statusFilter === 'inactive' ? 'text-red-900' : 'text-gray-900'}`}>{products.filter(p => p.status === 'inactive').length}</div>
              <div className={`text-xs sm:text-sm font-medium truncate ${statusFilter === 'inactive' ? 'text-red-700' : 'text-gray-500'}`}>ระงับ</div>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${statusFilter === 'out_of_stock' ? 'bg-gray-50 border-gray-500 ring-2 ring-gray-500 ring-offset-2' : 'bg-white border-transparent hover:border-gray-200'}`}
          onClick={() => setStatusFilter('out_of_stock')}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${statusFilter === 'out_of_stock' ? 'bg-gradient-to-br from-gray-500 to-gray-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${statusFilter === 'out_of_stock' ? 'text-gray-900' : 'text-gray-900'}`}>{products.filter(p => p.status === 'out_of_stock').length}</div>
              <div className={`text-xs sm:text-sm font-medium truncate ${statusFilter === 'out_of_stock' ? 'text-gray-700' : 'text-gray-500'}`}>สินค้าหมด</div>
            </div>
          </div>
        </Card>
      </div>



      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-[#ff9800]" />
            รายการสินค้า
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-100 to-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-left font-bold text-[#292d32]">รูปภาพ</th>
                <th className="px-6 py-4 text-left font-bold text-[#292d32]">ชื่อสินค้า</th>
                <th className="px-6 py-4 text-center font-bold text-[#292d32]">หมวดหมู่</th>
                <th className="px-6 py-4 text-center font-bold text-[#292d32]">ราคา</th>
                <th className="px-6 py-4 text-center font-bold text-[#292d32]">ผู้ขาย</th>
                <th className="px-6 py-4 text-center font-bold text-[#292d32]">สถานะ</th>
                <th className="px-6 py-4 text-center font-bold text-[#292d32]">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="w-12 h-12 relative rounded-lg overflow-hidden">
                      <Image
                        src={product.image || "/placeholder.svg"}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-[#292d32]">{product.name}</td>
                  <td className="px-6 py-4 text-center text-[#292d32]">{product.category}</td>
                  <td className="px-6 py-4 text-center font-bold text-[#ff9800]">฿{product.price}</td>
                  <td className="px-6 py-4 text-center text-[#292d32]">{product.seller}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                      ใช้งานอยู่
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center">
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <MoreVertical className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {products.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p>ยังไม่มีสินค้าในระบบ</p>
          </div>
        )}

        <div className="p-6 flex items-center justify-between border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-[#292d32]">หน้า {currentPage} จาก {totalPages}</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>ก่อนหน้า</Button>
            <Button variant="outline" size="sm" disabled>ถัดไป</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
