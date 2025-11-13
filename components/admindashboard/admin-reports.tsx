'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Trash2,
  Ban,
  Filter,
  RefreshCcw,
  Search,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  RotateCcw,
} from 'lucide-react'
import { useAuth } from '@/components/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

interface Report {
  id: string
  targetType: 'review' | 'comment'
  targetId: string
  targetUserId: string
  targetUserName: string
  targetUserViolations?: number
  targetUserBanned?: boolean
  targetContent: string
  targetOriginalContent?: string
  reporterId: string
  reporterName: string
  reason: string
  description: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  updatedAt: string
  reviewedBy: string | null
  reviewedByName?: string
  reviewedAt: string | null
  adminNote: string
}

interface AdminReportsProps {
  reportId?: string
}

export function AdminReports({ reportId }: AdminReportsProps = {}) {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()

  const [reports, setReports] = useState<Report[]>([])
  const [filteredReports, setFilteredReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const reportsPerPage = 5
  const [copiedId, setCopiedId] = useState<string | null>(null)
  
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [showActionDialog, setShowActionDialog] = useState(false)
  const [showReverseDialog, setShowReverseDialog] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'delete' | 'ban'>('approve')
  const [adminNote, setAdminNote] = useState('')
  const [banDuration, setBanDuration] = useState('7')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasOpenedFromUrl, setHasOpenedFromUrl] = useState(false)

  // Fetch reports
  useEffect(() => {
    if (!user) return
    fetchReports()
  }, [user])

  // Auto-select report from URL if reportId is provided
  useEffect(() => {
    if (reportId && reports.length > 0 && !hasOpenedFromUrl) {
      const report = reports.find(r => r.id === reportId)
      if (report) {
        setSelectedReport(report)
        setShowActionDialog(true)
        setActionType('approve')
        setHasOpenedFromUrl(true)
        
        // Remove reportId from URL after opening
        router.replace('/admin?section=reports', { scroll: false })
      }
    }
  }, [reportId, reports, hasOpenedFromUrl, router])

  // Apply filters
  useEffect(() => {
    let filtered = reports

    if (statusFilter !== 'all') {
      filtered = filtered.filter((r) => r.status === statusFilter)
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((r) => r.targetType === typeFilter)
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((r) => 
        r.id.toLowerCase().includes(query) ||
        r.targetUserName.toLowerCase().includes(query) ||
        r.reporterName.toLowerCase().includes(query) ||
        r.targetContent?.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        r.reason.toLowerCase().includes(query)
      )
    }

    console.log('🔍 AdminReports: Applying filters', { 
      statusFilter, 
      typeFilter,
      searchQuery,
      totalReports: reports.length, 
      filteredReports: filtered.length 
    })
    setFilteredReports(filtered)
    setCurrentPage(1) // Reset to page 1 when filters change
  }, [reports, statusFilter, typeFilter, searchQuery])

  const copyReportId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id)
      setCopiedId(id)
      toast({
        title: '✅ คัดลอกแล้ว',
        description: 'คัดลอกรหัสอ้างอิงเรียบร้อย',
      })
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถคัดลอกได้',
      })
    }
  }

  const fetchReports = async () => {
    setIsLoading(true)
    try {
      const token = await user!.getIdToken()
      console.log('🔍 AdminReports: Fetching reports...')
      const response = await fetch('/api/reports', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to fetch reports')

      const data = await response.json()
      console.log('✅ AdminReports: Fetched reports:', data.reports.length, 'reports')
      console.log('Reports data:', data.reports)
      console.log('Sample report violations:', data.reports[0]?.targetUserViolations, 'banned:', data.reports[0]?.targetUserBanned)
      setReports(data.reports)
    } catch (error: any) {
      console.error('❌ AdminReports: Error fetching reports:', error)
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: error.message || 'ไม่สามารถโหลดรายงานได้',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAction = async () => {
    if (!selectedReport) return

    console.log('🔍 AdminReports: handleAction called', { 
      reportId: selectedReport.id, 
      actionType,
      adminNote,
      banDuration: actionType === 'ban' ? parseInt(banDuration) : undefined
    })

    // ✅ ตรวจสอบว่ากรอกเหตุผลหรือไม่ (สำหรับ delete, ban, reject)
    if ((actionType === 'delete' || actionType === 'ban' || actionType === 'reject') && !adminNote.trim()) {
      toast({
        variant: 'destructive',
        title: 'กรุณากรอกเหตุผล',
        description: 'จำเป็นต้องระบุเหตุผลในการดำเนินการเพื่อป้องกันการใช้อำนาจผิด',
      })
      return
    }

    // ✅ Double Confirmation สำหรับการแบน
    if (actionType === 'ban') {
      const confirmed = window.confirm(
        `⚠️ ยืนยันการแบนผู้ใช้ "${selectedReport.targetUserName}" เป็นเวลา ${banDuration} วัน?\n\n` +
        `เหตุผล: ${adminNote}\n\n` +
        `การกระทำนี้จะ:\n` +
        `- ลบเนื้อหาที่ถูกรายงาน\n` +
        `- แบนผู้ใช้ไม่ให้เข้าถึงระบบ\n` +
        `- เพิ่มประวัติการละเมิด\n` +
        `- บันทึก log การดำเนินการของคุณ\n\n` +
        `กรุณายืนยันอีกครั้ง`
      )
      
      if (!confirmed) {
        toast({
          title: 'ยกเลิกการแบน',
          description: 'การแบนผู้ใช้ถูกยกเลิก',
        })
        return
      }
    }

    setIsSubmitting(true)
    try {
      const token = await user!.getIdToken()
      console.log('🔍 Sending PATCH request to /api/reports')
      const response = await fetch('/api/reports', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reportId: selectedReport.id,
          action: actionType,
          adminNote,
          banDuration: actionType === 'ban' ? parseInt(banDuration) : undefined,
        }),
      })

      const data = await response.json()
      console.log('📊 Response:', { status: response.status, data })

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process report')
      }

      toast({
        title: '✅ สำเร็จ',
        description: data.message,
      })

      setShowActionDialog(false)
      setSelectedReport(null)
      setAdminNote('')
      setBanDuration('7')
      
      // Refresh reports
      await fetchReports()
    } catch (error: any) {
      console.error('❌ Error in handleAction:', error)
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: error.message || 'ไม่สามารถดำเนินการได้',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openActionDialog = (report: Report, action: typeof actionType) => {
    setSelectedReport(report)
    setActionType(action)
    setShowActionDialog(true)
  }

  const handleReverseDecision = async () => {
    if (!selectedReport) return

    if (!adminNote.trim()) {
      toast({
        variant: 'destructive',
        title: 'กรุณากรอกเหตุผล',
        description: 'จำเป็นต้องระบุเหตุผลในการยกเลิกการตัดสินเพื่อความโปร่งใส',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const token = await user!.getIdToken()
      
      const response = await fetch('/api/reports', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reportId: selectedReport.id,
          adminNote,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reverse decision')
      }

      toast({
        title: '✅ ยกเลิกการตัดสินสำเร็จ',
        description: data.message,
      })

      setShowReverseDialog(false)
      setSelectedReport(null)
      setAdminNote('')
      
      await fetchReports()
    } catch (error: any) {
      console.error('❌ Error reversing decision:', error)
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: error.message || 'ไม่สามารถยกเลิกการตัดสินได้',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getReasonText = (reason: string) => {
    const reasons: Record<string, string> = {
      spam: 'สแปม/โฆษณา',
      offensive: 'คำหยาบ/ไม่เหมาะสม',
      fake: 'รีวิวปลอม',
      misinformation: 'ข้อมูลเท็จ',
      'false-information': 'ข้อมูลเท็จ',
      inappropriate: 'ไม่เหมาะสม',
      harassment: 'ล่วงละเมิด/คุกคาม',
      other: 'อื่นๆ',
    }
    return reasons[reason] || reason
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500">รอดำเนินการ</Badge>
      case 'approved':
        return <Badge className="bg-green-500">ดำเนินการแล้ว</Badge>
      case 'rejected':
        return <Badge className="bg-red-500">ปฏิเสธรายงาน</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#ff9800] mx-auto mb-4"></div>
        <p className="text-gray-600">กำลังโหลดรายงาน...</p>
      </div>
    )
  }

  const stats = {
    total: reports.length,
    pending: reports.filter((r) => r.status === 'pending').length,
    approved: reports.filter((r) => r.status === 'approved').length,
    rejected: reports.filter((r) => r.status === 'rejected').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#292d32]">จัดการรายงาน</h2>
          <p className="text-gray-600">ตรวจสอบและดำเนินการกับรายงานจากผู้ใช้</p>
        </div>
        <Button
          onClick={fetchReports}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCcw className="w-4 h-4" />
          รีเฟรช
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          type="text"
          placeholder="ค้นหารายงาน (รหัส, ชื่อผู้ใช้, เนื้อหา, เหตุผล...)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">ทั้งหมด</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-yellow-600">รอดำเนินการ</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-green-600">ดำเนินการแล้ว</div>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-red-600">ปฏิเสธรายงาน</div>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Filter className="w-5 h-5 text-gray-500" />
            <div className="flex gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Label>สถานะ:</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    <SelectItem value="pending">รอดำเนินการ</SelectItem>
                    <SelectItem value="approved">ดำเนินการแล้ว</SelectItem>
                    <SelectItem value="rejected">ปฏิเสธรายงาน</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label>ประเภท:</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    <SelectItem value="review">รีวิว</SelectItem>
                    <SelectItem value="comment">ความคิดเห็น</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              ไม่พบรายงาน
            </CardContent>
          </Card>
        ) : (
          (() => {
            // Calculate pagination
            const totalPages = Math.ceil(filteredReports.length / reportsPerPage)
            const paginatedReports = filteredReports.slice(
              (currentPage - 1) * reportsPerPage,
              currentPage * reportsPerPage
            )

            return (
              <>
                {paginatedReports.map((report) => (
                  <Card key={report.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 sm:p-6">
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex items-center gap-1 bg-secondary/50 rounded-md px-2 py-1">
                                <span className="text-xs font-mono text-gray-700">
                                  รหัส: {report.id}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyReportId(report.id)}
                                  className="h-5 w-5 p-0 hover:bg-secondary"
                                >
                                  {copiedId === report.id ? (
                                    <Check className="w-3 h-3 text-green-600" />
                                  ) : (
                                    <Copy className="w-3 h-3 text-gray-600" />
                                  )}
                                </Button>
                              </div>
                              {getStatusBadge(report.status)}
                              <Badge variant="outline">
                                {report.targetType === 'review' ? '📝 รีวิว' : '💬 ความคิดเห็น'}
                              </Badge>
                              {report.createdAt && !isNaN(new Date(report.createdAt).getTime()) && (
                                <span className="text-xs text-gray-500">
                                  {format(new Date(report.createdAt), 'PPp', { locale: th })}
                                </span>
                              )}
                            </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                        <span className="font-medium">เหตุผล:</span>
                        <span>{getReasonText(report.reason)}</span>
                      </div>
                      
                      {report.description && (
                        <p className="text-sm text-gray-600 ml-6">
                          {report.description}
                        </p>
                      )}

                      <div className="bg-gray-50 p-3 rounded-md">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="text-xs font-medium text-gray-700">
                            เนื้อหาที่ถูกรายงาน (โดย {report.targetUserName})
                          </span>
                          {report.targetUserBanned && (
                            <Badge className="bg-red-600 text-xs">🚫 ถูกแบน</Badge>
                          )}
                          {(report.targetUserViolations ?? 0) > 0 && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                (report.targetUserViolations ?? 0) >= 3 
                                  ? 'border-red-500 text-red-700 bg-red-50' 
                                  : (report.targetUserViolations ?? 0) >= 2
                                  ? 'border-orange-500 text-orange-700 bg-orange-50'
                                  : 'border-yellow-500 text-yellow-700 bg-yellow-50'
                              }`}
                            >
                              ⚠️ ละเมิดแล้ว {report.targetUserViolations} ครั้ง
                            </Badge>
                          )}
                        </div>
                        <div className="bg-white p-2 rounded border border-gray-200">
                          <p className="text-sm line-clamp-2">
                            {!report.targetOriginalContent && !report.targetContent || 
                             report.targetOriginalContent === '0' || 
                             report.targetContent === '0' || 
                             (report.targetOriginalContent?.trim() === '' && report.targetContent?.trim() === '')
                              ? <span className="text-gray-400 italic">เนื้อหาถูกลบไปแล้วหรือไม่มีข้อมูล</span>
                              : <>
                                  {report.targetOriginalContent || report.targetContent}
                                  {report.targetOriginalContent && report.targetOriginalContent !== report.targetContent && (
                                    <span className="ml-2 text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                                      🔍 มีคำที่ถูกเซ็นเซอร์
                                    </span>
                                  )}
                                </>
                            }
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap">
                        <span>รายงานโดย: <strong>{report.reporterName}</strong></span>
                        {report.reviewedBy && report.reviewedAt && !isNaN(new Date(report.reviewedAt).getTime()) && (
                          <span className={report.status === 'approved' ? 'text-green-600' : 'text-red-600'}>
                            {report.status === 'approved' ? '✓' : '✗'} ดำเนินการโดย: <strong>{report.reviewedByName || 'Admin'}</strong>
                            {' '}เมื่อ {format(new Date(report.reviewedAt), 'Pp', { locale: th })}
                          </span>
                        )}
                      </div>

                      {report.adminNote && (
                        <div className="p-2 bg-blue-50 rounded text-sm">
                          <strong>หมายเหตุ:</strong> {report.adminNote}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {report.status === 'pending' && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openActionDialog(report, 'delete')}
                          className="text-orange-600 hover:bg-orange-50 text-xs"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          ลบเนื้อหา
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openActionDialog(report, 'ban')}
                          className="text-purple-600 hover:bg-purple-50 text-xs"
                        >
                          <Ban className="w-3 h-3 mr-1" />
                          ลบ + แบน
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openActionDialog(report, 'reject')}
                          className="text-red-600 hover:bg-red-50 text-xs"
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          ปฏิเสธรายงาน
                        </Button>
                      </div>
                    )}
                    {report.status !== 'pending' && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedReport(report)
                            setActionType('approve')
                            setAdminNote('')
                            setShowReverseDialog(true)
                          }}
                          className="text-blue-600 hover:bg-blue-50 text-xs"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          แก้ไข
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6 pb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                ก่อนหน้า
              </Button>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  หน้า <strong className="text-gray-900">{currentPage}</strong> จาก <strong className="text-gray-900">{totalPages}</strong>
                </span>
                <span className="text-xs text-gray-500">
                  ({filteredReports.length} รายการ)
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                ถัดไป
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </>
        )
      })()
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'delete' && 'ลบเนื้อหา'}
              {actionType === 'ban' && 'ลบเนื้อหา + แบนผู้ใช้'}
              {actionType === 'reject' && 'ปฏิเสธรายงาน'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'delete' &&
                'ลบเนื้อหาที่ถูกรายงานออกจากระบบถาวร (รายงานถูกต้อง)'}
              {actionType === 'ban' &&
                'ลบเนื้อหา + แบนผู้ใช้ที่ละเมิดกฎ (สำหรับการละเมิดร้ายแรง)'}
              {actionType === 'reject' &&
                'ปฏิเสธรายงานนี้ เพราะเนื้อหาไม่ได้ละเมิดกฎ'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* User Violation History */}
            {selectedReport && selectedReport.targetUserViolations !== undefined && selectedReport.targetUserViolations > 0 && (
              <div className={`p-3 rounded-md border ${
                selectedReport.targetUserViolations >= 3 
                  ? 'bg-red-50 border-red-300' 
                  : selectedReport.targetUserViolations >= 2
                  ? 'bg-orange-50 border-orange-300'
                  : 'bg-yellow-50 border-yellow-300'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className={`w-4 h-4 ${
                    selectedReport.targetUserViolations >= 3 
                      ? 'text-red-600' 
                      : selectedReport.targetUserViolations >= 2
                      ? 'text-orange-600'
                      : 'text-yellow-600'
                  }`} />
                  <span className="font-semibold text-sm">
                    ประวัติการละเมิด
                  </span>
                </div>
                <div className="text-sm space-y-1">
                  <p>ผู้ใช้ <strong>{selectedReport.targetUserName}</strong> เคยถูกดำเนินการแล้ว <strong className="text-red-600">{selectedReport.targetUserViolations} ครั้ง</strong></p>
                  {selectedReport.targetUserBanned && (
                    <p className="text-red-600 font-medium">⚠️ ผู้ใช้นี้ถูกแบนอยู่ในขณะนี้</p>
                  )}
                  {selectedReport.targetUserViolations >= 2 && (
                    <p className="font-medium mt-2">
                      💡 คำแนะนำ: พิจารณาใช้ "ลบ + แบน" สำหรับผู้ละเมิดซ้ำ
                    </p>
                  )}
                </div>
              </div>
            )}

            {actionType === 'ban' && (
              <div className="space-y-2">
                <Label htmlFor="banDuration">ระยะเวลาแบน (วัน)</Label>
                <Input
                  id="banDuration"
                  type="number"
                  min="1"
                  max="365"
                  value={banDuration}
                  onChange={(e) => setBanDuration(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="adminNote">
                หมายเหตุ {(actionType === 'delete' || actionType === 'ban' || actionType === 'reject') && 
                  <span className="text-red-500">*</span>
                }
              </Label>
              <Textarea
                id="adminNote"
                placeholder={
                  actionType === 'delete' 
                    ? 'กรุณาระบุเหตุผลในการลบเนื้อหา (บังคับ)...'
                    : actionType === 'ban'
                    ? 'กรุณาระบุเหตุผลในการแบนผู้ใช้ (บังคับ)...'
                    : actionType === 'reject'
                    ? 'กรุณาระบุเหตุผลในการปฏิเสธรายงาน (บังคับ)...'
                    : 'เพิ่มหมายเหตุ (ถ้ามี)...'
                }
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={4}
                className={
                  (actionType === 'delete' || actionType === 'ban' || actionType === 'reject') && 
                  !adminNote.trim() 
                    ? 'border-red-300' 
                    : ''
                }
              />
              {(actionType === 'delete' || actionType === 'ban' || actionType === 'reject') && (
                <p className="text-xs text-red-600">
                  ⚠️ จำเป็นต้องระบุเหตุผลเพื่อป้องกันการใช้อำนาจผิด
                </p>
              )}
            </div>

            {selectedReport && (
              <div className="bg-gray-50 p-3 rounded text-sm">
                <div className="font-medium mb-1 flex items-center gap-2">
                  <span>เนื้อหา:</span>
                  {selectedReport.targetOriginalContent && 
                   selectedReport.targetOriginalContent !== selectedReport.targetContent && (
                    <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">
                      มีคำที่ถูกเซ็นเซอร์
                    </span>
                  )}
                </div>
                <p className="line-clamp-3 whitespace-pre-wrap">
                  {selectedReport.targetOriginalContent || selectedReport.targetContent}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowActionDialog(false)}
              disabled={isSubmitting}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleAction}
              disabled={isSubmitting}
              className={
                actionType === 'ban'
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : actionType === 'delete'
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-red-600 hover:bg-red-700'
              }
            >
              {isSubmitting ? 'กำลังดำเนินการ...' : 'ยืนยัน'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reverse Decision Dialog */}
      <Dialog open={showReverseDialog} onOpenChange={setShowReverseDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-blue-600" />
              ยกเลิก/แก้ไขการตัดสิน
            </DialogTitle>
            <DialogDescription>
              ยกเลิกการตัดสินครั้งก่อน และคืนสถานะรายงานกลับเป็น "รอดำเนินการ"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedReport && (
              <>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm space-y-1">
                      <p className="font-semibold text-yellow-800">⚠️ คำเตือน</p>
                      <p className="text-yellow-700">
                        การยกเลิกการตัดสินจะทำให้:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-yellow-700 ml-2">
                        {selectedReport.status === 'approved' && (
                          <>
                            <li>ลดจำนวนการละเมิดของผู้ใช้ลง 1 ครั้ง</li>
                            {selectedReport.targetUserBanned && (
                              <li className="font-medium">ปลดแบนผู้ใช้ (หากถูกแบนจากรายงานนี้)</li>
                            )}
                            <li>เนื้อหาจะไม่ถูกกู้คืน (ถูกลบถาวรแล้ว)</li>
                          </>
                        )}
                        {selectedReport.status === 'rejected' && (
                          <li>คืนสถานะรายงานเป็น "รอดำเนินการ"</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded text-sm">
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">สถานะปัจจุบัน:</span>{' '}
                      {selectedReport.status === 'approved' ? (
                        <Badge className="bg-green-600">ดำเนินการแล้ว</Badge>
                      ) : (
                        <Badge className="bg-red-600">ปฏิเสธรายงาน</Badge>
                      )}
                    </div>
                    <div>
                      <span className="font-medium">ดำเนินการโดย:</span> {selectedReport.reviewedByName || 'Admin'}
                    </div>
                    {selectedReport.reviewedAt && !isNaN(new Date(selectedReport.reviewedAt).getTime()) && (
                      <div>
                        <span className="font-medium">เมื่อ:</span>{' '}
                        {format(new Date(selectedReport.reviewedAt), 'PPp', { locale: th })}
                      </div>
                    )}
                    {selectedReport.adminNote && (
                      <div>
                        <span className="font-medium">หมายเหตุเดิม:</span>
                        <p className="mt-1 p-2 bg-white rounded border">{selectedReport.adminNote}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="reverseNote">
                เหตุผลในการยกเลิก <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reverseNote"
                placeholder="เช่น: ผู้ใช้ยื่นอุทธรณ์สำเร็จ, พบว่าตัดสินผิดพลาด, มีหลักฐานเพิ่มเติม..."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={4}
                className={!adminNote.trim() ? 'border-red-300' : ''}
              />
              <p className="text-xs text-red-600">
                ⚠️ จำเป็นต้องระบุเหตุผลเพื่อความโปร่งใสและป้องกันการใช้อำนาจผิด
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowReverseDialog(false)
                setAdminNote('')
              }}
              disabled={isSubmitting}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleReverseDecision}
              disabled={isSubmitting || !adminNote.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'กำลังดำเนินการ...' : 'ยืนยันยกเลิกการตัดสิน'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
