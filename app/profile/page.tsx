"use client";

import { useState, useEffect } from "react";
import { SidebarNav } from "@/components/profile/SidebarNav";
import { AccountContent } from "@/components/profile/Account";
import { WishlistContent } from "@/components/profile/Wishlist";
import { SellerStatusContent } from "@/components/profile/SellerStatus";
import { MyOrdersContent } from "@/components/profile/MyOrders";
import { MyReportsContent } from "@/components/profile/MyReports";
import { ViolationHistoryContent } from "@/components/profile/ViolationHistory";
import { SupportMessagesContent } from "@/components/profile/SupportMessages";

export default function AccountPage() {
  const [activeItem, setActiveItem] = useState("account");
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize tab from URL or sessionStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // URL parameter has highest priority
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get("tab");
      
      if (urlTab) {
        setActiveItem(urlTab);
      } else {
        // If no URL param, use saved tab from sessionStorage
        const savedTab = sessionStorage.getItem('lastProfileTab');
        if (savedTab) {
          setActiveItem(savedTab);
        }
      }
      
      // Mark as initialized after setting the correct tab
      setIsInitialized(true);
    }
  }, []);

  // Save active tab to sessionStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && activeItem) {
      sessionStorage.setItem('lastProfileTab', activeItem);
    }
  }, [activeItem]);

  const renderContent = () => {
    switch (activeItem) {
      case "account":
        return <AccountContent />;
      case "my-orders":
        return <MyOrdersContent />;
      case "seller-status":
        return <SellerStatusContent />;
      case "wishlist":
        return <WishlistContent />;
      case "my-reports":
        return <MyReportsContent />;
      case "violation-history":
        return <ViolationHistoryContent />;
      case "support-messages":
        return <SupportMessagesContent />; // ✅ เพิ่มหน้าข้อความ
      case "logout":
        return (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-semibold text-[#292d32]">
              ออกจากระบบ
            </h2>
            <p className="text-[#292d32] mt-4">คุณต้องการออกจากระบบหรือไม่?</p>
          </div>
        );
      default:
        return <AccountContent />;
    }
  };

  return (
    <div className="flex flex-col">
      <main className="container mx-auto px-4 py-8">
        <div className={`grid grid-cols-1 lg:grid-cols-[288px_1fr] gap-6 transition-opacity duration-150 ${!isInitialized ? 'opacity-0' : 'opacity-100'}`}>
          <SidebarNav activeItem={activeItem} onItemChange={setActiveItem} />

          {renderContent()}
        </div>
      </main>
    </div>
  );
}
