"use client"

import { useState } from "react"
import { AdminSidebar } from "./admin-sidebar"
import { AdminOverview } from "./admin-overview"
import { AdminUsers } from "./admin-users"
import { AdminProducts } from "./admin-products"
import { AdminOrders } from "./admin-orders"
import { AdminShops } from "./admin-shops"
import { AdminCategories } from "./admin-categories"
import { AdminGames } from "./admin-games"


export function AdminDashboard() {
  const [activeSection, setActiveSection] = useState("overview")

  return (
    <main className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-6">
          <AdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
          <div className="flex-1">
            {activeSection === "overview" && <AdminOverview />}
            {activeSection === "users" && <AdminUsers />}
            {activeSection === "products" && <AdminProducts />}
            {activeSection === "orders" && <AdminOrders />}
            {activeSection === "shops" && <AdminShops />}
            {activeSection === "categories" && <AdminCategories />}
            {activeSection === "games" && <AdminGames />}
          </div>
        </div>
      </div>
    </main>
  )
}
