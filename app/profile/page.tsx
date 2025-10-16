"use client";

import { useState, useEffect } from "react";

import { SidebarNav } from "@/components/profile/SidebarNav";
import { AccountContent } from "@/components/profile/Account";
import { UpdateOrderContent } from "@/components/profile/UpdateOrder";
import { WishlistContent } from "@/components/profile/Wishlist";
import { HelpContent } from "@/components/profile/Help";
import { MyGameContent } from "@/components/profile/MyGame";
import { SellerStatusContent } from "@/components/profile/SellerStatus";
import { MyOrdersContent } from "@/components/profile/MyOrders";

export default function AccountPage() {
  const [activeItem, setActiveItem] = useState("account");

  // Read tab from URL on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab) {
        setActiveItem(tab);
      }
    }
  }, []);

  const renderContent = () => {
    switch (activeItem) {
      case "account":
        return <AccountContent />;
      case "my-orders":
        return <MyOrdersContent />;
      case "seller-status":
        return <SellerStatusContent />;
      case "myGame":
        return <MyGameContent />;
      case "update-order":
        return <UpdateOrderContent />;
      case "wishlist":
        return <WishlistContent />;
      case "help":
        return <HelpContent />;
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
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <SidebarNav activeItem={activeItem} onItemChange={setActiveItem} />

          {renderContent()}
        </div>
      </main>
    </div>
  );
}
