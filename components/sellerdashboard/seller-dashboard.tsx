"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { SellerSidebar } from "./seller-sidebar"
import { SellerOverview } from "./seller-overview"
import { SellerProducts } from "./seller-products"
import { SellerIssues } from "./seller-issues"
import { SellerStoreSettings } from "./seller-store-settings"
import { SellerPaymentSettings } from "./seller-payment-settings"
import SellerEarnings from "./seller-earnings"
import SellerSalesHistory from "./seller-sales-history"
import SellerPayouts from "./seller-payouts"
import { useAuth } from "@/components/auth-context"

export function SellerDashboard() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()

  const [activeSection, setActiveSection] = useState("overview")

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab) {
      setActiveSection(tab)
    }
  }, [searchParams])

  const handleSectionChange = (section: string) => {
    setActiveSection(section)
    router.push(`${pathname}?tab=${section}`)
  }

  if (!user) {
    return null
  }

  return (
    <main className="flex-1">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[288px_1fr] gap-6">
          <SellerSidebar activeSection={activeSection} onSectionChange={handleSectionChange} />
          <div className="flex-1">
            {activeSection === "overview" && <SellerOverview />}
            {activeSection === "products" && <SellerProducts />}
            {activeSection === "orders" && <SellerSalesHistory />}
            {activeSection === "issues" && <SellerIssues />}
            {activeSection === "earnings" && <SellerEarnings />}
            {activeSection === "payout" && <SellerPayouts />}
            {activeSection === "payment" && <SellerPaymentSettings />}
            {activeSection === "settings" && <SellerStoreSettings userId={user.uid} />}
          </div>
        </div>
      </div>
    </main>
  )
}
