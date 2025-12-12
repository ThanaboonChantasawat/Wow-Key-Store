"use client"

import { useState, useEffect } from "react"
import { Users, Package, Store, AlertCircle, FileText } from "lucide-react"
import { useAuth } from "@/components/auth-context"

interface AdminOverviewProps {
  onNavigate?: (section: string) => void
}

export function AdminOverview({ onNavigate }: AdminOverviewProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    offlineUsers: 0,
    totalProducts: 0,
    totalShops: 0,
    pendingShops: 0,
    reopenRequests: 0,
    activeReports: 0
  })

  // Auto-refresh stats every 5 seconds
  useEffect(() => {
    if (!user) return

    // Initial fetch
    fetchStats()

    // Set up interval for auto-refresh
    const intervalId = setInterval(() => {
      fetchStats()
    }, 5000) // Refresh every 5 seconds

    // Cleanup
    return () => {
      clearInterval(intervalId)
    }
  }, [user])

  const fetchStats = async () => {
    try {
      if (!user) return

      const token = await user.getIdToken()

      const statsResponse = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }
      
      setLoading(false)
    } catch (error) {
      console.error("Error fetching stats:", error)
      setLoading(false)
    }
  }

  const statsData = [
    { 
      label: "ผู้ใช้ทั้งหมด", 
      value: loading ? "..." : stats.totalUsers.toLocaleString(),
      subValue: loading ? "" : `ออนไลน์ ${stats.onlineUsers} | ออฟไลน์ ${stats.offlineUsers}`,
      icon: Users, 
      color: "from-blue-500 to-blue-600",
      bgColor: "from-blue-50 to-blue-100",
      section: "users"
    },
    { 
      label: "ร้านค้าทั้งหมด", 
      value: loading ? "..." : stats.totalShops.toLocaleString(), 
      icon: Store, 
      color: "from-orange-500 to-orange-600",
      bgColor: "from-orange-50 to-orange-100",
      section: "shops"
    },
    { 
      label: "ร้านค้ารอตรวจสอบ", 
      value: loading ? "..." : stats.pendingShops.toLocaleString(), 
      icon: AlertCircle, 
      color: "from-yellow-500 to-yellow-600",
      bgColor: "from-yellow-50 to-yellow-100",
      section: "shops"
    },
    { 
      label: "คำขอเปิดร้านค้าใหม่", 
      value: loading ? "..." : stats.reopenRequests.toLocaleString(), 
      icon: FileText, 
      color: "from-purple-500 to-purple-600",
      bgColor: "from-purple-50 to-purple-100",
      section: "reopen-requests"
    },
    { 
      label: "สินค้าทั้งหมด", 
      value: loading ? "..." : stats.totalProducts.toLocaleString(), 
      icon: Package, 
      color: "from-green-500 to-green-600",
      bgColor: "from-green-50 to-green-100",
      section: "products"
    },
    { 
      label: "รายงานที่รอดำเนินการ", 
      value: loading ? "..." : stats.activeReports.toLocaleString(), 
      icon: AlertCircle, 
      color: "from-red-500 to-red-600",
      bgColor: "from-red-50 to-red-100",
      section: "reports"
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 via-[#ff9800] to-red-500 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24" />
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Store className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-4xl font-bold">ภาพรวมระบบ</h2>
          </div>
          <p className="text-white/90 ml-[72px]">สถิติและข้อมูลรวมของระบบ Wow Key Store</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statsData.map((stat, index) => {
          const Icon = stat.icon
          const CardContent = (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-md`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="text-4xl font-bold text-[#292d32] mb-2">{stat.value}</div>
              {stat.subValue && (
                <div className="text-xs font-medium text-gray-500 mb-2">{stat.subValue}</div>
              )}
              <div className="text-sm font-medium text-gray-600">{stat.label}</div>
            </>
          )

          return (
            <div 
              key={index}
              onClick={() => stat.section && onNavigate?.(stat.section)}
              className={`bg-gradient-to-br ${stat.bgColor} rounded-2xl p-6 border-2 border-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 ${stat.section ? 'cursor-pointer' : ''}`}
            >
              {CardContent}
            </div>
          )
        })}
      </div>
    </div>
  )
}
