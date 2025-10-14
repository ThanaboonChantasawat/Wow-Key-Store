"use client"

import { useState } from "react"
import { AdminSidebar } from "./admin-sidebar"
import { AdminOverview } from "./admin-overview"
import { AdminUsers } from "./admin-users"
import { AdminShops } from "./admin-shops"
import { AdminCategories } from "./admin-categories"
import { AdminGames } from "./admin-games"
import AdminReopenRequests from "./admin-reopen-requests"

interface AdminDashboardProps {
  userId: string
}

export function AdminDashboard({ userId }: AdminDashboardProps) {
  const [activeSection, setActiveSection] = useState("overview")

  return (
    <main className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-6">
          <AdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
          <div className="flex-1">
            {activeSection === "overview" && <AdminOverview />}
            {activeSection === "users" && <AdminUsers />}
            {activeSection === "shops" && <AdminShops adminId={userId} />}
            {activeSection === "reopen-requests" && <AdminReopenRequests />}
            {activeSection === "categories" && <AdminCategories />}
            {activeSection === "games" && <AdminGames />}
          </div>
        </div>
      </div>
    </main>
  )
}
