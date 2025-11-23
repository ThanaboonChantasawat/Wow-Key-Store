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

  useEffect(() => {
    if (!user) return
    fetchActivities()
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
    setIsLoading(true)
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
      alert(`ไม่สามารถโหลดประวัติได้: ${error.message}`)
    } finally {
      setIsLoading(false)
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
      default:
        return <Shield className="w-4 h-4 text-blue-600" />
    }
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'ban_user':
        return <Badge className="bg-red-600">🚫 แบนผู้ใช้</Badge>
      case 'delete_content':
        return <Badge className="bg-orange-600">🗑️ ลบเนื้อหา</Badge>
      case 'reverse_report_decision':
        return <Badge className="bg-blue-600">🔄 ยกเลิกการตัดสิน</Badge>
      case 'approve_report':
        return <Badge className="bg-green-600">✅ อนุมัติรายงาน</Badge>
      case 'reject_report':
        return <Badge className="bg-red-500">❌ ปฏิเสธรายงาน</Badge>
      case 'approve_shop':
        return <Badge className="bg-blue-600">อนุมัติร้านค้า</Badge>
      case 'reject_shop':
        return <Badge className="bg-gray-600">ปฏิเสธร้านค้า</Badge>
      default:
        return <Badge variant="outline">{action}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#ff9800] mx-auto mb-4"></div>
        <p className="text-gray-600">กำลังโหลดประวัติ...</p>
      </div>
    )
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
              // Check for new Thai format (มี emoji และ section headers)
              if (details.includes('🔄') || details.includes('📌') || details.includes('🔍') || details.includes('❌')) {
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
                const userInfo = parsed.targetUser ? ` ของ ${parsed.targetUser}` : ''
                return `ยกเลิกการตัดสินเดิม${userInfo}`
              }
              
              if (activity.action === 'reject_report') {
                const ct = parsed.contentType?.toLowerCase()
                const contentTypeText = !ct ? 'ความคิดเห็น' :
                  (ct.includes('comment') || ct.includes('ความคิดเห็น')) ? 'ความคิดเห็น' :
                  (ct.includes('review') || ct.includes('รีวิว')) ? 'รีวิว' : 'ความคิดเห็น'
                const targetUserName = parsed.targetUser || activity.targetName
                
                // แสดงแค่ข้อมูลหลักสั้นๆ
                let description = `ปฏิเสธรายงาน${contentTypeText}ของ ${targetUserName}`               
                
                return description
              }
              
              switch(activity.action) {
                case 'delete_content':
                  const contentType = parsed.contentType === 'comment' ? 'ความคิดเห็น' : 'รีวิว'
                  return `ลบ${contentType}ของ ${activity.targetName}`
                case 'ban_user':
                  return `แบนผู้ใช้ ${activity.targetName}${parsed.duration ? ` (${parsed.duration} วัน)` : ''}`
                case 'approve_report':
                  return `อนุมัติรายงานเกี่ยวกับ ${activity.targetName}`
                case 'approve_shop':
                  return `อนุมัติร้านค้า ${activity.targetName}`
                case 'reject_shop':
                  return `ปฏิเสธร้านค้า ${activity.targetName}`
                default:
                  return activity.details
              }
            }

            const getActionIconEmoji = (action: string) => {
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

            const getThaiActionName = () => {
              switch(activity.action) {
                case 'delete_content':
                  return 'ลบเนื้อหา'
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
                onClick={() => {
                  setSelectedActivity(activity)
                  setShowModal(true)
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
                      <span className="text-xl">{getActionIconEmoji(activity.action)}</span>
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
                      <span className="font-medium">{activity.adminName}</span>
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
              const parseDetails = (details: string) => {
                // Check for new Thai format (มี emoji และ section headers)
                if (details.includes('🔄') || details.includes('📌') || details.includes('🔍') || details.includes('❌')) {
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
                  const targetUserName = parsed.targetUser || selectedActivity.targetName
                  return `ปฏิเสธรายงานเกี่ยวกับ${contentTypeText}ของ ${targetUserName}`
                }
                
                switch(selectedActivity.action) {
                  case 'delete_content':
                    const contentType = parsed.contentType === 'comment' ? 'ความคิดเห็น' : 'รีวิว'
                    return `ลบ${contentType}ของ ${selectedActivity.targetName}`
                  case 'ban_user':
                    return `แบนผู้ใช้ ${selectedActivity.targetName}`
                  case 'approve_report':
                    return `อนุมัติรายงานเกี่ยวกับ ${selectedActivity.targetName}`
                  case 'approve_shop':
                    return `อนุมัติร้านค้า ${selectedActivity.targetName}`
                  case 'reject_shop':
                    return `ปฏิเสธร้านค้า ${selectedActivity.targetName}`
                  default:
                    return selectedActivity.details
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
                      <p className="text-sm text-gray-900 font-medium">{selectedActivity.adminName}</p>
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
                              {parsed.targetUser && (
                                <div className="bg-gray-50 p-3 rounded-lg md:col-span-2">
                                  <span className="font-semibold text-gray-600 text-xs block mb-1">ผู้ถูกรายงาน</span>
                                  <span className="text-gray-900 font-medium">{parsed.targetUser}</span>
                                </div>
                              )}
                              {parsed.contentType && (
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  <span className="font-semibold text-gray-600 text-xs block mb-1">ประเภทเนื้อหา</span>
                                  <span className="text-gray-900 font-medium">{parsed.contentType}</span>
                                </div>
                              )}
                              {parsed.reportId && (
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  <span className="font-semibold text-gray-600 text-xs block mb-1">รหัสรายงาน</span>
                                  <code className="text-gray-900 text-xs bg-white px-2 py-1 rounded font-mono">{parsed.reportId}</code>
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
                              {parsed.targetUser && (
                                <div className="bg-red-50 p-3 rounded-lg">
                                  <span className="font-semibold text-gray-600 text-xs block mb-1">👤 ผู้ถูกรายงาน</span>
                                  <span className="text-gray-900 font-medium">{parsed.targetUser}</span>
                                  {parsed.targetEmail && (
                                    <p className="text-xs text-gray-600 mt-1">{parsed.targetEmail}</p>
                                  )}
                                </div>
                              )}
                              {parsed.contentType && (
                                <div className="bg-red-50 p-3 rounded-lg">
                                  <span className="font-semibold text-gray-600 text-xs block mb-1">📄 ประเภทเนื้อหา</span>
                                  <span className="text-gray-900 font-medium">{parsed.contentType}</span>
                                </div>
                              )}
                              {parsed.reporterName && (
                                <div className="bg-red-50 p-3 rounded-lg">
                                  <span className="font-semibold text-gray-600 text-xs block mb-1">📢 รายงานโดย</span>
                                  <span className="text-gray-900 font-medium">{parsed.reporterName}</span>
                                  {parsed.reporterEmail && (
                                    <p className="text-xs text-gray-600 mt-1">{parsed.reporterEmail}</p>
                                  )}
                                </div>
                              )}
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
                              {parsed.reportId && (
                                <div className="bg-red-50 p-3 rounded-lg md:col-span-2">
                                  <span className="font-semibold text-gray-600 text-xs block mb-1">🆔 รหัสรายงาน</span>
                                  <code className="text-gray-900 text-xs bg-white px-2 py-1 rounded font-mono">{parsed.reportId}</code>
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
                                <span className="text-gray-900 font-medium">{selectedActivity.targetName}</span>
                              </div>
                              {parsed.reportId && (
                                <div className="bg-orange-50 p-3 rounded-lg md:col-span-2">
                                  <span className="font-semibold text-gray-600 text-xs block mb-1">รหัสรายงาน</span>
                                  <code className="text-gray-900 text-xs bg-white px-2 py-1 rounded">{parsed.reportId}</code>
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
                                <span className="text-gray-900 font-medium">{selectedActivity.targetName}</span>
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
                                <span className="text-gray-900 font-medium">{selectedActivity.targetName}</span>
                              </div>
                              {parsed.reportId && (
                                <div className="bg-green-50 p-3 rounded-lg">
                                  <span className="font-semibold text-gray-600 text-xs block mb-1">รหัสรายงาน</span>
                                  <code className="text-gray-900 text-xs bg-white px-2 py-1 rounded">{parsed.reportId}</code>
                                </div>
                              )}
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
                                <span className="text-gray-900 font-medium">{selectedActivity.targetName}</span>
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

                      {/* Fallback for Unknown Actions */}
                      {!['delete_content', 'ban_user', 'approve_report', 'approve_shop', 'reject_shop'].includes(selectedActivity.action) && (
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm">
                          <p className="text-base font-semibold text-gray-900 mb-2">
                            📋 {getActionDescription()}
                          </p>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">
                            {selectedActivity.details}
                          </p>
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
