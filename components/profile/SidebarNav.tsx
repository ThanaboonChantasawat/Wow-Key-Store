"use client"

import { useState } from "react"
import { 
  Menu,
  User,
  ShoppingBag,
  Store,
  Heart,
  FileText,
  AlertCircle,
  MessageSquare
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from "@/components/ui/sheet"

const navItems = [
  { id: "account", label: "บัญชี", icon: User },
  { id: "my-orders", label: "คำสั่งซื้อ", icon: ShoppingBag },
  { id: "seller-status", label: "สถานะร้านค้า", icon: Store },
  { id: "wishlist", label: "รายการที่ชอบ", icon: Heart },
  { id: "my-reports", label: "รายงาน", icon: FileText },
  { id: "violation-history", label: "ประวัติการละเมิด", icon: AlertCircle },
  { id: "support-messages", label: "ข้อความ", icon: MessageSquare }, 
]

interface SidebarNavProps {
  activeItem: string
  onItemChange: (itemId: string) => void
}

export function SidebarNav({ activeItem, onItemChange }: SidebarNavProps) {
  const [open, setOpen] = useState(false)

  const handleItemClick = (itemId: string) => {
    onItemChange(itemId)
    setOpen(false)
  }

  const NavContent = () => (
    <nav className="space-y-1.5 sm:space-y-2">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = activeItem === item.id
        return (
          <button
            key={item.id}
            onClick={() => handleItemClick(item.id)}
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
  )

  return (
    <>
      {/* Mobile Floating Menu Button */}
      <div className="lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              size="icon"
              className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-[#ff9800] hover:bg-[#f57c00] text-white z-50"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] sm:w-[320px]">
            <SheetHeader className="mb-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 text-left">
                  <h2 className="text-lg font-bold text-[#292d32] truncate">บัญชีผู้ใช้</h2>
                  <p className="text-xs text-gray-500 truncate">จัดการข้อมูลส่วนตัว</p>
                </div>
              </div>
            </SheetHeader>
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="w-full lg:w-72 hidden lg:block">
        <div className="bg-white rounded-xl lg:rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200 lg:sticky lg:top-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-gray-200">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-[#292d32] truncate">บัญชีผู้ใช้</h2>
              <p className="text-xs text-gray-500 truncate">จัดการข้อมูลส่วนตัว</p>
            </div>
          </div>
          
          <NavContent />
        </div>
      </aside>
    </>
  )
}
