"use client"

import { useState } from "react"
import { User, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function AdminUsers() {
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = 1

  // Mock data - ในอนาคตจะดึงจาก Firestore
  const users = [
    {
      id: "1",
      email: "admin@wowkeystore.com",
      displayName: "Admin",
      role: "admin",
      createdAt: "01/01/2025",
      status: "active"
    },
  ]

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-purple-600 text-white">⚡ Admin</span>
      case "seller":
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-blue-600 text-white">👤 Seller</span>
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-gray-400 to-gray-500 text-white">🎮 Buyer</span>
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[#292d32]">จัดการผู้ใช้</h2>
        </div>
        <div className="w-64">
          <Input 
            type="search" 
            placeholder="ค้นหาผู้ใช้..." 
            className="w-full border-2 focus:border-[#ff9800]"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-gray-100 to-gray-50 border-b border-gray-200">
              <th className="px-6 py-4 text-left font-bold text-[#292d32]">อีเมล</th>
              <th className="px-6 py-4 text-left font-bold text-[#292d32]">ชื่อผู้ใช้</th>
              <th className="px-6 py-4 text-center font-bold text-[#292d32]">บทบาท</th>
              <th className="px-6 py-4 text-center font-bold text-[#292d32]">สมัครเมื่อ</th>
              <th className="px-6 py-4 text-center font-bold text-[#292d32]">สถานะ</th>
              <th className="px-6 py-4 text-center font-bold text-[#292d32]">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-[#292d32]">{user.email}</td>
                <td className="px-6 py-4 text-[#292d32]">{user.displayName}</td>
                <td className="px-6 py-4 text-center">{getRoleBadge(user.role)}</td>
                <td className="px-6 py-4 text-center text-[#292d32]">{user.createdAt}</td>
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

      {users.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p>ยังไม่มีข้อมูลผู้ใช้</p>
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
