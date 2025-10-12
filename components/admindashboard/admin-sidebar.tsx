"use client"

import { BarChart3, Users, Package, ShoppingCart, Store, Shield, Tag, Gamepad2 } from "lucide-react"

interface AdminSidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
}

export function AdminSidebar({ activeSection, onSectionChange }: AdminSidebarProps) {
  const menuItems = [
    { id: "overview", label: "ภาพรวม", icon: BarChart3 },
    { id: "users", label: "จัดการผู้ใช้", icon: Users },
    { id: "products", label: "จัดการสินค้า", icon: Package },
    { id: "orders", label: "จัดการคำสั่งซื้อ", icon: ShoppingCart },
    { id: "shops", label: "จัดการร้านค้า", icon: Store },
    { id: "categories", label: "จัดการหมวดหมู่", icon: Tag },
    { id: "games", label: "จัดการเกม", icon: Gamepad2 },
  ]

  return (
    <aside className="w-72 flex-shrink-0">
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 sticky top-4">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-200">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#292d32]">Admin Panel</h2>
            <p className="text-xs text-gray-500">ระบบจัดการ</p>
          </div>
        </div>
        
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all duration-200 ${
                  isActive 
                    ? "bg-gradient-to-r from-[#ff9800] to-[#f57c00] text-white font-bold shadow-lg scale-105" 
                    : "text-[#292d32] hover:bg-gray-100 hover:scale-102"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm">{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
