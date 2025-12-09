'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Star, 
  MessageSquare, 
  ExternalLink,
  Flag,
  ChevronRight,
  Search,
  Trash2,
  Ban
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { th } from 'date-fns/locale'
import Link from 'next/link'

interface Report {
  id: string
  reporterId: string
  reporterName: string
  targetType: 'review' | 'comment'
  targetId: string
  targetUserId: string
  targetUserName: string
  targetUserImage?: string | null
  targetContent: string
  productId?: string | null
  productName?: string | null
  productImage?: string | null
  shopId?: string | null
  shopName?: string | null
  shopImage?: string | null
  shopOwnerId?: string | null
  reason: string
  description: string
  status: 'pending' | 'reviewed' | 'resolved' | 'rejected'
  createdAt: Date
  reviewedAt?: Date
  updatedAt?: Date
  reviewedBy?: string
  adminNote?: string
  actionTaken?: 'approve' | 'reject' | 'delete' | 'ban'
}

export function MyReportsContent() {
  const { user } = useAuth()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved' | 'rejected'>('all')

  useEffect(() => {
    console.log('🚀 MyReportsContent mounted, user:', user?.uid || 'no user')
    if (!user) {
      console.log('⏳ Waiting for user to be authenticated...')
      return
    }
    console.log('✅ User authenticated, fetching reports...')
    fetchReports()
  }, [user])

  const fetchReports = async () => {
    if (!user) return

    try {
      console.log('🔍 Fetching reports for user:', user.uid)
      const response = await fetch(`/api/reports/my-reports?userId=${user.uid}`)
      console.log('📡 Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('📦 Reports data:', data.reports)
        
        const reportsWithDates = data.reports.map((r: any) => {
          console.log('🖼️ Report images:', {
            id: r.id,
            productImage: r.productImage,
            shopImage: r.shopImage,
            targetUserImage: r.targetUserImage
          })
          return {
            ...r,
            createdAt: new Date(r.createdAt),
            reviewedAt: r.reviewedAt ? new Date(r.reviewedAt) : undefined
          }
        })
        setReports(reportsWithDates)
      } else {
        console.error('❌ Failed to fetch reports:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionDetails = (status: string, adminNote?: string, actionTaken?: string) => {
    if (status === 'resolved' || status === 'approved') {
      // Check explicit actionTaken first
      if (actionTaken === 'delete') {
        return { type: 'deleted', label: 'ลบเนื้อหา', icon: Trash2, color: 'text-orange-600', badge: 'bg-orange-100 text-orange-800 border-orange-200' }
      }
      if (actionTaken === 'ban') {
        return { type: 'banned', label: 'แบนผู้ใช้', icon: Ban, color: 'text-red-600', badge: 'bg-red-100 text-red-800 border-red-200' }
      }
      if (actionTaken === 'approve') {
        return { type: 'approved', label: 'อนุมัติรายงาน', icon: CheckCircle2, color: 'text-green-600', badge: 'bg-green-100 text-green-800 border-green-200' }
      }

      // Fallback to parsing adminNote
      if (adminNote) {
        if (adminNote.includes('Deleted') || adminNote.includes('ลบ') || adminNote.includes('เนื้อหาถูกลบ')) {
           return { type: 'deleted', label: 'ลบเนื้อหา', icon: Trash2, color: 'text-orange-600', badge: 'bg-orange-100 text-orange-800 border-orange-200' }
        }
        if (adminNote.includes('Banned') || adminNote.includes('แบน') || adminNote.includes('ผู้ใช้ถูกแบน')) {
           return { type: 'banned', label: 'แบนผู้ใช้', icon: Ban, color: 'text-red-600', badge: 'bg-red-100 text-red-800 border-red-200' }
        }
      }
      return { type: 'approved', label: 'อนุมัติรายงาน', icon: CheckCircle2, color: 'text-green-600', badge: 'bg-green-100 text-green-800 border-green-200' }
    }
    if (status === 'rejected') {
       return { type: 'rejected', label: 'ปฏิเสธรายงาน', icon: XCircle, color: 'text-red-600', badge: 'bg-red-100 text-red-800 border-red-200' }
    }
    return null
  }

  const getStatusInfo = (status: string, adminNote?: string, actionTaken?: string) => {
    switch (status) {
      case 'pending':
        return {
          label: 'รอดำเนินการ',
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          badgeColor: 'bg-yellow-100 text-yellow-800'
        }
      case 'reviewed':
        return {
          label: 'กำลังตรวจสอบ',
          icon: Search,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          badgeColor: 'bg-blue-100 text-blue-800'
        }
      case 'resolved':
      case 'approved':
        const action = getActionDetails(status, adminNote, actionTaken)
        if (action) {
          return {
            label: action.type !== 'approved' ? `ดำเนินการแล้ว (${action.label})` : 'ดำเนินการแล้ว',
            icon: action.icon,
            color: action.color,
            bgColor: action.type === 'approved' ? 'bg-green-50' : (action.type === 'deleted' ? 'bg-orange-50' : 'bg-red-50'),
            borderColor: action.type === 'approved' ? 'border-green-200' : (action.type === 'deleted' ? 'border-orange-200' : 'border-red-200'),
            badgeColor: action.badge
          }
        }
        return {
          label: 'ดำเนินการแล้ว',
          icon: CheckCircle2,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          badgeColor: 'bg-green-100 text-green-800'
        }
      case 'rejected':
        return {
          label: 'ปิดรายงาน',
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          badgeColor: 'bg-red-100 text-red-800'
        }
      default:
        return {
          label: status,
          icon: AlertCircle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          badgeColor: 'bg-gray-100 text-gray-800'
        }
    }
  }

  const getReportedTypeIcon = (type: string) => {
    switch (type) {
      case 'review':
        return <Star className="w-5 h-5 text-yellow-500" />
      case 'comment':
        return <MessageSquare className="w-5 h-5 text-blue-500" />
      default:
        return <Flag className="w-5 h-5 text-orange-500" />
    }
  }

  const getReportedTypeLabel = (type: string) => {
    switch (type) {
      case 'review':
        return 'รีวิว'
      case 'comment':
        return 'ความคิดเห็น'
      default:
        return type
    }
  }

  const getReasonText = (reason: string) => {
    const reasons: Record<string, string> = {
      spam: 'สแปม/โฆษณา',
      offensive: 'คำหยาบ/ไม่เหมาะสม',
      fake: 'รีวิวปลอม/ข้อมูลเท็จ',
      misinformation: 'ข้อมูลเท็จ',
      'false-information': 'ข้อมูลเท็จ',
      inappropriate: 'ไม่เหมาะสม',
      harassment: 'ล่วงละเมิด/คุกคาม',
      other: 'อื่นๆ',
    }
    return reasons[reason] || reason
  }

  const filteredReports = filter === 'all' 
    ? reports 
    : reports.filter(r => {
        if (filter === 'resolved') {
          return r.status === 'resolved' || r.status === 'approved'
        }
        return r.status === filter
      })

  const getFilterCount = (status: 'all' | 'pending' | 'reviewed' | 'resolved' | 'rejected') => {
    if (status === 'all') return reports.length
    if (status === 'resolved') {
      return reports.filter(r => r.status === 'resolved' || r.status === 'approved').length
    }
    return reports.filter(r => r.status === status).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#ff9800] mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header Card with Gradient */}
      <div className="bg-gradient-to-r from-orange-500 via-[#ff9800] to-red-500 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
        <div className="relative z-10">
          <h2 className="text-4xl font-bold mb-2 drop-shadow-lg flex items-center gap-3">
            <Flag className="w-10 h-10" />
            รายงาน
          </h2>
          <p className="text-white/90 text-lg">
            ติดตามสถานะและประวัติการรายงานของคุณ
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card 
          className={`p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${filter === 'all' ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-500 ring-offset-2' : 'bg-white border-transparent hover:border-orange-200'}`}
          onClick={() => setFilter('all')}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${filter === 'all' ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${filter === 'all' ? 'text-orange-900' : 'text-gray-900'}`}>{getFilterCount('all')}</div>
              <div className={`text-xs sm:text-sm font-medium truncate ${filter === 'all' ? 'text-orange-700' : 'text-gray-500'}`}>ทั้งหมด</div>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${filter === 'pending' ? 'bg-yellow-50 border-yellow-500 ring-2 ring-yellow-500 ring-offset-2' : 'bg-white border-transparent hover:border-yellow-200'}`}
          onClick={() => setFilter('pending')}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${filter === 'pending' ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${filter === 'pending' ? 'text-yellow-900' : 'text-gray-900'}`}>{getFilterCount('pending')}</div>
              <div className={`text-xs sm:text-sm font-medium truncate ${filter === 'pending' ? 'text-yellow-700' : 'text-gray-500'}`}>รอดำเนินการ</div>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${filter === 'reviewed' ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500 ring-offset-2' : 'bg-white border-transparent hover:border-blue-200'}`}
          onClick={() => setFilter('reviewed')}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${filter === 'reviewed' ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <Search className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${filter === 'reviewed' ? 'text-blue-900' : 'text-gray-900'}`}>{getFilterCount('reviewed')}</div>
              <div className={`text-xs sm:text-sm font-medium truncate ${filter === 'reviewed' ? 'text-blue-700' : 'text-gray-500'}`}>กำลังตรวจสอบ</div>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${filter === 'resolved' ? 'bg-green-50 border-green-500 ring-2 ring-green-500 ring-offset-2' : 'bg-white border-transparent hover:border-green-200'}`}
          onClick={() => setFilter('resolved')}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${filter === 'resolved' ? 'bg-gradient-to-br from-green-500 to-green-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${filter === 'resolved' ? 'text-green-900' : 'text-gray-900'}`}>{getFilterCount('resolved')}</div>
              <div className={`text-xs sm:text-sm font-medium truncate ${filter === 'resolved' ? 'text-green-700' : 'text-gray-500'}`}>ดำเนินการแล้ว</div>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${filter === 'rejected' ? 'bg-red-50 border-red-500 ring-2 ring-red-500 ring-offset-2' : 'bg-white border-transparent hover:border-red-200'}`}
          onClick={() => setFilter('rejected')}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${filter === 'rejected' ? 'bg-gradient-to-br from-red-500 to-red-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <XCircle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${filter === 'rejected' ? 'text-red-900' : 'text-gray-900'}`}>{getFilterCount('rejected')}</div>
              <div className={`text-xs sm:text-sm font-medium truncate ${filter === 'rejected' ? 'text-red-700' : 'text-gray-500'}`}>ปิดรายงาน</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-[#292d32] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#ff9800]" />
            รายการรายงาน ({filteredReports.length})
          </h3>
        </div>

        {filteredReports.length === 0 ? (
          <Card className="border-dashed border-2 border-gray-200 bg-gray-50/50">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">ไม่พบรายงาน</h3>
              <p className="text-gray-500">
                {filter === 'all' 
                  ? 'คุณยังไม่มีประวัติการรายงานในระบบ' 
                  : `ไม่มีรายงานที่มีสถานะ "${getStatusInfo(filter).label}"`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredReports.map((report) => {
              const statusInfo = getStatusInfo(report.status, report.adminNote, report.actionTaken)
              const StatusIcon = statusInfo.icon

              return (
                <Card 
                  key={report.id} 
                  className="group hover:shadow-lg transition-all duration-200 border-l-4 overflow-hidden"
                  style={{ borderLeftColor: 
                    report.status === 'pending' ? '#eab308' :
                    report.status === 'reviewed' ? '#3b82f6' :
                    report.status === 'rejected' ? '#ef4444' :
                    (statusInfo.color.includes('orange') ? '#f97316' : 
                     statusInfo.color.includes('red') ? '#ef4444' : '#22c55e')
                  }}
                >
                  <CardContent className="p-0">
                    <div className="p-6">
                      <div className="flex flex-col md:flex-row md:items-start gap-6">
                        {/* Product/Shop Image */}
                        {(report.productImage || report.shopImage) && (
                          <div className="flex-shrink-0">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border-2 border-gray-200 shadow-md">
                              <img
                                src={report.productImage || report.shopImage || '/placeholder.png'}
                                alt={report.productName || report.shopName || 'รูปภาพ'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder.png'
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Icon & Type (show only if no image) */}
                        {!report.productImage && !report.shopImage && (
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                              {getReportedTypeIcon(report.targetType)}
                            </div>
                          </div>
                        )}

                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                              <Badge className={`${statusInfo.badgeColor} border-0 px-3 py-1`}>
                                <StatusIcon className="w-3 h-3 mr-1.5" />
                                {statusInfo.label}
                              </Badge>
                              <span className="text-sm text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDistanceToNow(report.createdAt, { addSuffix: true, locale: th })}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                {report.targetUserImage && (
                                  <img
                                    src={report.targetUserImage}
                                    alt={report.targetUserName}
                                    className="w-6 h-6 rounded-full border border-gray-300"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                )}
                                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                  รายงาน{getReportedTypeLabel(report.targetType)}
                                  <span className="font-normal text-gray-500">ของ</span>
                                  <span className="text-[#ff9800]">{report.targetUserName}</span>
                                </h4>
                              </div>
                              
                              {(report.productName || report.shopName) && (
                                <div className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                                  <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium">
                                    {report.productName ? '📦 สินค้า' : '🏪 ร้านค้า'}
                                  </span>
                                  <span className="font-medium">{report.productName || report.shopName}</span>
                                </div>
                              )}
                            </div>

                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                              <div className="flex items-start gap-2">
                                <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-gray-600 italic line-clamp-2">
                                  "{report.targetContent}"
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-y-2 gap-x-6 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-700">เหตุผล:</span>
                                <span className="text-gray-600">{getReasonText(report.reason)}</span>
                              </div>
                              {report.description && (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-700">รายละเอียด:</span>
                                  <span className="text-gray-600">{report.description}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Admin Response Section */}
                          {report.adminNote && (
                            <div className={`mt-4 ${statusInfo.bgColor} border ${statusInfo.borderColor} rounded-xl p-4`}>
                              <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-white/60">
                                  <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                                </div>
                                <div>
                                  <p className={`text-sm font-bold mb-1 ${statusInfo.color}`}>
                                    ผลการตรวจสอบ
                                  </p>
                                  <p className={`text-sm leading-relaxed ${statusInfo.color.replace('600', '800')}`}>
                                    {statusInfo.label.includes('ลบเนื้อหา') && !report.adminNote?.includes('ลบ') && !report.adminNote?.includes('Deleted') && (
                                      <span className="font-semibold mr-1">[ลบเนื้อหา]</span>
                                    )}
                                    {statusInfo.label.includes('แบนผู้ใช้') && !report.adminNote?.includes('แบน') && !report.adminNote?.includes('Banned') && (
                                      <span className="font-semibold mr-1">[แบนผู้ใช้]</span>
                                    )}
                                    {report.adminNote}
                                  </p>
                                  {report.reviewedAt && (
                                    <p className={`text-xs mt-2 flex items-center gap-1 opacity-75 ${statusInfo.color}`}>
                                      <Clock className="w-3 h-3" />
                                      ตรวจสอบเมื่อ {formatDistanceToNow(report.reviewedAt, { addSuffix: true, locale: th })}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action Button */}
                        {(report.productId || report.shopOwnerId) && (
                          <div className="flex-shrink-0 mt-4 md:mt-0">
                            <Button
                              variant="outline"
                              className="w-full md:w-auto border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800 hover:border-orange-300 transition-colors"
                              onClick={() => {
                                if (report.productId) {
                                  window.open(`/products/${report.productId}`, '_blank')
                                } else if (report.shopOwnerId) {
                                  window.open(`/sellerprofile/${report.shopOwnerId}`, '_blank')
                                }
                              }}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              ดูรายการ
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
