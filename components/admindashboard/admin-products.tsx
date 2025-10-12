"use client"

import { useState } from "react"
import { Package, MoreVertical } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = 1

  // Mock data - ในอนาคตจะดึงจาก Firestore
  const products: Product[] = []

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[#292d32]">จัดการสินค้า</h2>
        </div>
        <div className="w-64">
          <Input 
            type="search" 
            placeholder="ค้นหาสินค้า..." 
            className="w-full border-2 focus:border-[#ff9800]"
          />
        </div>
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

      <div className="p-6 flex items-center justify-between border-t border-gray-200">
        <div className="text-sm text-[#292d32]">หน้า {currentPage} จาก {totalPages}</div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="border-2"
          >
            ←
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="bg-[#ff9800] text-white border-2 border-[#ff9800] hover:bg-[#e08800]"
          >
            {currentPage}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="border-2"
          >
            →
          </Button>
        </div>
      </div>
    </div>
  )
}
