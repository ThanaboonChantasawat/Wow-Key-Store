"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-context"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bell, Check, CheckCheck, Trash2, Settings } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { th } from "date-fns/locale"

interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  link?: string
  read: boolean
  createdAt: Date
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "unread">("all")

  useEffect(() => {
    if (user) {
      fetchNotifications()
    }
  }, [user])

  const fetchNotifications = async () => {
    if (!user) return

    try {
      setLoading(true)
      const response = await fetch(`/api/notifications?userId=${user.uid}&limit=50`)
      const data = await response.json()
      
      // Convert date strings to Date objects
      const notificationsWithDates = data.map((notif: any) => ({
        ...notif,
        createdAt: new Date(notif.createdAt)
      }))
      
      setNotifications(notificationsWithDates)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST'
      })

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      
      // Notify other components (like notification bell) to refresh
      window.dispatchEvent(new CustomEvent('notifications-updated'))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    if (!user) return

    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid })
      })

      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      
      // Notify other components (like notification bell) to refresh
      window.dispatchEvent(new CustomEvent('notifications-updated'))
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })

      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      
      // Notify other components (like notification bell) to refresh
      window.dispatchEvent(new CustomEvent('notifications-updated'))
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const filteredNotifications = notifications.filter(n => 
    filter === "all" ? true : !n.read
  )

  const unreadCount = notifications.filter(n => !n.read).length

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Bell className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">กรุณาเข้าสู่ระบบ</h1>
          <p className="text-gray-600 mb-4">คุณต้องเข้าสู่ระบบเพื่อดูการแจ้งเตือน</p>
          <Link href="/">
            <Button className="bg-[#ff9800] hover:bg-[#e08800] text-white">
              กลับหน้าแรก
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">การแจ้งเตือน</h1>
              <p className="text-gray-600">
                {unreadCount > 0 ? `คุณมีการแจ้งเตือนที่ยังไม่ได้อ่าน ${unreadCount} รายการ` : 'คุณอ่านการแจ้งเตือนทั้งหมดแล้ว'}
              </p>
            </div>
            <Link href="/notifications/settings">
              <Button variant="outline" className="gap-2">
                <Settings className="w-4 h-4" />
                ตั้งค่า
              </Button>
            </Link>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
              className={filter === "all" ? "bg-[#ff9800] hover:bg-[#e08800]" : ""}
            >
              ทั้งหมด ({notifications.length})
            </Button>
            <Button
              variant={filter === "unread" ? "default" : "outline"}
              onClick={() => setFilter("unread")}
              className={filter === "unread" ? "bg-[#ff9800] hover:bg-[#e08800]" : ""}
            >
              ยังไม่ได้อ่าน ({unreadCount})
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                onClick={markAllAsRead}
                className="ml-auto gap-2"
              >
                <CheckCheck className="w-4 h-4" />
                อ่านทั้งหมด
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <Card className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff9800] mx-auto mb-4"></div>
            <p className="text-gray-600">กำลังโหลดการแจ้งเตือน...</p>
          </Card>
        ) : filteredNotifications.length === 0 ? (
          <Card className="p-12 text-center">
            <Bell className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              {filter === "unread" ? "ไม่มีการแจ้งเตือนที่ยังไม่ได้อ่าน" : "ไม่มีการแจ้งเตือน"}
            </h2>
            <p className="text-gray-600">
              {filter === "unread" 
                ? "คุณอ่านการแจ้งเตือนทั้งหมดแล้ว" 
                : "เมื่อมีการแจ้งเตือนใหม่ จะแสดงที่นี่"}
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={`p-4 transition-all ${
                  !notification.read ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                } ${notification.link ? 'cursor-pointer hover:shadow-md' : ''}`}
                onClick={() => {
                  if (notification.link) {
                    if (!notification.read) {
                      markAsRead(notification.id)
                    }
                    window.location.href = notification.link
                  }
                }}
              >
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                              ใหม่
                            </span>
                          )}
                        </div>
                        <p className="text-gray-700">{notification.message}</p>
                        <p className="text-sm text-gray-500 mt-2">
                          {formatDistanceToNow(notification.createdAt, {
                            addSuffix: true,
                            locale: th
                          })}
                        </p>
                      </div>
                      
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        {!notification.read && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markAsRead(notification.id)}
                            className="text-[#ff9800] hover:text-[#e08800] hover:bg-orange-50"
                            title="ทำเครื่องหมายว่าอ่านแล้ว"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteNotification(notification.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="ลบการแจ้งเตือน"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {notification.link && (
                      <div className="mt-3 flex items-center gap-2 text-[#ff9800] font-medium text-sm">
                        <span>➜ คลิกเพื่อดูรายละเอียด</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
