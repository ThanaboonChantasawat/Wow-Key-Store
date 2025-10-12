"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function SellerUpdateOrders() {
  const [activeTab, setActiveTab] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = 5

  const orders = [
    {
      id: 1,
      game: "RoV (Arena of Valor)",
      date: "22/01/2025",
      time: "11:55 PM",
      orderNumber: "#0110125489",
      status: "รอการตรวจสอบ",
      statusColor: "text-[#ff9800]",
      image: "/rov-game.jpg",
    },
    {
      id: 2,
      game: "Garena Free Fire",
      date: "22/01/2025",
      time: "11:55 PM",
      orderNumber: "#0110125489",
      status: "เสร็จสมบูรณ์",
      statusColor: "text-[#ff9800]",
      image: "/free-fire-game.jpg",
    },
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b border-[#d9d9d9]">
        <h2 className="text-2xl font-bold text-[#292d32] mb-6">อัพเดทสถานะสินค้า</h2>
        <div className="flex gap-3">
          <Button
            onClick={() => setActiveTab("all")}
            className={
              activeTab === "all"
                ? "bg-[#ff9800] hover:bg-[#ff9800]/90 text-white"
                : "bg-white border-2 border-[#ff9800] text-[#ff9800] hover:bg-[#fff3e0]"
            }
          >
            ทั้งหมด
          </Button>
          <Button
            onClick={() => setActiveTab("pending")}
            className={
              activeTab === "pending"
                ? "bg-[#ff9800] hover:bg-[#ff9800]/90 text-white"
                : "bg-white border-2 border-[#ff9800] text-[#ff9800] hover:bg-[#fff3e0]"
            }
          >
            รอจัดส่ง
          </Button>
          <Button
            onClick={() => setActiveTab("completed")}
            className={
              activeTab === "completed"
                ? "bg-[#ff9800] hover:bg-[#ff9800]/90 text-white"
                : "bg-white border-2 border-[#ff9800] text-[#ff9800] hover:bg-[#fff3e0]"
            }
          >
            เสร็จสมบูรณ์
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="border border-[#d9d9d9] rounded-lg p-6 flex items-center gap-6">
            <img
              src={order.image || "/placeholder.svg"}
              alt={order.game}
              className="w-24 h-24 rounded-lg object-cover"
            />
            <div className="flex-1">
              <h3 className="font-bold text-[#292d32] text-lg mb-2">{order.game}</h3>
              <div className="space-y-1 text-sm text-[#292d32]">
                <p>
                  วันที่สั่งสินค้า : {order.date} {order.time}
                </p>
                <p>เวลาที่สั่งซื้อ :</p>
                <p>เลขที่คำสั่งซื้อ : {order.orderNumber}</p>
                <p>
                  สถานะสินค้า : <span className={order.statusColor}>{order.status}</span>
                </p>
              </div>
            </div>
            <Button className="bg-[#ff9800] hover:bg-[#ff9800]/90 text-white">ตรวจสอบ</Button>
          </div>
        ))}
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
