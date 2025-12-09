"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Menu, X } from "lucide-react"
import { AdminSidebar } from "./admin-sidebar"
import { AdminOverview } from "./admin-overview"
import { AdminUsers } from "./admin-users"
import { AdminShops } from "./admin-shops"
import { AdminCategories } from "./admin-categories"
import { AdminGames } from "./admin-games"
import AdminReopenRequests from "./admin-reopen-requests"
import { AdminReports } from "./admin-reports"
import { AdminActivityLog } from "./admin-activity-log"
import { SupportMessagesContent } from "./support-messages"
import { SliderManagement } from "./slider-management"
import { Button } from "@/components/ui/button"
import { PopularGamesManagement } from "./popular-games-management"
import { OmiseModeSettings } from "./omise-mode-settings"

interface AdminDashboardProps {
  userId: string
}
export function AdminDashboard({ userId }: AdminDashboardProps) {
  const searchParams = useSearchParams()
  const [activeSection, setActiveSection] = useState("overview")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Check URL params for initial section
  useEffect(() => {
    const section = searchParams.get('section')
    if (section) {
      setActiveSection(section)
    }
  }, [searchParams])

  const handleSectionChange = (section: string) => {
    setActiveSection(section)
    setIsSidebarOpen(false) // Close sidebar on mobile after selection
    
    // Update URL
    const url = new URL(window.location.href)
    url.searchParams.set('section', section)
    window.history.pushState({}, '', url.toString())
  }

  return (
    <main className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="h-14 w-14 rounded-full bg-gradient-to-r from-[#ff9800] to-[#f57c00] hover:from-[#e08800] hover:to-[#d56600] shadow-2xl"
        >
          {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        <div className="flex gap-4 lg:gap-6">
          {/* Sidebar */}
          <div className={`
            fixed lg:relative
            top-0 left-0
            h-full lg:h-auto
            w-[280px] sm:w-80
            bg-transparent
            z-50 lg:z-auto
            transform lg:transform-none
            transition-transform duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            overflow-y-auto lg:overflow-visible
            flex-shrink-0
            pt-4 lg:pt-0
            px-3 lg:px-0
          `}>
            <AdminSidebar activeSection={activeSection} onSectionChange={handleSectionChange} />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="w-full">
              {activeSection === "overview" && <AdminOverview onNavigate={handleSectionChange} />}
              {activeSection === "users" && <AdminUsers />}
              {activeSection === "shops" && <AdminShops adminId={userId} />}
              {activeSection === "reopen-requests" && <AdminReopenRequests />}
              {activeSection === "reports" && <AdminReports reportId={searchParams.get('reportId') || undefined} />}
              {activeSection === "activities" && <AdminActivityLog />}
              {activeSection === "support" && <SupportMessagesContent />}
              {activeSection === "slider" && <SliderManagement />}
              {activeSection === "categories" && <AdminCategories />}
              {activeSection === "games" && <AdminGames />}
              {activeSection === "popular-games" && <PopularGamesManagement />}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
