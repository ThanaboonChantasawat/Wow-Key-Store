"use client"

import { useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"

export function SellerProducts() {
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = 5

  const products = [
    { id: 1, name: "RoV (Arena of Valor)", price: 200, stock: "-", image: "/rov-game.jpg" },
    { id: 2, name: "RoV (Arena of Valor)", price: 200, stock: "-", image: "/rov-game.jpg" },
    { id: 3, name: "RoV (Arena of Valor)", price: 200, stock: "-", image: "/rov-game.jpg" },
    { id: 4, name: "RoV (Arena of Valor)", price: 200, stock: "-", image: "/rov-game.jpg" },
    { id: 5, name: "Valorant", price: 200, stock: "-", image: "/valorant-game.jpg" },
    { id: 6, name: "Fc Mobile", price: 200, stock: "-", image: "/fc-mobile-game.jpg" },
    { id: 7, name: "Marvel Snap", price: 200, stock: "-", image: "/marvel-snap-game.jpg" },
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b border-[#d9d9d9] flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#292d32]">สินค้าของฉัน</h2>
        <div className="w-64">
          <Input type="search" placeholder="ค้นหา" className="w-full" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#ff9800] text-white">
              <th className="px-6 py-4 text-left">
                <Checkbox className="border-white" />
              </th>
              <th className="px-6 py-4 text-left font-semibold">สินค้า</th>
              <th className="px-6 py-4 text-center font-semibold">ราคาสินค้า</th>
              <th className="px-6 py-4 text-center font-semibold">คลังสินค้า</th>
              <th className="px-6 py-4 text-center font-semibold">Edit/Delete</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-[#d9d9d9] hover:bg-[#f9fafb]">
                <td className="px-6 py-4">
                  <Checkbox />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      className="w-12 h-12 rounded object-cover"
                    />
                    <span className="font-medium text-[#292d32]">{product.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center text-[#292d32]">{product.price}</td>
                <td className="px-6 py-4 text-center text-[#292d32]">{product.stock}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button className="p-2 hover:bg-[#f9fafb] rounded">
                      <Pencil className="h-4 w-4 text-[#999999]" />
                    </button>
                    <button className="p-2 hover:bg-[#f9fafb] rounded">
                      <Trash2 className="h-4 w-4 text-[#999999]" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-6 flex items-center justify-between border-t border-[#d9d9d9]">
        <div className="text-sm text-[#292d32]">หน้า 1 จาก {totalPages}</div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            ←
          </Button>
          {[1, 2, 3].map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="icon"
              onClick={() => setCurrentPage(page)}
              className={currentPage === page ? "bg-[#ff9800] hover:bg-[#ff9800]/90" : ""}
            >
              {page}
            </Button>
          ))}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            →
          </Button>
        </div>
      </div>
    </div>
  )
}
