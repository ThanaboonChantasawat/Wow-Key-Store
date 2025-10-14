"use client";

import {
  BarChart3,
  Package,
  Box,
  AlertCircle,
  CreditCard,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SellerSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function SellerSidebar({
  activeSection,
  onSectionChange,
}: SellerSidebarProps) {
  const menuItems = [
    { id: "overview", label: "แดชบอร์ดผู้ขาย", icon: BarChart3 },
    { id: "products", label: "สินค้าของฉัน", icon: Package },
    { id: "orders", label: "อัพเดทสถานะสินค้า", icon: Box },
    { id: "issues", label: "แจ้งปัญหา", icon: AlertCircle },
    { id: "edit-account", label: "แก้ไขข้อมูลบัญชีร้านเงิน", icon: CreditCard },
    { id: "settings", label: "ตั้งค่าร้านค้า", icon: Store },
  ];

  return (
    <aside className="w-72 flex-shrink-0">
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#292d32] mb-4">Marketplace</h2>
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
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
      </div>
    </aside>
  );
}
