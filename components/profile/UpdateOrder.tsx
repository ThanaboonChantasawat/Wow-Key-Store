"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

const filterButtons = [
  { id: "pending", label: "รอชำระ" },
  { id: "paid", label: "ชำระแล้ว" },
  { id: "review", label: "รีวิวสินค้า" },
  { id: "completed", label: "เสร็จสมบูรณ์" },
]

const orders = [
  {
    id: 1,
    game: "Valorant",
    image: "/valorant-game.jpg",
    date: "22/01/2025",
    orderId: "#0110125489",
    status: "รอการตรวจสอบ",
    statusColor: "text-[#ff9800]",
  },
  {
    id: 2,
    game: "Fc Mobile",
    image: "/fc-mobile-game.jpg",
    date: "22/01/2025",
    orderId: "#0110125489",
    status: "ผู้ขายแจ้งปัญหา",
    statusColor: "text-[#ff9800]",
    hasButton: true,
  },
  {
    id: 3,
    game: "Fc Mobile",
    image: "/fc-mobile-game.jpg",
    date: "22/01/2025",
    orderId: "#0110125489",
    status: "สำเร็จ",
    statusColor: "text-[#ff9800]",
  },
]

export function UpdateOrderContent() {
  const [activeFilter, setActiveFilter] = useState("paid")

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-8">
        <h2 className="text-2xl font-semibold text-[#292d32] mb-6">อัพเดทคำสั่งซื้อ</h2>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          {filterButtons.map((filter) => (
            <Button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              variant="outline"
              className={`rounded-full px-6 py-2 ${
                activeFilter === filter.id
                  ? "bg-[#ff9800] text-white border-[#ff9800] hover:bg-[#ff9800]/90"
                  : "border-[#ff9800] text-[#ff9800] hover:bg-[#fff3e0]"
              }`}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white border border-[#d9d9d9] rounded-lg p-6 flex items-start gap-6">
              <Image
                src={order.image || "/placeholder.svg"}
                alt={order.game}
                width={120}
                height={120}
                className="rounded-lg object-cover"
              />
              <div className="flex-1 space-y-2">
                <h3 className="text-xl font-semibold text-[#292d32]">{order.game}</h3>
                <p className="text-[#292d32]">วันที่สั่งสินค้า : {order.date}</p>
                <p className="text-[#292d32]">เลขที่คำสั่งซื้อ : {order.orderId}</p>
                <p className={`font-medium ${order.statusColor}`}>สถานะคำสั่งซื้อ : {order.status}</p>
              </div>
              {order.hasButton && (
                <Button className="bg-[#ff9800] hover:bg-[#ff9800]/90 text-white px-6 py-2 rounded-full">
                  ตรวจสอบ
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
