"use client"

import { useState, useEffect } from "react"
import { Users, Package, ShoppingCart, Store, AlertCircle, FileText, Activity } from "lucide-react"
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore"
import { db } from "@/components/firebase-config"
import { 
  getRecentAdminActivities, 
  getActionLabel, 
  getActionIcon, 
  getActionColor,
  type AdminActivity 
} from "@/lib/admin-activity-service"

export function AdminOverview() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalShops: 0,
    pendingShops: 0,
    reopenRequests: 0
  })
  const [recentActivities, setRecentActivities] = useState<AdminActivity[]>([])

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)

      // Fetch users count
      const usersSnapshot = await getDocs(collection(db, "users"))
      const totalUsers = usersSnapshot.size

      // Fetch products count
      const productsSnapshot = await getDocs(collection(db, "products"))
      const totalProducts = productsSnapshot.size

      // Fetch orders count
      const ordersSnapshot = await getDocs(collection(db, "orders"))
      const totalOrders = ordersSnapshot.size

      // Fetch shops count and pending shops
      const shopsSnapshot = await getDocs(collection(db, "shops"))
      const totalShops = shopsSnapshot.size
      let pendingShops = 0
      shopsSnapshot.forEach((doc) => {
        const shop = doc.data()
        if (shop.status === "pending") {
          pendingShops++
        }
      })

      // Fetch reopen requests count
      const reopenRequestsSnapshot = await getDocs(collection(db, "reopenRequests"))
      const reopenRequests = reopenRequestsSnapshot.size

      // Fetch recent admin activities
      const activities = await getRecentAdminActivities(8)

      setStats({
        totalUsers,
        totalProducts,
        totalOrders,
        totalShops,
        pendingShops,
        reopenRequests
      })
      setRecentActivities(activities)
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const statsData = [
    { 
      label: "ผู้ใช้ทั้งหมด", 
      value: loading ? "..." : stats.totalUsers.toLocaleString(), 
      icon: Users, 
      color: "from-blue-500 to-blue-600",
      bgColor: "from-blue-50 to-blue-100"
    },
    { 
      label: "ร้านค้าทั้งหมด", 
      value: loading ? "..." : stats.totalShops.toLocaleString(), 
      icon: Store, 
      color: "from-orange-500 to-orange-600",
      bgColor: "from-orange-50 to-orange-100"
    },
    { 
      label: "ร้านค้ารอตรวจสอบ", 
      value: loading ? "..." : stats.pendingShops.toLocaleString(), 
      icon: AlertCircle, 
      color: "from-yellow-500 to-yellow-600",
      bgColor: "from-yellow-50 to-yellow-100"
    },
    { 
      label: "คำขอเปิดร้านค้าใหม่", 
      value: loading ? "..." : stats.reopenRequests.toLocaleString(), 
      icon: FileText, 
      color: "from-purple-500 to-purple-600",
      bgColor: "from-purple-50 to-purple-100"
    },
    { 
      label: "สินค้าทั้งหมด", 
      value: loading ? "..." : stats.totalProducts.toLocaleString(), 
      icon: Package, 
      color: "from-green-500 to-green-600",
      bgColor: "from-green-50 to-green-100"
    },
    { 
      label: "คำสั่งซื้อทั้งหมด", 
      value: loading ? "..." : stats.totalOrders.toLocaleString(), 
      icon: ShoppingCart, 
      color: "from-pink-500 to-pink-600",
      bgColor: "from-pink-50 to-pink-100"
    },
  ]

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "ไม่ระบุ"
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
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
          return (
            <div 
              key={index} 
              className={`bg-gradient-to-br ${stat.bgColor} rounded-2xl p-6 border-2 border-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-md`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="text-4xl font-bold text-[#292d32] mb-2">{stat.value}</div>
              <div className="text-sm font-medium text-gray-600">{stat.label}</div>
            </div>
          )
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-gray-200">
        <h3 className="text-2xl font-bold text-[#292d32] mb-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          กิจกรรมของ Admin
        </h3>
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
          <div className="space-y-3">
            {recentActivities.map((activity) => (
              <div 
                key={activity.id} 
                className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200"
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${getActionColor(activity.action)} rounded-xl flex items-center justify-center flex-shrink-0 shadow-md`}>
                  <span className="text-2xl">{getActionIcon(activity.action)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-semibold text-[#292d32]">
                      {getActionLabel(activity.action)}
                    </p>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(activity.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-1">
                    <span className="font-medium">{activity.targetName}</span>
                  </p>
                  <p className="text-xs text-gray-600">{activity.details}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    โดย: {activity.adminName} ({activity.adminEmail})
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
