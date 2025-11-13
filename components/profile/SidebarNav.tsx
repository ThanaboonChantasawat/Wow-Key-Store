"use client"

import { useState } from "react"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

const navItems = [
  { id: "account", label: "บัญชีของฉัน" },
  { id: "my-orders", label: "คำสั่งซื้อของฉัน" },
  { id: "seller-status", label: "สถานะร้านค้า" },
  { id: "wishlist", label: "ชื่นชอบ" },
  { id: "my-reports", label: "รายงานของฉัน" },
  { id: "violation-history", label: "ประวัติการละเมิด" },
  { id: "support-messages", label: "ข้อความของฉัน" }, 
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
    <nav>
      <ul className="space-y-2">
        {navItems.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => handleItemClick(item.id)}
              className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
                activeItem === item.id
                  ? "bg-[#fff3e0] text-[#ff9800] font-medium"
                  : "text-[#292d32] hover:bg-[#f2f2f4]"
              }`}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
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
            <SheetHeader>
              <SheetTitle className="text-left">บัญชีผู้ใช้</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <NavContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="w-full hidden lg:block">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-[#292d32] mb-4">บัญชีผู้ใช้</h2>
          <NavContent />
        </div>
      </aside>
    </>
  )
}
