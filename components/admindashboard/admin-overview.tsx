"use client"

import { useState, useEffect } from "react"
import { Users, Package, Store, AlertCircle, FileText, Activity } from "lucide-react"
import { Timestamp } from "firebase/firestore"
import { useAuth } from "@/components/auth-context"
import { 
  type AdminActivity 
} from "@/lib/admin-activity-client"

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
  const [recentActivities, setRecentActivities] = useState<AdminActivity[]>([])

  // Auto-refresh stats every 5 seconds
  useEffect(() => {
    if (!user) return

    // Initial fetch
    fetchStats()
    fetchActivities()

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

  const fetchActivities = async () => {
    try {
      if (!user) return

      const token = await user.getIdToken()

      // Fetch recent admin activities via API (only 3 for overview)
      const activitiesResponse = await fetch('/api/admin/activities?limit=3', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const activitiesData = activitiesResponse.ok 
        ? await activitiesResponse.json() 
        : { activities: [] };
      
      // Convert date strings back to Date objects
      const activitiesWithDates = (activitiesData.activities || []).map((activity: any) => ({
        ...activity,
        createdAt: new Date(activity.createdAt)
      }));

      setRecentActivities(activitiesWithDates)
    } catch (error) {
      console.error("Error fetching activities:", error)
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

  const formatDate = (timestamp: Timestamp | Date | null | undefined): string => {
    if (!timestamp) return "ไม่ระบุ"
    
    let date: Date
    if (timestamp instanceof Timestamp) {
      date = timestamp.toDate()
    } else if (timestamp instanceof Date) {
      date = timestamp
    } else {
      return "ไม่ระบุ"
    }
    
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

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

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-[#292d32] flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            กิจกรรมของ Admin
          </h3>
          <button 
            onClick={() => onNavigate?.("activities")}
            className="text-sm font-medium text-[#ff9800] hover:text-[#e08800] transition-colors cursor-pointer"
          >
            ดูทั้งหมด →
          </button>
        </div>
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff9800] mx-auto"></div>
            <p className="text-gray-500 mt-4">กำลังโหลดข้อมูล...</p>
          </div>
        ) : recentActivities.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-6xl mb-4">📋</div>
            <h4 className="text-xl font-bold text-gray-800 mb-2">ยังไม่มีกิจกรรม</h4>
            <p className="text-gray-600">กิจกรรมของ Admin จะแสดงที่นี่</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentActivities.map((activity) => {
              // Parse details
              const parseDetails = (details: string) => {
                const contentTypeMatch = details.match(/Deleted (comment|review)/)
                const reasonMatch = details.match(/Reason: ([^.]+)/)
                const noteMatch = details.match(/Admin note: ([^.]+)/)
                const violationsMatch = details.match(/User violations: (\d+)/)
                const durationMatch = details.match(/for (\d+) days/)
                
                return {
                  contentType: contentTypeMatch?.[1] === 'comment' ? 'ความคิดเห็น' : 'รีวิว',
                  reason: reasonMatch?.[1],
                  adminNote: noteMatch?.[1],
                  violations: violationsMatch?.[1],
                  duration: durationMatch?.[1]
                }
              }

              const parsed = parseDetails(activity.details)
              
              // Get Thai action description
              const getThaiAction = () => {
                switch(activity.action) {
                  case 'delete_content':
                    return `ลบ${parsed.contentType}`
                  case 'ban_user':
                    return 'แบนผู้ใช้'
                  case 'approve_report':
                    return 'อนุมัติรายงาน'
                  case 'reject_report':
                    return 'ปฏิเสธรายงาน'
                  case 'reverse_report_decision':
                    return 'ยกเลิกการตัดสิน'
                  default:
                    return activity.action
                }
              }

              const getActionIcon = (action: string) => {
                switch (action) {
                  case 'ban_user':
                    return '🚫'
                  case 'delete_content':
                    return '🗑️'
                  case 'reverse_report_decision':
                    return '🔄'
                  case 'approve_report':
                    return '✅'
                  case 'reject_report':
                    return '❌'
                  default:
                    return '📋'
                }
              }

              return (
                <div 
                  key={activity.id} 
                  className="bg-white rounded-xl p-5 border-l-4 shadow-sm hover:shadow-lg transition-all cursor-pointer"
                  style={{
                    borderLeftColor: activity.action === 'ban_user' ? '#dc2626' : 
                                    activity.action === 'delete_content' ? '#ea580c' :
                                    activity.action === 'reverse_report_decision' ? '#2563eb' :
                                    activity.action === 'approve_report' ? '#16a34a' : 
                                    activity.action === 'reject_report' ? '#dc2626' : '#6b7280'
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon Section */}
                    <div className="flex-shrink-0">
                      <div className={`p-3 rounded-xl ${
                        activity.action === 'ban_user' ? 'bg-red-100' :
                        activity.action === 'delete_content' ? 'bg-orange-100' :
                        activity.action === 'reverse_report_decision' ? 'bg-blue-100' :
                        activity.action === 'approve_report' ? 'bg-green-100' :
                        activity.action === 'reject_report' ? 'bg-red-100' : 'bg-gray-100'
                      }`}>
                        <span className="text-xl">{getActionIcon(activity.action)}</span>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 min-w-0">
                      {/* Badge & Time */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          activity.action === 'ban_user' ? 'bg-red-600 text-white' :
                          activity.action === 'delete_content' ? 'bg-orange-600 text-white' :
                          activity.action === 'reverse_report_decision' ? 'bg-blue-600 text-white' :
                          activity.action === 'approve_report' ? 'bg-green-600 text-white' :
                          activity.action === 'reject_report' ? 'bg-red-500 text-white' : 'bg-gray-600 text-white'
                        }`}>
                          {getActionIcon(activity.action)} {getThaiAction()}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full whitespace-nowrap">
                          {formatDate(activity.createdAt)}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2">
                        {getThaiAction()}ของ {activity.targetName}
                      </p>

                      {/* Admin Info */}
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Users className="w-3 h-3" />
                        <span className="font-medium">{activity.adminName}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
