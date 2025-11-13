"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, X, Check, CheckCheck } from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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

export function NotificationBell() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Function to translate English reason codes to Thai
  const translateMessageToThai = (message: string): string => {
    const translations: Record<string, string> = {
      'spam': 'สแปม',
      'offensive': 'เนื้อหาไม่เหมาะสม',
      'false-information': 'ข้อมูลเท็จ',
      'inappropriate': 'ไม่เหมาะสม',
      'harassment': 'การคุกคาม',
      'other': 'อื่นๆ'
    }
    
    let translatedMessage = message
    Object.entries(translations).forEach(([eng, thai]) => {
      translatedMessage = translatedMessage.replace(new RegExp(`\\b${eng}\\b`, 'gi'), thai)
    })
    
    return translatedMessage
  }

  useEffect(() => {
    if (user) {
      fetchUnreadCount()
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000)
      
      // Listen for notification updates from other components
      const handleNotificationUpdate = () => {
        fetchUnreadCount()
      }
      window.addEventListener('notifications-updated', handleNotificationUpdate)
      
      return () => {
        clearInterval(interval)
        window.removeEventListener('notifications-updated', handleNotificationUpdate)
      }
    }
  }, [user])

  useEffect(() => {
    // Close dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchUnreadCount = async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/notifications/unread-count?userId=${user.uid}`)
      const data = await response.json()
      setUnreadCount(data.count || 0)
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }

  const fetchNotifications = async () => {
    if (!user || loading) return

    try {
      setLoading(true)
      const response = await fetch(`/api/notifications?userId=${user.uid}&limit=20`)
      const data = await response.json()
      
      // Convert date strings to Date objects and fix old notification links
      const notificationsWithDates = data.map((notif: any) => {
        let link = notif.link
        
        // Fix old notification links that use shopId instead of ownerId
        if (link && link.includes('/sellerprofile/shop_')) {
          // Extract shopId from link
          const shopIdMatch = link.match(/\/sellerprofile\/(shop_[^\/]+)/)
          if (shopIdMatch) {
            const shopId = shopIdMatch[1]
            // Convert shop_userId to just userId
            const ownerId = shopId.replace('shop_', '')
            link = `/sellerprofile/${ownerId}`
          }
        }
        
        return {
          ...notif,
          link,
          createdAt: new Date(notif.createdAt)
        }
      })
      
      setNotifications(notificationsWithDates)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBellClick = async () => {
    setShowDropdown(!showDropdown)
    // Always fetch latest notifications when opening dropdown
    if (!showDropdown) {
      await fetchNotifications()
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST'
      })

      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
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

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  if (!user) return null

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon - Match navbar style */}
      <button
        onClick={handleBellClick}
        className="p-2 rounded-full bg-white/20 hover:bg-white hover:text-[#ff9800] transition-colors duration-200 relative"
        aria-label="การแจ้งเตือน"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <Card className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[70vh] sm:max-h-[500px] overflow-hidden shadow-2xl border-2 z-50 p-0">
          {/* Header */}
          <div className="p-3 sm:p-4 border-b bg-gradient-to-r from-[#ff9800] to-[#f57c00] text-white">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <h3 className="font-bold text-base sm:text-lg">การแจ้งเตือน</h3>
              <button
                onClick={() => setShowDropdown(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-xs sm:text-sm hover:underline"
              >
                <CheckCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                อ่านทั้งหมด ({unreadCount})
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[50vh] sm:max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-6 sm:p-8 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-[#ff9800] mx-auto"></div>
                <p className="mt-2 text-sm">กำลังโหลด...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-gray-500">
                <Bell className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">ไม่มีการแจ้งเตือน</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.link || '#'}
                  onClick={() => {
                    markAsRead(notification.id)
                    setShowDropdown(false)
                  }}
                  className="block"
                >
                  <div
                    className={`p-3 border-b hover:bg-gray-50 transition-colors cursor-pointer ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-xs sm:text-sm text-gray-900 truncate">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-[#ff9800] rounded-full flex-shrink-0 mt-1"></div>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">
                          {translateMessageToThai(notification.message)}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(notification.createdAt, {
                            addSuffix: true,
                            locale: th
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-2 sm:p-3 border-t bg-gray-50 text-center">
              <Link
                href="/notifications"
                onClick={() => setShowDropdown(false)}
                className="text-xs sm:text-sm text-[#ff9800] hover:underline font-medium"
              >
                ดูการแจ้งเตือนทั้งหมด
              </Link>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
