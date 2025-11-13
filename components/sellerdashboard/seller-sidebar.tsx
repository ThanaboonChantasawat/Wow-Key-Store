"use client";

import { useState } from "react";
import {
  BarChart3,
  Package,
  Box,
  AlertCircle,
  CreditCard,
  Store,
  Wallet,
  DollarSign,
  ShoppingCart,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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
    { id: "orders", label: "อัพเดทสถานะสินค้า", icon: Box },
    { id: "sales", label: "ประวัติการขาย", icon: ShoppingCart },
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
    <nav className="space-y-2">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeSection === item.id;
        return (
          <button
            key={item.id}
            onClick={() => handleSectionChange(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
              isActive
                ? "bg-[#fff3e0] text-[#ff9800] font-medium"
                : "text-[#292d32] hover:bg-[#f9fafb]"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-sm">{item.label}</span>
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
            <SheetHeader>
              <SheetTitle className="text-left">Dashboard</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <NavContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="w-72 flex-shrink-0 hidden lg:block">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-[#292d32] mb-4">Dashboard</h2>
          <NavContent />
        </div>
      </aside>
    </>
  );
}
