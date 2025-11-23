"use client"

import { useState } from "react"
import { Search, Mail, Trash2, AlertTriangle, CheckCircle, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export function SellerIssues() {
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved'>('all')
  const totalPages = 5

  const issues = [
    {
      id: 1,
      buyer: "buyer1@example.com",
      username: "buyer1",
      issue: "สลิปใช้ตุณ",
      orderNumber: "#9824715630",
      date: "04/05/2025",
      time: "10.33 PM",
      status: "red",
      hasMessage: true,
    },
    {
      id: 2,
      buyer: "seller99@example.com",
      username: "seller99",
      issue: "ข้อมูลบนสลิปไม่ครบถ้วน",
      orderNumber: "#1824715630",
      date: "04/05/2025",
      time: "10.33 PM",
      status: "green",
      hasMessage: true,
    },
    {
      id: 3,
      buyer: "gamerx23@example.com",
      username: "gamerx23",
      issue: "ยอดเงินในสลิปไม่ตรง",
      orderNumber: "#6824715630",
      date: "04/05/2025",
      time: "10.33 PM",
      status: "red",
      hasMessage: true,
    },
    {
      id: 4,
      buyer: "noobmaster@example.com",
      username: "noobmaster",
      issue: "สลิปไม่ชัดเจน",
      orderNumber: "#6724715630",
      date: "04/05/2025",
      time: "10.33 PM",
      status: "green",
      hasMessage: false,
    },
    {
      id: 5,
      buyer: "sellergamez@example.com",
      username: "sellergamez",
      issue: "สลิปโอนไม่ปรับชื่อ",
      orderNumber: "#2824715630",
      date: "04/05/2025",
      time: "10.33 PM",
      status: "green",
      hasMessage: true,
    },
    {
      id: 6,
      buyer: "probuyer@example.com",
      username: "probuyer",
      issue: "ไม่พบยอดเงินเข้าบัญชี",
      orderNumber: "#1854715630",
      date: "04/05/2025",
      time: "10.33 PM",
      status: "red",
      hasMessage: true,
    },
    {
      id: 7,
      buyer: "supportmeplz@example.com",
      username: "supportmeplz",
      issue: "สลิปฝ่า/สลิปเก่า",
      orderNumber: "#7824715630",
      date: "04/05/2025",
      time: "10.33 PM",
      status: "red",
      hasMessage: true,
    },
  ]

  // Calculate stats
  const pendingCount = issues.filter(i => i.status === 'red').length
  const resolvedCount = issues.filter(i => i.status === 'green').length

  // Filter issues
  const filteredIssues = issues.filter(issue => {
    if (statusFilter === 'all') return true
    if (statusFilter === 'pending') return issue.status === 'red'
    if (statusFilter === 'resolved') return issue.status === 'green'
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header - Orange Gradient */}
      <div className="bg-gradient-to-r from-orange-500 via-[#ff9800] to-red-500 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
        <div className="relative z-10">
          <h2 className="text-4xl font-bold mb-2 drop-shadow-lg flex items-center gap-3">
            <MessageSquare className="w-10 h-10" />
            การแจ้งปัญหา
          </h2>
          <p className="text-white/90 text-lg">
            จัดการปัญหาและข้อร้องเรียนจากลูกค้า
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <Card 
          className={`p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${statusFilter === 'all' ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-500 ring-offset-2' : 'bg-white border-transparent hover:border-orange-200'}`}
          onClick={() => setStatusFilter('all')}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${statusFilter === 'all' ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${statusFilter === 'all' ? 'text-orange-900' : 'text-gray-900'}`}>{issues.length}</div>
              <div className={`text-xs sm:text-sm font-medium truncate ${statusFilter === 'all' ? 'text-orange-700' : 'text-gray-500'}`}>ทั้งหมด</div>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${statusFilter === 'pending' ? 'bg-red-50 border-red-500 ring-2 ring-red-500 ring-offset-2' : 'bg-white border-transparent hover:border-red-200'}`}
          onClick={() => setStatusFilter('pending')}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${statusFilter === 'pending' ? 'bg-gradient-to-br from-red-500 to-red-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${statusFilter === 'pending' ? 'text-red-900' : 'text-gray-900'}`}>{pendingCount}</div>
              <div className={`text-xs sm:text-sm font-medium truncate ${statusFilter === 'pending' ? 'text-red-700' : 'text-gray-500'}`}>รอการแก้ไข</div>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${statusFilter === 'resolved' ? 'bg-green-50 border-green-500 ring-2 ring-green-500 ring-offset-2' : 'bg-white border-transparent hover:border-green-200'}`}
          onClick={() => setStatusFilter('resolved')}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${statusFilter === 'resolved' ? 'bg-gradient-to-br from-green-500 to-green-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${statusFilter === 'resolved' ? 'text-green-900' : 'text-gray-900'}`}>{resolvedCount}</div>
              <div className={`text-xs sm:text-sm font-medium truncate ${statusFilter === 'resolved' ? 'text-green-700' : 'text-gray-500'}`}>แก้ไขแล้ว</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
          <thead>
            <tr className="bg-[#f9fafb] border-b border-[#d9d9d9]">
              <th className="px-6 py-4 text-left font-semibold text-[#292d32]">Buyer</th>
              <th className="px-6 py-4 text-left font-semibold text-[#292d32]">Issues</th>
              <th className="px-6 py-4 text-left font-semibold text-[#292d32]">Order Number</th>
              <th className="px-6 py-4 text-left font-semibold text-[#292d32]">Date</th>
              <th className="px-6 py-4 text-left font-semibold text-[#292d32]">Time</th>
              <th className="px-6 py-4 text-left font-semibold text-[#292d32]">Status</th>
              <th className="px-6 py-4 text-left font-semibold text-[#292d32]">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredIssues.map((issue) => (
              <tr key={issue.id} className="border-b border-[#d9d9d9] hover:bg-[#f9fafb]">
                <td className="px-6 py-4">
                  <div className="text-sm">
                    <div className="text-[#292d32]">{issue.buyer}</div>
                    <div className="text-[#999999]">{issue.username}</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-[#292d32]">{issue.issue}</td>
                <td className="px-6 py-4 text-sm text-[#292d32]">{issue.orderNumber}</td>
                <td className="px-6 py-4 text-sm text-[#292d32]">{issue.date}</td>
                <td className="px-6 py-4 text-sm text-[#292d32]">{issue.time}</td>
                <td className="px-6 py-4">
                  <div className={`w-3 h-3 rounded-full ${issue.status === "red" ? "bg-[#cf142b]" : "bg-[#99ee2d]"}`} />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-[#f9fafb] rounded">
                      <Search className="h-4 w-4 text-[#999999]" />
                    </button>
                    <button className="p-2 hover:bg-[#f9fafb] rounded relative">
                      <Mail className="h-4 w-4 text-[#999999]" />
                      {issue.hasMessage && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-[#cf142b] rounded-full" />
                      )}
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

      <div className="p-6 flex justify-end">
        <Button className="bg-[#ff9800] hover:bg-[#ff9800]/90 text-white px-8">บันทึก</Button>
      </div>
    </div>
  </div>
  )
}
