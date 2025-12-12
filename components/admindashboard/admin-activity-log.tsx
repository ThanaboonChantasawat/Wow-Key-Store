'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { Shield, User, Trash2, Ban, CheckCircle, XCircle, AlertTriangle, ChevronLeft, ChevronRight, Search, Filter, Activity } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AdminActivity {
  id: string
  adminId: string
  adminName: string
  adminEmail: string
  action: string
  targetType: string
  targetId: string
  targetName: string
  details: string
  createdAt: string
}

export function AdminActivityLog() {
  const { user } = useAuth()
  const [activities, setActivities] = useState<AdminActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedActivity, setSelectedActivity] = useState<AdminActivity | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const itemsPerPage = 5

  const sanitizeVisibleText = (text: string) => {
    if (!text) return ''

    return text
      // Remove lines that expose internal codes
      .replace(/(^|\n)\s*.*รหัสรายงาน\s*:\s*.*(?=\n|$)/gi, '$1')
      .replace(/(^|\n)\s*.*report\s*id\s*:\s*.*(?=\n|$)/gi, '$1')
      // Remove parenthesized IDs/codes
      .replace(/\s*\((?:ID|Id|id)\s*:\s*[^)]+\)/g, '')
      .replace(/\s*\(รหัส\s*:\s*[^)]+\)/g, '')
      // Remove inline "X ID: value" patterns
      .replace(/\b(?:Shop|User|Owner|Order|Report|Comment|Review)\s*ID\s*:\s*[^\s,]+/gi, '')
      .replace(/\b(?:shop|user|owner|order|report|comment|review)id\s*:\s*[^\s,]+/gi, '')
      // Remove common internal id tokens
      .replace(/\b(?:shop|user|order|report|comment|review)_[A-Za-z0-9_-]+\b/gi, '')
      // Remove leftover "ID: xxx" tokens
      .replace(/\bID\s*:\s*[^\s,]+/gi, '')
      // Cleanup punctuation/spacing
      .replace(/\s+-\s+-\s+/g, ' - ')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([,.;:!?])/g, '$1')
      .trim()
  }

  const getListBadgeClass = (action: string) => {
    switch (action) {
      case 'ban_user':
      case 'reject_report':
        return 'bg-red-600 text-white'
      case 'delete_content':
      case 'suspend_shop':
        return 'bg-orange-600 text-white'
      case 'approve_report':
      case 'unsuspend_shop':
        return 'bg-green-600 text-white'
      case 'approve_shop':
      case 'approve_reopen_request':
        return 'bg-blue-600 text-white'
      case 'reject_shop':
      case 'reject_reopen_request':
        return 'bg-gray-600 text-white'
      case 'reverse_report_decision':
        return 'bg-blue-600 text-white'
      case 'update_user_role':
      case 'process_report':
        return 'bg-purple-600 text-white'
      case 'reorder_popular_games':
        return 'bg-indigo-600 text-white'
      default:
        return 'bg-gray-600 text-white'
    }
  }

  const getActionTheme = (action: string) => {
    switch (action) {
      case 'ban_user':
      case 'reject_report':
        return { borderHex: '#dc2626', iconBg: 'bg-red-100', headerBg: 'from-red-50 to-rose-50', borderClass: 'border-red-200' }
      case 'delete_content':
      case 'suspend_shop':
        return { borderHex: '#ea580c', iconBg: 'bg-orange-100', headerBg: 'from-orange-50 to-amber-50', borderClass: 'border-orange-200' }
      case 'unsuspend_shop':
      case 'approve_report':
        return { borderHex: '#16a34a', iconBg: 'bg-green-100', headerBg: 'from-green-50 to-emerald-50', borderClass: 'border-green-200' }
      case 'approve_shop':
      case 'approve_reopen_request':
        return { borderHex: '#2563eb', iconBg: 'bg-blue-100', headerBg: 'from-blue-50 to-indigo-50', borderClass: 'border-blue-200' }
      case 'reject_shop':
      case 'reject_reopen_request':
        return { borderHex: '#6b7280', iconBg: 'bg-gray-100', headerBg: 'from-gray-50 to-slate-50', borderClass: 'border-gray-200' }
      case 'reverse_report_decision':
        return { borderHex: '#2563eb', iconBg: 'bg-blue-100', headerBg: 'from-blue-50 to-cyan-50', borderClass: 'border-blue-200' }
      case 'update_user_role':
      case 'process_report':
        return { borderHex: '#7c3aed', iconBg: 'bg-purple-100', headerBg: 'from-purple-50 to-violet-50', borderClass: 'border-purple-200' }
      case 'create_category':
      case 'create_game':
        return { borderHex: '#16a34a', iconBg: 'bg-green-100', headerBg: 'from-green-50 to-emerald-50', borderClass: 'border-green-200' }
      case 'update_category':
      case 'update_game':
        return { borderHex: '#2563eb', iconBg: 'bg-blue-100', headerBg: 'from-blue-50 to-indigo-50', borderClass: 'border-blue-200' }
      case 'delete_category':
      case 'delete_game':
        return { borderHex: '#dc2626', iconBg: 'bg-red-100', headerBg: 'from-red-50 to-rose-50', borderClass: 'border-red-200' }
      case 'reorder_popular_games':
        return { borderHex: '#4f46e5', iconBg: 'bg-indigo-100', headerBg: 'from-indigo-50 to-sky-50', borderClass: 'border-indigo-200' }
      default:
        return { borderHex: '#6b7280', iconBg: 'bg-gray-100', headerBg: 'from-gray-50 to-gray-100', borderClass: 'border-gray-200' }
    }
  }

  useEffect(() => {
    if (!user) return
    
    // Initial fetch
    fetchActivities()
    
    // Set up auto-refresh every 10 seconds
    const intervalId = setInterval(() => {
      fetchActivities()
    }, 10000)
    
    // Cleanup
    return () => {
      clearInterval(intervalId)
    }
  }, [user])

  // Filter logic
  const filteredActivities = activities.filter(activity => {
    const matchesSearch = 
      activity.adminName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.targetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.details.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesAction = actionFilter === "all" || 
                          (actionFilter === "approve_all" && (activity.action === "approve_report" || activity.action === "approve_shop")) ||
                          activity.action === actionFilter
    
    return matchesSearch && matchesAction
  })

  // Pagination
  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentActivities = filteredActivities.slice(startIndex, endIndex)

  const fetchActivities = async () => {
    // Don't show loading spinner on refresh
    const isInitialLoad = activities.length === 0
    if (isInitialLoad) {
      setIsLoading(true)
    }
    
    try {
      const token = await user!.getIdToken()
      console.log('🔍 Fetching admin activities...')
      const response = await fetch('/api/admin/activities?limit=100', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      console.log('📊 Response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ API Error:', errorData)
        throw new Error(errorData.error || 'Failed to fetch activities')
      }

      const data = await response.json()
      console.log('✅ Activities loaded:', data.activities?.length || 0, 'items')
      console.log('📋 Activities:', data.activities)
      setActivities(data.activities || [])
    } catch (error: any) {
      console.error('❌ Error fetching admin activities:', error)
      if (isInitialLoad) {
        alert(`ไม่สามารถโหลดประวัติได้: ${error.message}`)
      }
    } finally {
      if (isInitialLoad) {
        setIsLoading(false)
      }
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'ban_user':
        return <Ban className="w-4 h-4 text-red-600" />
      case 'delete_content':
        return <Trash2 className="w-4 h-4 text-orange-600" />
      case 'reverse_report_decision':
        return <Shield className="w-4 h-4 text-blue-600" />
      case 'approve_report':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'reject_report':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'approve_shop':
      case 'approve_reopen_request':
        return <CheckCircle className="w-4 h-4 text-blue-600" />
      case 'reject_shop':
      case 'reject_reopen_request':
        return <XCircle className="w-4 h-4 text-gray-600" />
      case 'suspend_shop':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />
      case 'unsuspend_shop':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'update_user_role':
        return <User className="w-4 h-4 text-purple-600" />
      default:
        return <Shield className="w-4 h-4 text-blue-600" />
    }
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'ban_user':
        return <Badge className="bg-red-600">🚫 แบนผู้ใช้</Badge>
      case 'unban_user':
        return <Badge className="bg-green-600">✅ ยกเลิกการแบน</Badge>
      case 'delete_content':
        return <Badge className="bg-orange-600">🗑️ ลบเนื้อหา</Badge>
      case 'reverse_report_decision':
        return <Badge className="bg-blue-600">🔄 ยกเลิกการตัดสิน</Badge>
      case 'approve_report':
        return <Badge className="bg-green-600">✅ อนุมัติรายงาน</Badge>
      case 'reject_report':
        return <Badge className="bg-red-500">❌ ปฏิเสธรายงาน</Badge>
      case 'approve_shop':
        return <Badge className="bg-blue-600">✅ อนุมัติร้านค้า</Badge>
      case 'reject_shop':
        return <Badge className="bg-gray-600">❌ ปฏิเสธร้านค้า</Badge>
      case 'suspend_shop':
        return <Badge className="bg-orange-600">⏸️ ระงับร้านค้า</Badge>
      case 'unsuspend_shop':
        return <Badge className="bg-green-600">▶️ ยกเลิกระงับร้านค้า</Badge>
      case 'approve_reopen_request':
        return <Badge className="bg-blue-600">✅ อนุมัติคำขอเปิดร้าน</Badge>
      case 'reject_reopen_request':
        return <Badge className="bg-gray-600">❌ ปฏิเสธคำขอเปิดร้าน</Badge>
      case 'update_user_role':
        return <Badge className="bg-purple-600">👤 เปลี่ยนบทบาท</Badge>
      case 'create_category':
        return <Badge className="bg-green-600">➕ สร้างหมวดหมู่</Badge>
      case 'update_category':
        return <Badge className="bg-blue-600">✏️ แก้ไขหมวดหมู่</Badge>
      case 'delete_category':
        return <Badge className="bg-red-600">🗑️ ลบหมวดหมู่</Badge>
      case 'create_game':
        return <Badge className="bg-green-600">➕ เพิ่มเกม</Badge>
      case 'update_game':
        return <Badge className="bg-blue-600">✏️ แก้ไขเกม</Badge>
      case 'delete_game':
        return <Badge className="bg-red-600">🗑️ ลบเกม</Badge>
      case 'reorder_popular_games':
        return <Badge className="bg-indigo-600">🔄 จัดเรียงเกม</Badge>
      case 'process_report':
        return <Badge className="bg-purple-600">⚖️ ดำเนินการรายงาน</Badge>
      default:
        return <Badge variant="outline">{action}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#292d32]">กิจกรรมของ Admin</h2>
          <p className="text-gray-600">
            <AlertTriangle className="w-4 h-4 inline mr-1 text-orange-500" />
            บันทึกทุกการกระทำเพื่อความโปร่งใสและตรวจสอบได้
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input 
          type="search" 
          placeholder="ค้นหาประวัติ (ชื่อ Admin, เป้าหมาย, รายละเอียด)..." 
          className="pl-10 bg-white"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card 
          className={`p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${actionFilter === 'all' ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-500 ring-offset-2' : 'bg-white border-transparent hover:border-orange-200'}`}
          onClick={() => setActionFilter('all')}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${actionFilter === 'all' ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${actionFilter === 'all' ? 'text-orange-900' : 'text-gray-900'}`}>{activities.length}</div>
              <div className={`text-xs sm:text-sm font-medium truncate ${actionFilter === 'all' ? 'text-orange-700' : 'text-gray-500'}`}>ทั้งหมด</div>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${actionFilter === 'ban_user' ? 'bg-red-50 border-red-500 ring-2 ring-red-500 ring-offset-2' : 'bg-white border-transparent hover:border-red-200'}`}
          onClick={() => setActionFilter('ban_user')}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${actionFilter === 'ban_user' ? 'bg-gradient-to-br from-red-500 to-red-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <Ban className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${actionFilter === 'ban_user' ? 'text-red-900' : 'text-gray-900'}`}>{activities.filter(a => a.action === 'ban_user').length}</div>
              <div className={`text-xs sm:text-sm font-medium truncate ${actionFilter === 'ban_user' ? 'text-red-700' : 'text-gray-500'}`}>แบนผู้ใช้</div>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${actionFilter === 'delete_content' ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-500 ring-offset-2' : 'bg-white border-transparent hover:border-orange-200'}`}
          onClick={() => setActionFilter('delete_content')}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${actionFilter === 'delete_content' ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <Trash2 className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${actionFilter === 'delete_content' ? 'text-orange-900' : 'text-gray-900'}`}>{activities.filter(a => a.action === 'delete_content').length}</div>
              <div className={`text-xs sm:text-sm font-medium truncate ${actionFilter === 'delete_content' ? 'text-orange-700' : 'text-gray-500'}`}>ลบเนื้อหา</div>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${actionFilter === 'approve_all' ? 'bg-green-50 border-green-500 ring-2 ring-green-500 ring-offset-2' : 'bg-white border-transparent hover:border-green-200'}`}
          onClick={() => setActionFilter('approve_all')}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${actionFilter === 'approve_all' ? 'bg-gradient-to-br from-green-500 to-green-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${actionFilter === 'approve_all' ? 'text-green-900' : 'text-gray-900'}`}>{activities.filter(a => a.action === 'approve_report' || a.action === 'approve_shop').length}</div>
              <div className={`text-xs sm:text-sm font-medium truncate ${actionFilter === 'approve_all' ? 'text-green-700' : 'text-gray-500'}`}>อนุมัติ</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      {/* Removed old filter card */}

      <div className="space-y-4">
        {filteredActivities.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              ไม่พบประวัติการดำเนินการ
            </CardContent>
          </Card>
        ) : (
          <>
            {currentActivities.map((activity) => {
            // Parse details to extract key information
            const parseDetails = (details: string) => {
              // Old English shop actions (some legacy logs include (ID: shop_...))
              const oldEnglishShopMatch = details.match(/^(Approved|Rejected|Suspended|Unsuspended)\s+shop:\s*(.+?)(?:\s*\(ID:\s*([^)]+)\))?(?:\s*-\s*Reason:\s*(.+))?$/i)
              if (oldEnglishShopMatch) {
                const verb = oldEnglishShopMatch[1]?.toLowerCase()
                const shopName = sanitizeVisibleText(oldEnglishShopMatch[2] || '')
                const reasonRaw = oldEnglishShopMatch[4]?.trim()
                const reason = reasonRaw ? sanitizeVisibleText(reasonRaw) : null

                const shopAction =
                  verb === 'approved' ? 'approve_shop' :
                  verb === 'rejected' ? 'reject_shop' :
                  verb === 'suspended' ? 'suspend_shop' :
                  verb === 'unsuspended' ? 'unsuspend_shop' :
                  null

                if (shopAction) {
                  return {
                    shopName,
                    reason,
                    actionType: 'shop_action',
                    shopAction,
                    isNewFormat: false,
                    isOldEnglishFormat: true
                  }
                }
              }

              // Check for new Thai format (มี emoji และ section headers)
              if (details.includes('🔄') || details.includes('📌') || details.includes('🔍') || details.includes('❌') || details.includes('🗑️') || details.includes('🚫')) {
                
                // Delete Content format
                if (details.includes('🗑️ ลบเนื้อหา')) {
                  const lines = details.split('\n')
                  let contentType = ''
                  let targetName = ''
                  let reportId = ''
                  let adminNote = ''
                  let reason = ''
                  
                  for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim()
                    if (line.includes('• ประเภท:')) contentType = line.replace(/^.*• ประเภท:\s*/, '').trim()
                    else if (line.includes('• เจ้าของ:')) targetName = line.replace(/^.*• เจ้าของ:\s*/, '').trim()
                    else if (line.includes('• เหตุผล:')) reason = line.replace(/^.*• เหตุผล:\s*/, '').trim()
                    else if (line.includes('• รหัสรายงาน:')) reportId = line.replace(/^.*รหัสรายงาน:\s*/, '').trim()
                    else if (line.includes('• หมายเหตุ:')) adminNote = line.replace(/^.*• หมายเหตุ:\s*/, '').trim()
                  }
                  
                  return {
                    contentType,
                    targetName,
                    reportId,
                    reason: reason !== '-' ? reason : null,
                    adminNote: adminNote !== '-' ? adminNote : null,
                    actionType: 'delete_content',
                    isNewFormat: true
                  }
                }

                // Ban User format
                if (details.includes('🚫 แบนผู้ใช้')) {
                  const lines = details.split('\n')
                  let targetName = ''
                  let duration = ''
                  let reportId = ''
                  let adminNote = ''
                  let reason = ''
                  
                  for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim()
                    if (line.includes('• ผู้ใช้:')) targetName = line.replace(/^.*• ผู้ใช้:\s*/, '').trim()
                    else if (line.includes('• ระยะเวลา:')) duration = line.replace(/^.*• ระยะเวลา:\s*/, '').replace(' วัน', '').trim()
                    else if (line.includes('• เหตุผล:')) reason = line.replace(/^.*• เหตุผล:\s*/, '').trim()
                    else if (line.includes('• รหัสรายงาน:')) reportId = line.replace(/^.*รหัสรายงาน:\s*/, '').trim()
                    else if (line.includes('• หมายเหตุ:')) adminNote = line.replace(/^.*• หมายเหตุ:\s*/, '').trim()
                  }
                  
                  return {
                    targetName,
                    duration,
                    reportId,
                    reason: reason !== '-' ? reason : null,
                    adminNote: adminNote !== '-' ? adminNote : null,
                    actionType: 'ban_user',
                    isNewFormat: true
                  }
                }

                // ปฏิเสธรายงาน format
                if (details.includes('❌ ปฏิเสธรายงาน')) {
                  // Match ชื่อ: ที่อยู่หลัง ผู้ถูกรายงาน section
                  const lines = details.split('\n')
                  let targetUser = ''
                  let contentType = ''
                  let targetContent = ''
                  let reporterName = ''
                  let reportReason = ''
                  let adminReason = ''
                  
                  for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim()
                    if (line.includes('• ชื่อ:') && !targetUser) {
                      targetUser = line.replace(/^.*• ชื่อ:\s*/, '').trim()
                    } else if (line.includes('• เนื้อหาที่ถูกรายงาน:')) {
                      contentType = line.replace(/^.*• เนื้อหาที่ถูกรายงาน:\s*/, '').trim()
                    } else if (line.includes('• เนื้อหา:')) {
                      targetContent = line.replace(/^.*• เนื้อหา:\s*/, '').trim()
                    } else if (line.includes('• ชื่อ:') && targetUser && !reporterName) {
                      reporterName = line.replace(/^.*• ชื่อ:\s*/, '').trim()
                    } else if (line.includes('• เหตุผลที่รายงาน:')) {
                      reportReason = line.replace(/^.*• เหตุผลที่รายงาน:\s*/, '').trim()
                    } else if (line.includes('📝 เหตุผลในการปฏิเสธ:') && i + 1 < lines.length) {
                      adminReason = lines[i + 1].trim()
                    }
                  }
                  
                  return {
                    targetUser,
                    contentType,
                    targetContent,
                    reporterName,
                    reportReason,
                    reason: adminReason,
                    actionType: 'reject',
                    isNewFormat: true
                  }
                }
                
                // ยกเลิกการตัดสิน format
                if (details.includes('🔄')) {
                  const statusMatch = details.match(/สถานะเดิม:\s*([^\n]+)/)
                  const reviewedByMatch = details.match(/ตัดสินโดย:\s*([^\n]+)/)
                  const oldNoteMatch = details.match(/หมายเหตุเดิม:\s*([^\n]+)/)
                  const reasonMatch = details.match(/เหตุผลในการยกเลิก:\s*([^\n]+)/)
                  const targetUserMatch = details.match(/ผู้ถูกรายงาน:\s*([^\n]+)/)
                  
                  return {
                    contentType: null,
                    reportId: null,
                    reason: reasonMatch?.[1]?.trim(),
                    adminNote: oldNoteMatch?.[1]?.trim() || reasonMatch?.[1]?.trim(),
                    violations: null,
                    duration: null,
                    bannedUntil: null,
                    actionType: 'reverse',
                    oldStatus: statusMatch?.[1]?.trim(),
                    reviewedBy: reviewedByMatch?.[1]?.trim(),
                    targetUser: targetUserMatch?.[1]?.trim(),
                    isNewFormat: true
                  }
                }
              }
              
              // Check for old English reverse format
              if (details.includes('Reversed decision from')) {
                const oldStatusMatch = details.match(/Reversed decision from "([^"]+)"/)
                const oldNoteMatch = details.match(/Old note:\s*([^.]+)\./)
                const reasonMatch = details.match(/Reverse reason:\s*(.+)$/)
                
                return {
                  contentType: null,
                  reportId: null,
                  reason: reasonMatch?.[1]?.trim(),
                  adminNote: oldNoteMatch?.[1]?.trim(),
                  violations: null,
                  duration: null,
                  bannedUntil: null,
                  actionType: 'reverse',
                  oldStatus: oldStatusMatch?.[1] === 'approved' ? '✅ ดำเนินการแล้ว' : 
                             oldStatusMatch?.[1] === 'rejected' ? '❌ ปฏิเสธรายงาน' : 
                             oldStatusMatch?.[1],
                  reviewedBy: null,
                  targetUser: null,
                  isNewFormat: true,
                  isOldEnglishFormat: true
                }
              }
              
              // Check for old English reject format
              if (details.includes('Rejected report against')) {
                const targetMatch = details.match(/against\s+([^:]+):/)
                const noteMatch = details.match(/:\s*(.+)$/)
                
                return {
                  contentType: null,
                  targetUser: targetMatch?.[1]?.trim(),
                  reason: noteMatch?.[1]?.trim(),
                  actionType: 'reject',
                  isNewFormat: false,
                  isOldEnglishFormat: true
                }
              }
              
              // Old format parsing
              const contentTypeMatch = details.match(/Deleted (comment|review)/)
              const reportMatch = details.match(/from report (\w+)/)
              const reasonMatch = details.match(/Reason: ([^.]+)/)
              const noteMatch = details.match(/Admin note: ([^.]+)/)
              const violationsMatch = details.match(/User violations: (\d+)/)
              const durationMatch = details.match(/for (\d+) days/)
              const bannedUntilMatch = details.match(/Banned until: (.+)$/)
              const actionTypeMatch = details.match(/^(Deleted|Banned|Approved|Rejected)/)
              
              return {
                contentType: contentTypeMatch?.[1],
                reportId: reportMatch?.[1],
                reason: reasonMatch?.[1],
                adminNote: noteMatch?.[1],
                violations: violationsMatch?.[1],
                duration: durationMatch?.[1],
                bannedUntil: bannedUntilMatch?.[1],
                actionType: actionTypeMatch?.[1],
                isNewFormat: false
              }
            }

            const parsed = parseDetails(activity.details)
            
            // Get action description in Thai
            const getActionDescription = () => {
              if (parsed.isNewFormat && activity.action === 'reverse_report_decision') {
                const userInfo = parsed.targetUser ? ` ของ ${parsed.targetUser}` : ' ของ ผู้ใช้'
                return `ยกเลิกการตัดสินเดิม${userInfo}`
              }
              
              if (activity.action === 'reject_report') {
                const ct = parsed.contentType?.toLowerCase()
                const contentTypeText = !ct ? 'ความคิดเห็น' :
                  (ct.includes('comment') || ct.includes('ความคิดเห็น')) ? 'ความคิดเห็น' :
                  (ct.includes('review') || ct.includes('รีวิว')) ? 'รีวิว' : 'ความคิดเห็น'
                const targetUserName = parsed.targetUser || activity.targetName || 'ผู้ใช้'
                
                // แสดงแค่ข้อมูลหลักสั้นๆ
                let description = `ปฏิเสธรายงาน${contentTypeText}ของ ${targetUserName}`               
                
                return description
              }
              
              switch(activity.action) {
                case 'delete_content':
                  const contentType = parsed.contentType === 'comment' ? 'ความคิดเห็น' : 'รีวิว'
                  let deleteDesc = `ลบ${contentType}ของ ${activity.targetName || 'ผู้ใช้'}`
                  if (parsed.reason) {
                    deleteDesc += ` - เหตุผล: ${parsed.reason}`
                  }
                  return deleteDesc
                case 'ban_user':
                  let banDesc = `แบนผู้ใช้ ${activity.targetName || 'ผู้ใช้'}${parsed.duration ? ` (${parsed.duration} วัน)` : ''}`
                  if (parsed.reason) {
                    banDesc += ` - เหตุผล: ${parsed.reason}`
                  }
                  return banDesc
                case 'approve_report':
                  return `อนุมัติรายงานเกี่ยวกับ ${activity.targetName || 'ผู้ใช้'}`
                case 'approve_shop':
                  return `อนุมัติร้านค้า ${parsed.shopName || activity.targetName || 'ร้านค้า'}`
                case 'reject_shop':
                  return `ปฏิเสธร้านค้า ${parsed.shopName || activity.targetName || 'ร้านค้า'}`
                case 'suspend_shop':
                  return `ระงับร้านค้า ${parsed.shopName || activity.targetName || 'ร้านค้า'}`
                case 'unsuspend_shop':
                  return `ยกเลิกระงับร้านค้า ${parsed.shopName || activity.targetName || 'ร้านค้า'}`
                case 'approve_reopen_request':
                  return `อนุมัติคำขอเปิดร้าน ${activity.targetName || 'ร้านค้า'}`
                case 'reject_reopen_request':
                  return `ปฏิเสธคำขอเปิดร้าน ${activity.targetName || 'ร้านค้า'}`
                case 'update_user_role':
                  return `เปลี่ยนบทบาทของ ${activity.targetName || 'ผู้ใช้'}`
                case 'create_category':
                  return `สร้างหมวดหมู่ ${activity.targetName || ''}`.trim()
                case 'update_category':
                  return `แก้ไขหมวดหมู่ ${activity.targetName || ''}`.trim()
                case 'delete_category':
                  return `ลบหมวดหมู่ ${activity.targetName || ''}`.trim()
                case 'create_game':
                  return `เพิ่มเกม ${activity.targetName || ''}`.trim()
                case 'update_game':
                  return `แก้ไขเกม ${activity.targetName || ''}`.trim()
                case 'delete_game':
                  return `ลบเกม ${activity.targetName || ''}`.trim()
                case 'reorder_popular_games':
                  return 'จัดเรียงเกมยอดนิยม'
                case 'process_report':
                  return `ดำเนินการรายงานเกี่ยวกับ ${activity.targetName || 'ผู้ใช้'}`
                default:
                  return sanitizeVisibleText(activity.details)
              }
            }

            const getActionIconEmoji = (action: string) => {
              switch (action) {
                case 'ban_user':
                  return '🚫'
                case 'unban_user':
                  return '✅'
                case 'delete_content':
                  return '🗑️'
                case 'reverse_report_decision':
                  return '🔄'
                case 'approve_report':
                case 'approve_shop':
                case 'approve_reopen_request':
                  return '✅'
                case 'reject_report':
                case 'reject_shop':
                case 'reject_reopen_request':
                  return '❌'
                case 'suspend_shop':
                  return '⏸️'
                case 'unsuspend_shop':
                  return '▶️'
                case 'update_user_role':
                  return '👤'
                case 'create_category':
                case 'create_game':
                  return '➕'
                case 'update_category':
                case 'update_game':
                  return '✏️'
                case 'delete_category':
                case 'delete_game':
                  return '🗑️'
                case 'reorder_popular_games':
                  return '🔄'
                case 'process_report':
                  return '⚖️'
                default:
                  return '📋'
              }
            }

            const getThaiActionName = () => {
              switch(activity.action) {
                case 'delete_content':
                  return 'ลบเนื้อหา'
                case 'ban_user':
                  return 'แบนผู้ใช้'
                case 'unban_user':
                  return 'ยกเลิกการแบน'
                case 'approve_report':
                  return 'อนุมัติรายงาน'
                case 'reject_report':
                  return 'ปฏิเสธรายงาน'
                case 'reverse_report_decision':
                  return 'ยกเลิกการตัดสิน'
                case 'process_report':
                  return 'ดำเนินการรายงาน'
                case 'approve_shop':
                  return 'อนุมัติร้านค้า'
                case 'reject_shop':
                  return 'ปฏิเสธร้านค้า'
                case 'suspend_shop':
                  return 'ระงับร้านค้า'
                case 'unsuspend_shop':
                  return 'ยกเลิกระงับร้านค้า'
                case 'approve_reopen_request':
                  return 'อนุมัติคำขอเปิดร้าน'
                case 'reject_reopen_request':
                  return 'ปฏิเสธคำขอเปิดร้าน'
                case 'update_user_role':
                  return 'เปลี่ยนบทบาทผู้ใช้'
                case 'create_category':
                  return 'สร้างหมวดหมู่'
                case 'update_category':
                  return 'แก้ไขหมวดหมู่'
                case 'delete_category':
                  return 'ลบหมวดหมู่'
                case 'create_game':
                  return 'เพิ่มเกม'
                case 'update_game':
                  return 'แก้ไขเกม'
                case 'delete_game':
                  return 'ลบเกม'
                case 'reorder_popular_games':
                  return 'จัดเรียงเกมยอดนิยม'
                default:
                  return activity.action
              }
            }

            return (
              <div 
                key={activity.id} 
                className="bg-white rounded-xl p-5 border-l-4 shadow-sm hover:shadow-lg transition-all cursor-pointer"
                style={{
                  borderLeftColor: getActionTheme(activity.action).borderHex
                }}
                onClick={() => {
                  setSelectedActivity(activity)
                  setShowModal(true)
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Icon Section */}
                  <div className="flex-shrink-0">
                    <div className={`p-3 rounded-xl ${getActionTheme(activity.action).iconBg}`}>
                      <span className="text-xl">{getActionIconEmoji(activity.action)}</span>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="flex-1 min-w-0">
                    {/* Badge & Time */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getListBadgeClass(activity.action)}`}>
                        {getActionIconEmoji(activity.action)} {getThaiActionName()}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full whitespace-nowrap">
                        {activity.createdAt && format(new Date(activity.createdAt), 'dd MMM • HH:mm', { locale: th })}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2">
                      {getActionDescription()}
                    </p>

                    {/* Admin Info */}
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <User className="w-3 h-3" />
                      <span className="font-medium">{activity.adminName || 'ผู้ใช้'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                ก่อนหน้า
              </Button>
              <span className="text-sm text-gray-600">
                หน้า {currentPage} จาก {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                ถัดไป
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedActivity && (
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getActionIcon(selectedActivity.action)}
                <span>รายละเอียดกิจกรรม</span>
              </DialogTitle>
            </DialogHeader>

            {(() => {
              const getActionIconEmoji = (action: string) => {
                switch (action) {
                  case 'ban_user':
                    return '🚫'
                  case 'unban_user':
                    return '✅'
                  case 'delete_content':
                    return '🗑️'
                  case 'reverse_report_decision':
                    return '🔄'
                  case 'approve_report':
                  case 'approve_shop':
                  case 'approve_reopen_request':
                    return '✅'
                  case 'reject_report':
                  case 'reject_shop':
                  case 'reject_reopen_request':
                    return '❌'
                  case 'suspend_shop':
                    return '⏸️'
                  case 'unsuspend_shop':
                    return '▶️'
                  case 'update_user_role':
                    return '👤'
                  case 'create_category':
                  case 'create_game':
                    return '➕'
                  case 'update_category':
                  case 'update_game':
                    return '✏️'
                  case 'delete_category':
                  case 'delete_game':
                    return '🗑️'
                  case 'reorder_popular_games':
                    return '🔄'
                  case 'process_report':
                    return '⚖️'
                  default:
                    return '📋'
                }
              }

              const parseDetails = (details: string) => {
                // Old English shop actions (legacy logs)
                const oldEnglishShopMatch = details.match(/^(Approved|Rejected|Suspended|Unsuspended)\s+shop:\s*(.+?)(?:\s*\(ID:\s*([^)]+)\))?(?:\s*-\s*Reason:\s*(.+))?$/i)
                if (oldEnglishShopMatch) {
                  const verb = oldEnglishShopMatch[1]?.toLowerCase()
                  const shopName = sanitizeVisibleText(oldEnglishShopMatch[2] || '')
                  const reasonRaw = oldEnglishShopMatch[4]?.trim()
                  const reason = reasonRaw ? sanitizeVisibleText(reasonRaw) : null

                  const shopAction =
                    verb === 'approved' ? 'approve_shop' :
                    verb === 'rejected' ? 'reject_shop' :
                    verb === 'suspended' ? 'suspend_shop' :
                    verb === 'unsuspended' ? 'unsuspend_shop' :
                    null

                  if (shopAction) {
                    return {
                      shopName,
                      reason,
                      actionType: 'shop_action',
                      shopAction,
                      isNewFormat: false,
                      isOldEnglishFormat: true
                    }
                  }
                }

                // Check for new Thai format (มี emoji และ section headers)
                if (details.includes('🔄') || details.includes('📌') || details.includes('🔍') || details.includes('❌') || details.includes('🗑️') || details.includes('🚫')) {
                  
                  // 🗑️ ลบเนื้อหา format (NEW)
                  if (details.includes('🗑️ ลบเนื้อหา')) {
                    const lines = details.split('\n')
                    let contentType = ''
                    let targetUser = ''
                    let reason = ''
                    let adminNote = ''
                    
                    for (const line of lines) {
                      const trimmed = line.trim()
                      if (trimmed.includes('• ประเภท:')) {
                        const val = trimmed.replace(/^.*• ประเภท:\s*/, '').trim()
                        contentType = val.includes('ความคิดเห็น') ? 'comment' : val.includes('รีวิว') ? 'review' : val
                      } else if (trimmed.includes('• ผู้ใช้:')) {
                        targetUser = trimmed.replace(/^.*• ผู้ใช้:\s*/, '').trim()
                      } else if (trimmed.includes('• เหตุผล:')) {
                        reason = trimmed.replace(/^.*• เหตุผล:\s*/, '').trim()
                      } else if (trimmed.includes('• หมายเหตุ:')) {
                        adminNote = trimmed.replace(/^.*• หมายเหตุ:\s*/, '').trim()
                      }
                    }
                    
                    return {
                      contentType: contentType || null,
                      targetUser: targetUser || null,
                      reason: reason && reason !== '-' ? reason : null,
                      adminNote: adminNote && adminNote !== '-' ? adminNote : null,
                      isNewFormat: true,
                      actionType: 'delete_content',
                      violations: null,
                      duration: null,
                      bannedUntil: null,
                      reportId: null,
                      targetContent: null,
                      reporterName: null,
                      reporterEmail: null,
                      reportReason: null,
                      targetEmail: null
                    }
                  }
                  
                  // 🚫 แบนผู้ใช้ format (NEW)
                  if (details.includes('🚫 แบนผู้ใช้')) {
                    const lines = details.split('\n')
                    let targetUser = ''
                    let reason = ''
                    let duration = ''
                    let adminNote = ''
                    
                    for (const line of lines) {
                      const trimmed = line.trim()
                      if (trimmed.includes('• ผู้ใช้:')) {
                        targetUser = trimmed.replace(/^.*• ผู้ใช้:\s*/, '').trim()
                      } else if (trimmed.includes('• เหตุผล:')) {
                        reason = trimmed.replace(/^.*• เหตุผล:\s*/, '').trim()
                      } else if (trimmed.includes('• ระยะเวลา:')) {
                        const val = trimmed.replace(/^.*• ระยะเวลา:\s*/, '').trim()
                        const numMatch = val.match(/(\d+)/)
                        duration = numMatch ? numMatch[1] : ''
                      } else if (trimmed.includes('• หมายเหตุ:')) {
                        adminNote = trimmed.replace(/^.*• หมายเหตุ:\s*/, '').trim()
                      }
                    }
                    
                    return {
                      targetUser: targetUser || null,
                      reason: reason && reason !== '-' ? reason : null,
                      duration: duration || null,
                      adminNote: adminNote && adminNote !== '-' ? adminNote : null,
                      isNewFormat: true,
                      actionType: 'ban_user',
                      violations: null,
                      bannedUntil: null,
                      contentType: null,
                      reportId: null,
                      targetContent: null,
                      reporterName: null,
                      reporterEmail: null,
                      reportReason: null,
                      targetEmail: null
                    }
                  }
                  
                  // ปฏิเสธรายงาน format
                  if (details.includes('❌ ปฏิเสธรายงาน')) {
                    const lines = details.split('\n')
                    let targetUser = ''
                    let targetEmail = ''
                    let contentType = ''
                    let targetContent = ''
                    let reporterName = ''
                    let reporterEmail = ''
                    let reportReason = ''
                    let adminReason = ''
                    let reportId = ''
                    
                    for (let i = 0; i < lines.length; i++) {
                      const line = lines[i].trim()
                      if (line.includes('• ชื่อ:') && !targetUser) {
                        targetUser = line.replace(/^.*• ชื่อ:\s*/, '').trim()
                      } else if (line.includes('• อีเมล:') && !targetEmail) {
                        targetEmail = line.replace(/^.*• อีเมล:\s*/, '').trim()
                      } else if (line.includes('• เนื้อหาที่ถูกรายงาน:')) {
                        contentType = line.replace(/^.*• เนื้อหาที่ถูกรายงาน:\s*/, '').trim()
                      } else if (line.includes('• เนื้อหา:')) {
                        targetContent = line.replace(/^.*• เนื้อหา:\s*/, '').trim()
                      } else if (line.includes('• ชื่อ:') && targetUser && !reporterName) {
                        reporterName = line.replace(/^.*• ชื่อ:\s*/, '').trim()
                      } else if (line.includes('• อีเมล:') && targetEmail && !reporterEmail) {
                        reporterEmail = line.replace(/^.*• อีเมล:\s*/, '').trim()
                      } else if (line.includes('• เหตุผลที่รายงาน:')) {
                        reportReason = line.replace(/^.*• เหตุผลที่รายงาน:\s*/, '').trim()
                      } else if (line.includes('📝 เหตุผลในการปฏิเสธ:') && i + 1 < lines.length) {
                        adminReason = lines[i + 1].trim()
                      } else if (line.includes('รหัสรายงาน:')) {
                        reportId = line.replace(/^.*รหัสรายงาน:\s*/, '').trim()
                      }
                    }
                    
                    return {
                      targetUser,
                      targetEmail,
                      contentType,
                      targetContent,
                      reporterName,
                      reporterEmail,
                      reportReason,
                      reason: adminReason,
                      actionType: 'reject',
                      isNewFormat: true,
                      reportId: reportId || null,
                      adminNote: null,
                      violations: null,
                      duration: null,
                      bannedUntil: null
                    }
                  }
                  
                  // ยกเลิกการตัดสิน format
                  if (details.includes('🔄')) {
                    const lines = details.split('\n')
                    let statusMatch = details.match(/สถานะเดิม:\s*([^\n]+)/)
                    let reviewedByMatch = details.match(/ตัดสินโดย:\s*([^\n]+)/)
                    let oldNoteMatch = details.match(/หมายเหตุเดิม:\s*([^\n]+)/)
                    let reasonMatch = details.match(/เหตุผลในการยกเลิก:\s*([^\n]+)/)
                    let targetUserMatch = details.match(/ผู้ถูกรายงาน:\s*([^\n]+)/)
                    let reportIdMatch = details.match(/รหัสรายงาน:\s*([^\n]+)/)
                    let contentTypeMatch = details.match(/ประเภท:\s*([^\n]+)/)
                    
                    return {
                      contentType: contentTypeMatch?.[1]?.trim() || null,
                      reportId: reportIdMatch?.[1]?.trim() || null,
                      reason: reasonMatch?.[1]?.trim(),
                      adminNote: oldNoteMatch?.[1]?.trim() || reasonMatch?.[1]?.trim(),
                      violations: null,
                      duration: null,
                      bannedUntil: null,
                      oldStatus: statusMatch?.[1]?.trim(),
                      reviewedBy: reviewedByMatch?.[1]?.trim(),
                      targetUser: targetUserMatch?.[1]?.trim(),
                      isNewFormat: true,
                      actionType: 'reverse',
                      targetContent: null,
                      reporterName: null,
                      reporterEmail: null,
                      reportReason: null,
                      targetEmail: null
                    }
                  }
                }
                
                // Check for old English reverse format
                if (details.includes('Reversed decision from')) {
                  const oldStatusMatch = details.match(/Reversed decision from "([^"]+)"/)
                  const oldNoteMatch = details.match(/Old note:\s*([^.]+)\./)
                  const reasonMatch = details.match(/Reverse reason:\s*(.+)$/)
                  
                  return {
                    contentType: null,
                    reportId: null,
                    reason: reasonMatch?.[1]?.trim(),
                    adminNote: oldNoteMatch?.[1]?.trim(),
                    violations: null,
                    duration: null,
                    bannedUntil: null,
                    oldStatus: oldStatusMatch?.[1] === 'approved' ? '✅ ดำเนินการแล้ว' : 
                               oldStatusMatch?.[1] === 'rejected' ? '❌ ปฏิเสธรายงาน' : 
                               oldStatusMatch?.[1],
                    reviewedBy: null,
                    targetUser: null,
                    isNewFormat: true,
                    isOldEnglishFormat: true,
                    actionType: 'reverse'
                  }
                }
                
                // Check for old English reject format
                if (details.includes('Rejected report against')) {
                  const targetMatch = details.match(/against\s+([^:]+):/)
                  const noteMatch = details.match(/:\s*(.+)$/)
                  
                  return {
                    contentType: null,
                    targetUser: targetMatch?.[1]?.trim(),
                    reason: noteMatch?.[1]?.trim(),
                    actionType: 'reject',
                    isNewFormat: false,
                    isOldEnglishFormat: true
                  }
                }
                
                // Old format parsing
                const contentTypeMatch = details.match(/Deleted (comment|review)/)
                const reportMatch = details.match(/from report (\w+)/)
                const reasonMatch = details.match(/Reason: ([^.]+)/)
                const noteMatch = details.match(/Admin note: ([^.]+)/)
                const violationsMatch = details.match(/User violations: (\d+)/)
                const durationMatch = details.match(/for (\d+) days/)
                const bannedUntilMatch = details.match(/Banned until: (.+)$/)
                
                return {
                  contentType: contentTypeMatch?.[1],
                  reportId: reportMatch?.[1],
                  reason: reasonMatch?.[1],
                  adminNote: noteMatch?.[1],
                  violations: violationsMatch?.[1],
                  duration: durationMatch?.[1],
                  bannedUntil: bannedUntilMatch?.[1],
                  isNewFormat: false
                }
              }

              const parsed = parseDetails(selectedActivity.details)
              
              const getActionDescription = () => {
                if (parsed.isNewFormat && parsed.actionType === 'reverse') {
                  return `ยกเลิกการตัดสินเดิม (${parsed.oldStatus})`
                }
                
                if (selectedActivity.action === 'reject_report' || parsed.actionType === 'reject') {
                  const ct = parsed.contentType?.toLowerCase()
                  const contentTypeText = !ct ? 'ความคิดเห็น' :
                    (ct.includes('comment') || ct.includes('ความคิดเห็น')) ? 'ความคิดเห็น' :
                    (ct.includes('review') || ct.includes('รีวิว')) ? 'รีวิว' : 'ความคิดเห็น'
                  const targetUserName = parsed.targetUser || selectedActivity.targetName || 'ผู้ใช้'
                  return `ปฏิเสธรายงานเกี่ยวกับ${contentTypeText}ของ ${targetUserName}`
                }
                
                switch(selectedActivity.action) {
                  case 'delete_content':
                    const contentType = parsed.contentType === 'comment' ? 'ความคิดเห็น' : 'รีวิว'
                    return `ลบ${contentType}ของ ${selectedActivity.targetName || 'ผู้ใช้'}`
                  case 'ban_user':
                    return `แบนผู้ใช้ ${selectedActivity.targetName || 'ผู้ใช้'}`
                  case 'approve_report':
                    return `อนุมัติรายงานเกี่ยวกับ ${selectedActivity.targetName || 'ผู้ใช้'}`
                  case 'approve_shop':
                    return `อนุมัติร้านค้า ${parsed.shopName || selectedActivity.targetName || 'ร้านค้า'}`
                  case 'reject_shop':
                    return `ปฏิเสธร้านค้า ${parsed.shopName || selectedActivity.targetName || 'ร้านค้า'}`
                  case 'suspend_shop':
                    return `ระงับร้านค้า ${parsed.shopName || selectedActivity.targetName || 'ร้านค้า'}`
                  case 'unsuspend_shop':
                    return `ยกเลิกระงับร้านค้า ${parsed.shopName || selectedActivity.targetName || 'ร้านค้า'}`
                  case 'approve_reopen_request':
                    return `อนุมัติคำขอเปิดร้าน ${selectedActivity.targetName || 'ร้านค้า'}`
                  case 'reject_reopen_request':
                    return `ปฏิเสธคำขอเปิดร้าน ${selectedActivity.targetName || 'ร้านค้า'}`
                  case 'update_user_role':
                    return `เปลี่ยนบทบาทของ ${selectedActivity.targetName || 'ผู้ใช้'}`
                  case 'create_category':
                    return `สร้างหมวดหมู่ ${selectedActivity.targetName || ''}`.trim()
                  case 'update_category':
                    return `แก้ไขหมวดหมู่ ${selectedActivity.targetName || ''}`.trim()
                  case 'delete_category':
                    return `ลบหมวดหมู่ ${selectedActivity.targetName || ''}`.trim()
                  case 'create_game':
                    return `เพิ่มเกม ${selectedActivity.targetName || ''}`.trim()
                  case 'update_game':
                    return `แก้ไขเกม ${selectedActivity.targetName || ''}`.trim()
                  case 'delete_game':
                    return `ลบเกม ${selectedActivity.targetName || ''}`.trim()
                  case 'reorder_popular_games':
                    return 'จัดเรียงเกมยอดนิยม'
                  case 'process_report':
                    return `ดำเนินการรายงานเกี่ยวกับ ${selectedActivity.targetName || 'ผู้ใช้'}`
                  default:
                    return sanitizeVisibleText(selectedActivity.details)
                }
              }

              return (
                <div className="space-y-5 mt-4">
                  {/* Header Section with Badge & Time */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      {getActionBadge(selectedActivity.action)}
                      <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full">
                        📅 {selectedActivity.createdAt && format(new Date(selectedActivity.createdAt), 'dd MMM yyyy • HH:mm น.', { locale: th })}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {getActionDescription()}
                    </h3>
                  </div>

                  {/* Admin Info */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="bg-blue-600 p-2 rounded-lg">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-semibold text-blue-900">ผู้ดำเนินการ</span>
                    </div>
                    <div className="ml-10">
                      <p className="text-sm text-gray-900 font-medium">{selectedActivity.adminName || 'ผู้ใช้'}</p>
                      <p className="text-xs text-gray-600">{selectedActivity.adminEmail}</p>
                    </div>
                  </div>

                  {/* New Format - Show structured details */}
                  {parsed.isNewFormat ? (
                    <div className="space-y-4">
                      {/* ยกเลิกการตัดสิน */}
                      {parsed.actionType === 'reverse' && (
                        <>
                          <div className="bg-white p-5 rounded-xl border-l-4 border-blue-500 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                              <span className="text-2xl">🔄</span>
                              <h4 className="text-base font-bold text-gray-900">รายละเอียดการยกเลิก</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              {parsed.oldStatus && (
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  <span className="font-semibold text-gray-600 text-xs block mb-1">สถานะเดิม</span>
                                  <span className="text-gray-900 font-medium">{parsed.oldStatus}</span>
                                </div>
                              )}
                              {parsed.reviewedBy && (
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  <span className="font-semibold text-gray-600 text-xs block mb-1">ตัดสินโดย</span>
                                  <span className="text-gray-900 font-medium">{parsed.reviewedBy}</span>
                                </div>
                              )}
                              <div className="bg-gray-50 p-3 rounded-lg md:col-span-2">
                                <span className="font-semibold text-gray-600 text-xs block mb-1">ผู้ถูกรายงาน</span>
                                <span className="text-gray-900 font-medium">{parsed.targetUser || 'ผู้ใช้'}</span>
                              </div>
                              {parsed.contentType && (
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  <span className="font-semibold text-gray-600 text-xs block mb-1">ประเภทเนื้อหา</span>
                                  <span className="text-gray-900 font-medium">{parsed.contentType}</span>
                                </div>
                              )}
                              {parsed.adminNote && parsed.isOldEnglishFormat && (
                                <div className="bg-gray-50 p-3 rounded-lg md:col-span-2">
                                  <span className="font-semibold text-gray-600 text-xs block mb-1">หมายเหตุเดิม</span>
                                  <span className="text-gray-900">{parsed.adminNote}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {parsed.reason && (
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border border-green-200 shadow-sm">
                              <div className="flex items-start gap-3">
                                <span className="text-3xl">✅</span>
                                <div className="flex-1">
                                  <span className="text-xs font-bold text-green-700 uppercase block mb-2">
                                    เหตุผลในการยกเลิก
                                  </span>
                                  <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
                                    {parsed.reason}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-xl border border-blue-200 shadow-sm">
                            <p className="text-sm text-blue-900 leading-relaxed">
                              <strong className="font-bold">✨ ผลลัพธ์:</strong> การตัดสินถูกยกเลิก รายงานกลับสู่สถานะ "รอดำเนินการ" 
                              และจำนวนการละเมิดของผู้ใช้ถูกลดลง
                            </p>
                          </div>
                        </>
                      )}

                      {/* ปฏิเสธรายงาน */}
                      {parsed.actionType === 'reject' && (
                        <>
                          <div className="bg-white p-5 rounded-xl border-l-4 border-red-500 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                              <span className="text-2xl">❌</span>
                              <h4 className="text-base font-bold text-red-900">ข้อมูลรายงานที่ปฏิเสธ</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div className="bg-red-50 p-3 rounded-lg">
                                <span className="font-semibold text-gray-600 text-xs block mb-1">👤 ผู้ถูกรายงาน</span>
                                <span className="text-gray-900 font-medium">{parsed.targetUser || 'ผู้ใช้'}</span>
                                {parsed.targetEmail && (
                                  <p className="text-xs text-gray-600 mt-1">{parsed.targetEmail}</p>
                                )}
                              </div>
                              {parsed.contentType && (
                                <div className="bg-red-50 p-3 rounded-lg">
                                  <span className="font-semibold text-gray-600 text-xs block mb-1">📄 ประเภทเนื้อหา</span>
                                  <span className="text-gray-900 font-medium">{parsed.contentType}</span>
                                </div>
                              )}
                              <div className="bg-red-50 p-3 rounded-lg">
                                <span className="font-semibold text-gray-600 text-xs block mb-1">📢 รายงานโดย</span>
                                <span className="text-gray-900 font-medium">{parsed.reporterName || 'ผู้ใช้'}</span>
                                {parsed.reporterEmail && (
                                  <p className="text-xs text-gray-600 mt-1">{parsed.reporterEmail}</p>
                                )}
                              </div>
                              {parsed.reportReason && (
                                <div className="bg-red-50 p-3 rounded-lg">
                                  <span className="font-semibold text-gray-600 text-xs block mb-1">⚠️ เหตุผลที่รายงาน</span>
                                  <span className="text-gray-900">
                                    {parsed.reportReason === 'offensive' ? '😤 พูดจาหยาบคาย' :
                                     parsed.reportReason === 'spam' ? '📢 สแปม' :
                                     parsed.reportReason === 'inappropriate' ? '⚠️ เนื้อหาไม่เหมาะสม' :
                                     parsed.reportReason === 'scam' ? '🎭 หลอกลวง' :
                                     parsed.reportReason === 'harassment' ? '😡 คุกคาม' :
                                     parsed.reportReason === 'fake' ? '🤥 ข้อมูลเท็จ' :
                                     parsed.reportReason === 'copyright' ? '©️ ละเมิดลิขสิทธิ์' :
                                     parsed.reportReason === 'other' ? '📝 อื่นๆ' :
                                     parsed.reportReason}
                                  </span>
                                </div>
                              )}
                              {parsed.targetContent && (
                                <div className="bg-red-50 p-3 rounded-lg md:col-span-2">
                                  <span className="font-semibold text-gray-600 text-xs block mb-1">💬 เนื้อหาที่ถูกรายงาน</span>
                                  <p className="text-gray-900 italic leading-relaxed">&quot;{parsed.targetContent}&quot;</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {parsed.reason && (
                            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-5 rounded-xl border border-yellow-200 shadow-sm">
                              <div className="flex items-start gap-3">
                                <span className="text-3xl">📝</span>
                                <div className="flex-1">
                                  <span className="text-xs font-bold text-yellow-700 uppercase block mb-2">
                                    เหตุผลในการปฏิเสธ
                                  </span>
                                  <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
                                    {parsed.reason}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border border-green-200 shadow-sm">
                            <p className="text-sm text-green-900 leading-relaxed">
                              <strong className="font-bold">✅ ผลลัพธ์:</strong> รายงานถูกปฏิเสธ ผู้ใช้ที่ถูกรายงานไม่มีการดำเนินการใดๆ 
                              เนื้อหายังคงอยู่ตามเดิม
                            </p>
                          </div>
                        </>
                      )}

                      {/* Delete Content (New Format) */}
                      {parsed.actionType === 'delete_content' && (
                        <>
                          <div className="bg-white p-5 rounded-xl border-l-4 border-orange-500 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                              <span className="text-2xl">🗑️</span>
                              <h4 className="text-base font-bold text-orange-900">รายละเอียดการลบเนื้อหา</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div className="bg-orange-50 p-3 rounded-lg">
                                <span className="font-semibold text-gray-600 text-xs block mb-1">ประเภทเนื้อหา</span>
                                <span className="text-gray-900 font-medium">{parsed.contentType}</span>
                              </div>
                              <div className="bg-orange-50 p-3 rounded-lg">
                                <span className="font-semibold text-gray-600 text-xs block mb-1">เจ้าของเนื้อหา</span>
                                <span className="text-gray-900 font-medium">{(parsed as any).targetName || selectedActivity.targetName || 'ผู้ใช้'}</span>
                              </div>
                            </div>
                          </div>

                          {parsed.adminNote && (
                            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-5 rounded-xl border border-yellow-200 shadow-sm">
                              <div className="flex items-start gap-3">
                                <span className="text-3xl">📝</span>
                                <div className="flex-1">
                                  <span className="text-xs font-bold text-yellow-700 uppercase block mb-2">
                                    หมายเหตุจากแอดมิน
                                  </span>
                                  <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
                                    {parsed.adminNote}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="bg-gradient-to-br from-orange-50 to-red-50 p-5 rounded-xl border border-orange-200 shadow-sm">
                            <p className="text-sm text-orange-900 leading-relaxed">
                              <strong className="font-bold">🗑️ ผลลัพธ์:</strong> เนื้อหาถูกลบออกจากระบบถาวร 
                              และไม่สามารถกู้คืนได้
                            </p>
                          </div>
                        </>
                      )}

                      {/* Ban User (New Format) */}
                      {parsed.actionType === 'ban_user' && (
                        <>
                          <div className="bg-white p-5 rounded-xl border-l-4 border-red-600 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                              <span className="text-2xl">🚫</span>
                              <h4 className="text-base font-bold text-red-900">รายละเอียดการแบนผู้ใช้</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div className="bg-red-50 p-3 rounded-lg">
                                <span className="font-semibold text-gray-600 text-xs block mb-1">👤 ผู้ใช้ที่ถูกแบน</span>
                                <span className="text-gray-900 font-medium">{(parsed as any).targetName || selectedActivity.targetName || 'ผู้ใช้'}</span>
                              </div>
                              {(parsed as any).duration && (
                                <div className="bg-red-50 p-3 rounded-lg">
                                  <span className="font-semibold text-gray-600 text-xs block mb-1">⏱️ ระยะเวลาแบน</span>
                                  <span className="text-2xl font-bold text-red-600">{(parsed as any).duration}</span>
                                  <span className="text-sm text-gray-600 ml-1">วัน</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {parsed.adminNote && (
                            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-5 rounded-xl border border-yellow-200 shadow-sm">
                              <div className="flex items-start gap-3">
                                <span className="text-3xl">📝</span>
                                <div className="flex-1">
                                  <span className="text-xs font-bold text-yellow-700 uppercase block mb-2">
                                    หมายเหตุเพิ่มเติม
                                  </span>
                                  <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
                                    {parsed.adminNote}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="bg-gradient-to-br from-red-50 to-rose-50 p-5 rounded-xl border border-red-200 shadow-sm">
                            <p className="text-sm text-red-900 leading-relaxed">
                              <strong className="font-bold">🚫 ผลลัพธ์:</strong> ผู้ใช้ถูกระงับการใช้งาน 
                              {(parsed as any).duration ? `เป็นเวลา ${(parsed as any).duration} วัน` : 'ชั่วคราว'} 
                              และไม่สามารถเข้าถึงระบบได้
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Old Format / Other Actions - Styled Display */}
                      
                      {/* Delete Content Action */}
                      {selectedActivity.action === 'delete_content' && (
                        <>
                          <div className="bg-white p-5 rounded-xl border-l-4 border-orange-500 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                              <span className="text-2xl">🗑️</span>
                              <h4 className="text-base font-bold text-orange-900">รายละเอียดการลบเนื้อหา</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div className="bg-orange-50 p-3 rounded-lg">
                                <span className="font-semibold text-gray-600 text-xs block mb-1">ประเภทเนื้อหา</span>
                                <span className="text-gray-900 font-medium">
                                  {parsed.contentType === 'comment' ? 'ความคิดเห็น' : 'รีวิว'}
                                </span>
                              </div>
                              <div className="bg-orange-50 p-3 rounded-lg">
                                <span className="font-semibold text-gray-600 text-xs block mb-1">เจ้าของเนื้อหา</span>
                                <span className="text-gray-900 font-medium">{selectedActivity.targetName || 'ผู้ใช้'}</span>
                              </div>
                            </div>
                          </div>

                          {parsed.reason && (
                            <div className="bg-gradient-to-br from-red-50 to-rose-50 p-5 rounded-xl border border-red-200 shadow-sm">
                              <div className="flex items-start gap-3">
                                <span className="text-3xl">⚠️</span>
                                <div className="flex-1">
                                  <span className="text-xs font-bold text-red-700 uppercase block mb-2">
                                    เหตุผลในการลบ
                                  </span>
                                  <p className="text-sm text-gray-900 leading-relaxed">
                                    {parsed.reason === 'offensive' ? '❌ พูดจาหยาบคาย' :
                                     parsed.reason === 'spam' ? '📢 สแปม' :
                                     parsed.reason === 'inappropriate' ? '⚠️ เนื้อหาไม่เหมาะสม' :
                                     parsed.reason === 'scam' ? '🎭 หลอกลวง' :
                                     parsed.reason}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {parsed.adminNote && (
                            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-5 rounded-xl border border-yellow-200 shadow-sm">
                              <div className="flex items-start gap-3">
                                <span className="text-3xl">📝</span>
                                <div className="flex-1">
                                  <span className="text-xs font-bold text-yellow-700 uppercase block mb-2">
                                    หมายเหตุจากแอดมิน
                                  </span>
                                  <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
                                    {parsed.adminNote}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="bg-gradient-to-br from-orange-50 to-red-50 p-5 rounded-xl border border-orange-200 shadow-sm">
                            <p className="text-sm text-orange-900 leading-relaxed">
                              <strong className="font-bold">🗑️ ผลลัพธ์:</strong> เนื้อหาถูกลบออกจากระบบถาวร 
                              และไม่สามารถกู้คืนได้
                            </p>
                          </div>
                        </>
                      )}

                      {/* Ban User Action */}
                      {selectedActivity.action === 'ban_user' && (
                        <>
                          <div className="bg-white p-5 rounded-xl border-l-4 border-red-600 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                              <span className="text-2xl">🚫</span>
                              <h4 className="text-base font-bold text-red-900">รายละเอียดการแบนผู้ใช้</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div className="bg-red-50 p-3 rounded-lg">
                                <span className="font-semibold text-gray-600 text-xs block mb-1">👤 ผู้ใช้ที่ถูกแบน</span>
                                <span className="text-gray-900 font-medium">{selectedActivity.targetName || 'ผู้ใช้'}</span>
                              </div>
                              {parsed.violations && (
                                <div className="bg-red-50 p-3 rounded-lg">
                                  <span className="font-semibold text-gray-600 text-xs block mb-1">📊 จำนวนการละเมิด</span>
                                  <span className="text-2xl font-bold text-red-600">{parsed.violations}</span>
                                  <span className="text-sm text-gray-600 ml-1">ครั้ง</span>
                                </div>
                              )}
                              {parsed.duration && (
                                <div className="bg-red-50 p-3 rounded-lg">
                                  <span className="font-semibold text-gray-600 text-xs block mb-1">⏱️ ระยะเวลาแบน</span>
                                  <span className="text-2xl font-bold text-red-600">{parsed.duration}</span>
                                  <span className="text-sm text-gray-600 ml-1">วัน</span>
                                </div>
                              )}
                              {parsed.bannedUntil && (
                                <div className="bg-red-50 p-3 rounded-lg">
                                  <span className="font-semibold text-gray-600 text-xs block mb-1">📅 แบนจนถึง</span>
                                  <span className="text-gray-900 font-medium">{parsed.bannedUntil}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {parsed.reason && (
                            <div className="bg-gradient-to-br from-red-50 to-rose-50 p-5 rounded-xl border border-red-200 shadow-sm">
                              <div className="flex items-start gap-3">
                                <span className="text-3xl">⚠️</span>
                                <div className="flex-1">
                                  <span className="text-xs font-bold text-red-700 uppercase block mb-2">
                                    เหตุผลในการแบน
                                  </span>
                                  <p className="text-sm text-gray-900 leading-relaxed">
                                    {parsed.reason === 'offensive' ? '😤 พูดจาหยาบคาย' :
                                     parsed.reason === 'spam' ? '📢 สแปม' :
                                     parsed.reason === 'inappropriate' ? '⚠️ เนื้อหาไม่เหมาะสม' :
                                     parsed.reason === 'scam' ? '🎭 หลอกลวง' :
                                     parsed.reason}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {parsed.adminNote && (
                            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-5 rounded-xl border border-yellow-200 shadow-sm">
                              <div className="flex items-start gap-3">
                                <span className="text-3xl">📝</span>
                                <div className="flex-1">
                                  <span className="text-xs font-bold text-yellow-700 uppercase block mb-2">
                                    หมายเหตุเพิ่มเติม
                                  </span>
                                  <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
                                    {parsed.adminNote}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="bg-gradient-to-br from-red-50 to-rose-50 p-5 rounded-xl border border-red-200 shadow-sm">
                            <p className="text-sm text-red-900 leading-relaxed">
                              <strong className="font-bold">🚫 ผลลัพธ์:</strong> ผู้ใช้ถูกระงับการใช้งาน 
                              {parsed.duration ? `เป็นเวลา ${parsed.duration} วัน` : 'ชั่วคราว'} 
                              และไม่สามารถเข้าถึงระบบได้
                            </p>
                          </div>
                        </>
                      )}

                      {/* Approve Report Action */}
                      {selectedActivity.action === 'approve_report' && (
                        <>
                          <div className="bg-white p-5 rounded-xl border-l-4 border-green-500 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                              <span className="text-2xl">✅</span>
                              <h4 className="text-base font-bold text-green-900">รายละเอียดการอนุมัติรายงาน</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div className="bg-green-50 p-3 rounded-lg">
                                <span className="font-semibold text-gray-600 text-xs block mb-1">👤 เกี่ยวกับผู้ใช้</span>
                                <span className="text-gray-900 font-medium">{selectedActivity.targetName || 'ผู้ใช้'}</span>
                              </div>
                            </div>
                          </div>

                          {parsed.adminNote && (
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border border-green-200 shadow-sm">
                              <div className="flex items-start gap-3">
                                <span className="text-3xl">📝</span>
                                <div className="flex-1">
                                  <span className="text-xs font-bold text-green-700 uppercase block mb-2">
                                    หมายเหตุจากแอดมิน
                                  </span>
                                  <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
                                    {parsed.adminNote}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border border-green-200 shadow-sm">
                            <p className="text-sm text-green-900 leading-relaxed">
                              <strong className="font-bold">✅ ผลลัพธ์:</strong> รายงานได้รับการพิจารณาและอนุมัติแล้ว 
                              ดำเนินการตามขั้นตอนเรียบร้อย
                            </p>
                          </div>
                        </>
                      )}

                      {/* Approve/Reject Shop Actions */}
                      {(selectedActivity.action === 'approve_shop' || selectedActivity.action === 'reject_shop') && (
                        <>
                          <div className={`bg-white p-5 rounded-xl border-l-4 ${
                            selectedActivity.action === 'approve_shop' ? 'border-blue-500' : 'border-gray-500'
                          } shadow-sm`}>
                            <div className="flex items-center gap-2 mb-4">
                              <span className="text-2xl">
                                {selectedActivity.action === 'approve_shop' ? '🏪' : '❌'}
                              </span>
                              <h4 className={`text-base font-bold ${
                                selectedActivity.action === 'approve_shop' ? 'text-blue-900' : 'text-gray-900'
                              }`}>
                                {selectedActivity.action === 'approve_shop' ? 'อนุมัติร้านค้า' : 'ปฏิเสธร้านค้า'}
                              </h4>
                            </div>
                            <div className="grid grid-cols-1 gap-3 text-sm">
                              <div className={`${
                                selectedActivity.action === 'approve_shop' ? 'bg-blue-50' : 'bg-gray-50'
                              } p-3 rounded-lg`}>
                                <span className="font-semibold text-gray-600 text-xs block mb-1">🏪 ชื่อร้านค้า</span>
                                <span className="text-gray-900 font-medium">{parsed.shopName || selectedActivity.targetName || 'ร้านค้า'}</span>
                              </div>
                            </div>
                          </div>

                          <div className={`bg-gradient-to-br ${
                            selectedActivity.action === 'approve_shop' 
                              ? 'from-blue-50 to-indigo-50 border-blue-200' 
                              : 'from-gray-50 to-slate-50 border-gray-200'
                          } p-5 rounded-xl border shadow-sm`}>
                            <p className={`text-sm ${
                              selectedActivity.action === 'approve_shop' ? 'text-blue-900' : 'text-gray-900'
                            } leading-relaxed`}>
                              <strong className="font-bold">
                                {selectedActivity.action === 'approve_shop' ? '✅ ผลลัพธ์:' : '❌ ผลลัพธ์:'}
                              </strong>{' '}
                              {selectedActivity.action === 'approve_shop' 
                                ? 'ร้านค้าได้รับการอนุมัติและสามารถเริ่มขายสินค้าได้แล้ว'
                                : 'คำขอเปิดร้านค้าถูกปฏิเสธ'
                              }
                            </p>
                          </div>
                        </>
                      )}

                      {/* Suspend/Unsuspend Shop Actions */}
                      {(selectedActivity.action === 'suspend_shop' || selectedActivity.action === 'unsuspend_shop') && (
                        <>
                          <div className={`bg-white p-5 rounded-xl border-l-4 ${
                            selectedActivity.action === 'suspend_shop' ? 'border-orange-500' : 'border-green-500'
                          } shadow-sm`}>
                            <div className="flex items-center gap-2 mb-4">
                              <span className="text-2xl">
                                {selectedActivity.action === 'suspend_shop' ? '⏸️' : '▶️'}
                              </span>
                              <h4 className={`text-base font-bold ${
                                selectedActivity.action === 'suspend_shop' ? 'text-orange-900' : 'text-green-900'
                              }`}>
                                {selectedActivity.action === 'suspend_shop' ? 'ระงับร้านค้า' : 'ยกเลิกระงับร้านค้า'}
                              </h4>
                            </div>
                            <div className="grid grid-cols-1 gap-3 text-sm">
                              <div className={`${
                                selectedActivity.action === 'suspend_shop' ? 'bg-orange-50' : 'bg-green-50'
                              } p-3 rounded-lg`}>
                                <span className="font-semibold text-gray-600 text-xs block mb-1">🏪 ชื่อร้านค้า</span>
                                <span className="text-gray-900 font-medium">{parsed.shopName || selectedActivity.targetName || 'ร้านค้า'}</span>
                              </div>
                              {parsed.reason && selectedActivity.action === 'suspend_shop' && (
                                <div className="bg-orange-50 p-3 rounded-lg">
                                  <span className="font-semibold text-gray-600 text-xs block mb-1">📝 เหตุผล</span>
                                  <span className="text-gray-900 font-medium whitespace-pre-wrap">{parsed.reason}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className={`bg-gradient-to-br ${
                            selectedActivity.action === 'suspend_shop'
                              ? 'from-orange-50 to-amber-50 border-orange-200'
                              : 'from-green-50 to-emerald-50 border-green-200'
                          } p-5 rounded-xl border shadow-sm`}>
                            <p className={`text-sm ${
                              selectedActivity.action === 'suspend_shop' ? 'text-orange-900' : 'text-green-900'
                            } leading-relaxed`}>
                              <strong className="font-bold">
                                {selectedActivity.action === 'suspend_shop' ? '⏸️ ผลลัพธ์:' : '▶️ ผลลัพธ์:'}
                              </strong>{' '}
                              {selectedActivity.action === 'suspend_shop'
                                ? 'ร้านค้าถูกระงับชั่วคราวและไม่สามารถขายสินค้าได้'
                                : 'ร้านค้ากลับมาเปิดขายได้ตามปกติ'
                              }
                            </p>
                          </div>
                        </>
                      )}

                      {/* Fallback for Unknown Actions */}
                      {![
                        'delete_content',
                        'ban_user',
                        'approve_report',
                        'reject_report',
                        'reverse_report_decision',
                        'approve_shop',
                        'reject_shop',
                        'suspend_shop',
                        'unsuspend_shop'
                      ].includes(selectedActivity.action) && (
                        <div className={`bg-gradient-to-r ${getActionTheme(selectedActivity.action).headerBg} p-5 rounded-xl border ${getActionTheme(selectedActivity.action).borderClass} shadow-sm`}>
                          <p className="text-base font-semibold text-gray-900 mb-2">
                            {getActionIconEmoji(selectedActivity.action)} {getActionDescription()}
                          </p>
                          {sanitizeVisibleText(selectedActivity.details) && (
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {sanitizeVisibleText(selectedActivity.details)}
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })()}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
