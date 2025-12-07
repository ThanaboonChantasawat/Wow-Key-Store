"use client";

import { useState } from "react";
import {
  BarChart3,
  Package,
  Box,
  CreditCard,
  Store,
  Wallet,
  DollarSign,
  Menu,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from "@/components/ui/sheet"

interface SellerSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function SellerSidebar({
  activeSection,
  onSectionChange,
}: SellerSidebarProps) {
  const [open, setOpen] = useState(false);

  const menuItems = [
    { id: "overview", label: "แดชบอร์ดผู้ขาย", icon: BarChart3 },
    { id: "products", label: "สินค้าของฉัน", icon: Package },
    { id: "orders", label: "จัดการคำสั่งซื้อ", icon: Box },
    { id: "reports", label: "รายการแจ้งปัญหา", icon: AlertTriangle },
    { id: "earnings", label: "รายได้ของฉัน", icon: DollarSign },
    { id: "payout", label: "ถอนเงิน", icon: CreditCard },
    { id: "payment", label: "บัญชีรับเงิน", icon: Wallet },
    { id: "settings", label: "ตั้งค่าร้านค้า", icon: Store },
  ];

  const handleSectionChange = (section: string) => {
    onSectionChange(section);
    setOpen(false);
  };

  const NavContent = () => (
    <nav className="space-y-1.5 sm:space-y-2">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeSection === item.id;
        return (
          <button
            key={item.id}
            onClick={() => handleSectionChange(item.id)}
            className={`w-full flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-3 sm:py-3.5 rounded-lg sm:rounded-xl text-left transition-all duration-200 ${
              isActive
                ? "bg-gradient-to-r from-[#ff9800] to-[#f57c00] text-white font-bold shadow-lg scale-[1.02] sm:scale-105"
                : "text-[#292d32] hover:bg-gray-100 hover:scale-[1.01] active:scale-100"
            }`}
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span className="text-sm sm:text-base truncate">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );

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
                  <Store className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 text-left">
                  <h2 className="text-lg font-bold text-[#292d32] truncate">Seller Center</h2>
                  <p className="text-xs text-gray-500 truncate">จัดการร้านค้า</p>
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
              <Store className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-[#292d32] truncate">Seller Center</h2>
              <p className="text-xs text-gray-500 truncate">จัดการร้านค้า</p>
            </div>
          </div>
          
          <NavContent />
        </div>
      </aside>
    </>
  );
}
