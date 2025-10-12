"use client"

import { Users, Package, ShoppingCart, Store, TrendingUp, DollarSign } from "lucide-react"

export function AdminOverview() {
  const stats = [
    { 
      label: "ผู้ใช้ทั้งหมด", 
      value: "0", 
      icon: Users, 
      color: "from-blue-500 to-blue-600",
      bgColor: "from-blue-50 to-blue-100"
    },
    { 
      label: "สินค้าทั้งหมด", 
      value: "0", 
      icon: Package, 
      color: "from-green-500 to-green-600",
      bgColor: "from-green-50 to-green-100"
    },
    { 
      label: "คำสั่งซื้อทั้งหมด", 
      value: "0", 
      icon: ShoppingCart, 
      color: "from-purple-500 to-purple-600",
      bgColor: "from-purple-50 to-purple-100"
    },
    { 
      label: "ร้านค้าทั้งหมด", 
      value: "0", 
      icon: Store, 
      color: "from-orange-500 to-orange-600",
      bgColor: "from-orange-50 to-orange-100"
    },
    { 
      label: "ยอดขายรวม", 
      value: "฿0", 
      icon: DollarSign, 
      color: "from-pink-500 to-pink-600",
      bgColor: "from-pink-50 to-pink-100"
    },
    { 
      label: "อัตราการเติบโต", 
      value: "0%", 
      icon: TrendingUp, 
      color: "from-teal-500 to-teal-600",
      bgColor: "from-teal-50 to-teal-100"
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-[#ff9800] to-[#f57c00] rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-[#292d32]">ภาพรวมระบบ</h2>
        </div>
        <p className="text-gray-600 ml-16">สถิติและข้อมูลรวมของระบบ Wow Key Store</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div 
              key={index} 
              className={`bg-gradient-to-br ${stat.bgColor} rounded-2xl p-6 border-2 border-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-md`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="text-4xl font-bold text-[#292d32] mb-2">{stat.value}</div>
              <div className="text-sm font-medium text-gray-600">{stat.label}</div>
            </div>
          )
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
        <h3 className="text-xl font-bold text-[#292d32] mb-6 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-[#ff9800]" />
          กิจกรรมล่าสุด
        </h3>
        <div className="text-center py-12 text-gray-500">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p>ยังไม่มีกิจกรรมในระบบ</p>
        </div>
      </div>
    </div>
  )
}
