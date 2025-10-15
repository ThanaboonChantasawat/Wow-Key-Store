"use client"

import { useState } from "react"
import { SellerSidebar } from "./seller-sidebar"
import { SellerOverview } from "./seller-overview"
import { SellerProducts } from "./seller-products"
import { SellerUpdateOrders } from "./seller-update-orders"
import { SellerIssues } from "./seller-issues"
import { SellerEditAccount } from "./seller-edit-account"
import { SellerStoreSettings } from "./seller-store-settings"
import { SellerPaymentSettings } from "./seller-payment-settings"
import SellerEarnings from "./seller-earnings"
import SellerSalesHistory from "./seller-sales-history"
import SellerPayouts from "./seller-payouts"
import { useAuth } from "@/components/auth-context"

export function SellerDashboard() {
  const [activeSection, setActiveSection] = useState("overview")
  const { user } = useAuth()

  if (!user) {
    return null
  }

  return (
    <main className="flex-1">
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-6">
          <SellerSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
          <div className="flex-1">
            {activeSection === "overview" && <SellerOverview />}
            {activeSection === "products" && <SellerProducts />}
            {activeSection === "orders" && <SellerUpdateOrders />}
            {activeSection === "issues" && <SellerIssues />}
            {activeSection === "payment" && <SellerPaymentSettings />}
            {activeSection === "earnings" && <SellerEarnings />}
            {activeSection === "sales" && <SellerSalesHistory />}
            {activeSection === "payouts" && <SellerPayouts />}
            {activeSection === "edit-account" && <SellerEditAccount />}
            {activeSection === "settings" && <SellerStoreSettings userId={user.uid} />}
          </div>
        </div>
      </div>
    </main>
  )
}
