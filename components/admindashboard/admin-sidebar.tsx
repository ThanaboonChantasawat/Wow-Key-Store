"use client"

import { BarChart3, Users, Store, Mail, Tag, Gamepad2, Shield, AlertTriangle, Activity, MessageSquare, Image, Star } from "lucide-react"

interface AdminSidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
}

export function AdminSidebar({ activeSection, onSectionChange }: AdminSidebarProps) {
  const menuItems = [
    { id: "overview", label: "ภาพรวม", icon: BarChart3 },
    { id: "users", label: "จัดการผู้ใช้", icon: Users },
    { id: "shops", label: "จัดการร้านค้า", icon: Store },
    { id: "reopen-requests", label: "คำขอเปิดร้านใหม่", icon: Mail },
    { id: "reports", label: "จัดการรายงาน", icon: AlertTriangle },
    { id: "activities", label: "กิจกรรมของ Admin", icon: Activity },
    { id: "support", label: "ข้อความจากลูกค้า", icon: MessageSquare },
    { id: "slider", label: "จัดการรูปหน้าแรก", icon: Image },
    { id: "categories", label: "จัดการหมวดหมู่", icon: Tag },
    { id: "games", label: "จัดการเกม", icon: Gamepad2 },
    { id: "popular-games", label: "เกมยอดนิยม", icon: Star },
  ]

  return (
    <aside className="w-full lg:w-72">
      <div className="bg-white rounded-xl lg:rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200 lg:sticky lg:top-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-gray-200">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-[#292d32] truncate">Admin Panel</h2>
            <p className="text-xs text-gray-500 truncate">ระบบจัดการ</p>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="space-y-1.5 sm:space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`w-full flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-3 sm:py-3.5 rounded-lg sm:rounded-xl text-left transition-all duration-200 ${
                  isActive 
                    ? "bg-gradient-to-r from-[#ff9800] to-[#f57c00] text-white font-bold shadow-lg scale-[1.02] sm:scale-105" 
                    : "text-[#292d32] hover:bg-gray-100 hover:scale-[1.01] active:scale-100"
                }`}
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="text-sm sm:text-base truncate">{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
