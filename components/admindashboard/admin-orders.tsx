"use client"

import { useState } from "react"
import { ShoppingCart, MoreVertical, Search, CheckCircle, Clock, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

interface Order {
  id: string;
  orderNumber: string;
  buyer: string;
  product: string;
  total: number;
  date: string;
  status: string;
}

export function AdminOrders() {
  const [currentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const totalPages = 1

  // Mock data - ในอนาคตจะดึงจาก Firestore
  const orders: Order[] = []

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">✓ เสร็จสิ้น</span>
      case "pending":
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">⏳ รอดำเนินการ</span>
      case "cancelled":
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">✕ ยกเลิก</span>
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">-</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header - Orange Gradient */}
      <div className="bg-gradient-to-r from-orange-500 via-[#ff9800] to-red-500 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
        <div className="relative z-10">
          <h2 className="text-4xl font-bold mb-2 drop-shadow-lg flex items-center gap-3">
            <ShoppingCart className="w-10 h-10" />
            จัดการคำสั่งซื้อ
          </h2>
          <p className="text-white/90 text-lg">ตรวจสอบและจัดการคำสั่งซื้อในระบบ</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input 
          type="search" 
          placeholder="ค้นหาคำสั่งซื้อ..." 
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
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${statusFilter === 'all' ? 'text-orange-900' : 'text-gray-900'}`}>{orders.length}</div>
              <div className={`text-xs sm:text-sm font-medium truncate ${statusFilter === 'all' ? 'text-orange-700' : 'text-gray-500'}`}>ทั้งหมด</div>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${statusFilter === 'completed' ? 'bg-green-50 border-green-500 ring-2 ring-green-500 ring-offset-2' : 'bg-white border-transparent hover:border-green-200'}`}
          onClick={() => setStatusFilter('completed')}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${statusFilter === 'completed' ? 'bg-gradient-to-br from-green-500 to-green-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${statusFilter === 'completed' ? 'text-green-900' : 'text-gray-900'}`}>{orders.filter(o => o.status === 'completed').length}</div>
              <div className={`text-xs sm:text-sm font-medium truncate ${statusFilter === 'completed' ? 'text-green-700' : 'text-gray-500'}`}>สำเร็จ</div>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${statusFilter === 'pending' ? 'bg-yellow-50 border-yellow-500 ring-2 ring-yellow-500 ring-offset-2' : 'bg-white border-transparent hover:border-yellow-200'}`}
          onClick={() => setStatusFilter('pending')}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${statusFilter === 'pending' ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${statusFilter === 'pending' ? 'text-yellow-900' : 'text-gray-900'}`}>{orders.filter(o => o.status === 'pending').length}</div>
              <div className={`text-xs sm:text-sm font-medium truncate ${statusFilter === 'pending' ? 'text-yellow-700' : 'text-gray-500'}`}>รอดำเนินการ</div>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${statusFilter === 'cancelled' ? 'bg-red-50 border-red-500 ring-2 ring-red-500 ring-offset-2' : 'bg-white border-transparent hover:border-red-200'}`}
          onClick={() => setStatusFilter('cancelled')}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${statusFilter === 'cancelled' ? 'bg-gradient-to-br from-red-500 to-red-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <XCircle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${statusFilter === 'cancelled' ? 'text-red-900' : 'text-gray-900'}`}>{orders.filter(o => o.status === 'cancelled').length}</div>
              <div className={`text-xs sm:text-sm font-medium truncate ${statusFilter === 'cancelled' ? 'text-red-700' : 'text-gray-500'}`}>ยกเลิก</div>
            </div>
          </div>
        </Card>
      </div>



      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#ff9800]" />
            รายการคำสั่งซื้อ
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-100 to-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-left font-bold text-[#292d32]">เลขคำสั่งซื้อ</th>
                <th className="px-6 py-4 text-left font-bold text-[#292d32]">ผู้ซื้อ</th>
                <th className="px-6 py-4 text-left font-bold text-[#292d32]">สินค้า</th>
                <th className="px-6 py-4 text-center font-bold text-[#292d32]">ยอดรวม</th>
                <th className="px-6 py-4 text-center font-bold text-[#292d32]">วันที่</th>
                <th className="px-6 py-4 text-center font-bold text-[#292d32]">สถานะ</th>
                <th className="px-6 py-4 text-center font-bold text-[#292d32]">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-medium text-[#292d32]">{order.orderNumber}</td>
                  <td className="px-6 py-4 text-[#292d32]">{order.buyer}</td>
                  <td className="px-6 py-4 text-[#292d32]">{order.product}</td>
                  <td className="px-6 py-4 text-center font-bold text-[#ff9800]">฿{order.total}</td>
                  <td className="px-6 py-4 text-center text-[#292d32]">{order.date}</td>
                  <td className="px-6 py-4 text-center">{getStatusBadge(order.status)}</td>
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

        {orders.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p>ยังไม่มีคำสั่งซื้อในระบบ</p>
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
