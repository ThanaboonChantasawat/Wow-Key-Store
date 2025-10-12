"use client"

import { useState } from "react"
import { Search, Mail, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SellerIssues() {
  const [currentPage, setCurrentPage] = useState(1)
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

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b border-[#d9d9d9]">
        <h2 className="text-2xl font-bold text-[#292d32]">การแจ้งปัญหา</h2>
      </div>

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
            {issues.map((issue) => (
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
  )
}
