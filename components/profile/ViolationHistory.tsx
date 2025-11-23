'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { Shield, User, Trash2, Ban, CheckCircle, XCircle, AlertTriangle, ChevronLeft, ChevronRight, Clock, FileText } from 'lucide-react'
import Link from 'next/link'

interface ViolationRecord {
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

export function ViolationHistoryContent() {
  const { user } = useAuth()
  const [violations, setViolations] = useState<ViolationRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userStats, setUserStats] = useState({
    totalViolations: 0,
    banned: false,
    bannedUntil: null as Date | null,
  })
  const [selectedViolation, setSelectedViolation] = useState<ViolationRecord | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  useEffect(() => {
    if (!user) return
    fetchViolationHistory()
  }, [user])

  const fetchViolationHistory = async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      const token = await user.getIdToken()
      
      // Get user profile for ban status
      const profileResponse = await fetch(`/api/users/${user.uid}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (profileResponse.ok) {
        const profile = await profileResponse.json()
        setUserStats({
          totalViolations: profile.violations || 0,
          banned: profile.banned || false,
          bannedUntil: profile.bannedUntil ? new Date(profile.bannedUntil) : null,
        })
      }

      // Get violation history from admin activities
      const response = await fetch(`/api/admin/activities?targetUserId=${user.uid}&limit=50`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setViolations(data.activities || [])
      }
    } catch (error) {
      console.error('❌ Error fetching violation history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Pagination
  const totalPages = Math.ceil(violations.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentViolations = violations.slice(startIndex, endIndex)

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
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
          reportId: reportId || null
        }
      }
      
      // ยกเลิกการตัดสิน format
      if (details.includes('🔄')) {
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

  const getActionDescription = (violation: ViolationRecord) => {
    const parsed = parseDetails(violation.details)
    
    if (parsed.isNewFormat && violation.action === 'reverse_report_decision') {
      const userInfo = parsed.targetUser ? ` ของ ${parsed.targetUser}` : ''
      return `ยกเลิกการตัดสินเดิม${userInfo}`
    }
    
    if (violation.action === 'reject_report') {
      const ct = parsed.contentType?.toLowerCase()
      const contentTypeText = !ct ? 'ความคิดเห็น' :
        (ct.includes('comment') || ct.includes('ความคิดเห็น')) ? 'ความคิดเห็น' :
        (ct.includes('review') || ct.includes('รีวิว')) ? 'รีวิว' : 'ความคิดเห็น'
      const targetUserName = parsed.targetUser || violation.targetName
      
      // แสดงแค่ข้อมูลหลักสั้นๆ
      let description = `ปฏิเสธรายงาน${contentTypeText}ของ ${targetUserName}`
      
      if (parsed.reporterName) {
        description += ` (โดย ${parsed.reporterName})`
      }
      
      return description
    }
    
    // Old format
    switch(violation.action) {
      case 'delete_content':
        return `ลบ${parsed.contentType === 'comment' ? 'ความคิดเห็น' : 'รีวิว'}ของคุณ`
      case 'ban_user':
        return `แบนบัญชีของคุณ`
      default:
        return violation.details
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#ff9800] mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดประวัติ...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold text-[#292d32] mb-2">
              📋 ประวัติการละเมิด
            </h2>
            <p className="text-gray-600">
              บันทึกการดำเนินการทั้งหมดที่เกี่ยวข้องกับบัญชีของคุณ
            </p>
          </div>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className={userStats.totalViolations >= 3 ? 'border-red-300 bg-red-50' : userStats.totalViolations >= 2 ? 'border-orange-300 bg-orange-50' : 'border-yellow-300 bg-yellow-50'}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${userStats.totalViolations >= 3 ? 'bg-red-100' : userStats.totalViolations >= 2 ? 'bg-orange-100' : 'bg-yellow-100'}`}>
                  <AlertTriangle className={`w-6 h-6 ${userStats.totalViolations >= 3 ? 'text-red-600' : userStats.totalViolations >= 2 ? 'text-orange-600' : 'text-yellow-600'}`} />
                </div>
                <div>
                  <div className="text-sm text-gray-600">การละเมิดทั้งหมด</div>
                  <div className={`text-2xl font-bold ${userStats.totalViolations >= 3 ? 'text-red-600' : userStats.totalViolations >= 2 ? 'text-orange-600' : 'text-yellow-600'}`}>
                    {userStats.totalViolations} ครั้ง
                  </div>
                </div>
              </div>
              {userStats.totalViolations >= 3 && (
                <div className="mt-3 text-xs text-red-700 font-medium">
                  ⚠️ คำเตือนสุดท้าย: การละเมิดครั้งต่อไปอาจถูกระงับถาวร
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={userStats.banned ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${userStats.banned ? 'bg-red-100' : 'bg-green-100'}`}>
                  <Shield className={`w-6 h-6 ${userStats.banned ? 'text-red-600' : 'text-green-600'}`} />
                </div>
                <div>
                  <div className="text-sm text-gray-600">สถานะบัญชี</div>
                  <div className={`text-lg font-bold ${userStats.banned ? 'text-red-600' : 'text-green-600'}`}>
                    {userStats.banned ? '🚫 ถูกระงับ' : '✅ ปกติ'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {userStats.bannedUntil && (
            <Card className="border-purple-300 bg-purple-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-purple-100">
                    <Clock className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">ระงับจนถึง</div>
                    <div className="text-sm font-bold text-purple-600">
                      {format(userStats.bannedUntil, 'PPP', { locale: th })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Violations List */}
        <div className="space-y-4 mt-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-[#292d32] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#ff9800]" />
              รายละเอียดทั้งหมด ({violations.length} รายการ)
            </h3>
            {violations.length > itemsPerPage && (
              <div className="text-sm text-gray-600">
                หน้า {currentPage} จาก {totalPages}
              </div>
            )}
          </div>

          {violations.length === 0 ? (
            <Card className="border-2 border-dashed border-gray-300">
              <CardContent className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-green-100 rounded-full">
                    <Shield className="w-12 h-12 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-green-600 mb-2">
                      ✨ ยินดีด้วย! ไม่มีประวัติการละเมิด
                    </h3>
                    <p className="text-gray-600">
                      คุณเป็นสมาชิกที่ดี ไม่มีประวัติการถูกดำเนินการใดๆ
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4">
                {currentViolations.map((violation, index) => {
                  const globalIndex = startIndex + index
                  const parsed = parseDetails(violation.details)
                  
                  const getActionDescription = () => {
                    if (parsed.isNewFormat && violation.action === 'reverse_report_decision') {
                      const userInfo = parsed.targetUser ? ` ของ ${parsed.targetUser}` : ''
                      return `ยกเลิกการตัดสินเดิม${userInfo}`
                    }
                    
                    if (violation.action === 'reject_report') {
                      const ct = parsed.contentType?.toLowerCase()
                      const contentTypeText = !ct ? 'ความคิดเห็น' :
                        (ct.includes('comment') || ct.includes('ความคิดเห็น')) ? 'ความคิดเห็น' :
                        (ct.includes('review') || ct.includes('รีวิว')) ? 'รีวิว' : 'ความคิดเห็น'
                      const targetUserName = parsed.targetUser || violation.targetName
                      
                      // แสดงแค่ข้อมูลหลักสั้นๆ
                      let description = `ปฏิเสธรายงาน${contentTypeText}ของ ${targetUserName}`
                      
                      if (parsed.reporterName) {
                        description += ` (โดย ${parsed.reporterName})`
                      }
                      
                      return description
                    }
                    
                    // Old format
                    switch(violation.action) {
                      case 'delete_content':
                        return `ลบ${parsed.contentType === 'comment' ? 'ความคิดเห็น' : 'รีวิว'}ของคุณ`
                      case 'ban_user':
                        return `แบนบัญชีของคุณ`
                      default:
                        return violation.details
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
                      case 'Approved':
                        return '✅'
                      case 'Rejected':
                        return '❌'
                      default:
                        return '📋'
                    }
                  }

                  const getThaiActionName = () => {
                    switch(violation.action) {
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
                      case 'Approved':
                        return 'อนุมัติ'
                      case 'Rejected':
                        return 'ปฏิเสธ'
                      default:
                        return violation.action
                    }
                  }

                  return (
                    <div 
                      key={violation.id} 
                      className="bg-white rounded-xl p-5 border-l-4 shadow-sm hover:shadow-lg transition-all cursor-pointer"
                      style={{
                        borderLeftColor: violation.action === 'ban_user' ? '#dc2626' : 
                                        violation.action === 'delete_content' ? '#ea580c' :
                                        violation.action === 'reverse_report_decision' ? '#2563eb' :
                                        violation.action === 'approve_report' ? '#16a34a' : 
                                        violation.action === 'reject_report' ? '#dc2626' : '#6b7280'
                      }}
                      onClick={() => setSelectedViolation(violation)}
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon Section */}
                        <div className="flex-shrink-0">
                          <div className={`p-3 rounded-xl ${
                            violation.action === 'ban_user' ? 'bg-red-100' :
                            violation.action === 'delete_content' ? 'bg-orange-100' :
                            violation.action === 'reverse_report_decision' ? 'bg-blue-100' :
                            violation.action === 'approve_report' ? 'bg-green-100' :
                            violation.action === 'reject_report' ? 'bg-red-100' : 'bg-gray-100'
                          }`}>
                            <span className="text-xl">{getActionIconEmoji(violation.action)}</span>
                          </div>
                        </div>

                        {/* Content Section */}
                        <div className="flex-1 min-w-0">
                          {/* Badge & Time */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              violation.action === 'ban_user' ? 'bg-red-600 text-white' :
                              violation.action === 'delete_content' ? 'bg-orange-600 text-white' :
                              violation.action === 'reverse_report_decision' ? 'bg-blue-600 text-white' :
                              violation.action === 'approve_report' ? 'bg-green-600 text-white' :
                              violation.action === 'reject_report' ? 'bg-red-500 text-white' : 'bg-gray-600 text-white'
                            }`}>
                              {getActionIconEmoji(violation.action)} {getThaiActionName()}
                            </span>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full whitespace-nowrap">
                              {violation.createdAt && format(new Date(violation.createdAt), 'dd MMM • HH:mm', { locale: th })}
                            </span>
                          </div>

                          {/* Description */}
                          <p className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2">
                            {getActionDescription()}
                          </p>

                          {/* Admin Info */}
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <User className="w-3 h-3" />
                            <span className="font-medium">{violation.adminName}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <Button
                    variant="outline"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    ก่อนหน้า
                  </Button>
                  <div className="text-sm text-gray-600">
                    หน้า {currentPage} จาก {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="gap-2"
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
        {selectedViolation && (
          <Dialog open={!!selectedViolation} onOpenChange={(open) => !open && setSelectedViolation(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="sr-only">รายละเอียดกิจกรรม</DialogTitle>
              </DialogHeader>
              {(() => {
                const parsed = parseDetails(selectedViolation.details)
                
                return (
                  <div className="space-y-4">
                    {/* Header Section with Gradient */}
                    <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-6 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-3 rounded-xl ${
                          selectedViolation.action === 'ban_user' ? 'bg-red-100' :
                          selectedViolation.action === 'delete_content' ? 'bg-orange-100' :
                          selectedViolation.action === 'reverse_report_decision' ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          {getActionIcon(selectedViolation.action)}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900">รายละเอียดกิจกรรม</h3>
                        </div>
                      </div>
                      
                      {/* Badge & Time */}
                      <div className="flex items-center justify-between">
                        {getActionBadge(selectedViolation.action)}
                        <span className="text-sm text-gray-600 bg-white/80 px-3 py-1.5 rounded-full">
                          {selectedViolation.createdAt && format(new Date(selectedViolation.createdAt), 'dd MMMM yyyy • HH:mm น.', { locale: th })}
                        </span>
                      </div>
                    </div>

                    {/* Admin Info */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-50 p-5 rounded-xl border border-blue-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-blue-900 block">ผู้ดำเนินการ</span>
                          <p className="text-base font-bold text-gray-900">{selectedViolation.adminName}</p>
                          <p className="text-sm text-gray-600">{selectedViolation.adminEmail}</p>
                        </div>
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
                                {parsed.adminNote && (
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
                                และจำนวนการละเมิดของคุณถูกลดลง
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
                                      {parsed.reportReason === 'offensive'
                                        ? '😤 พูดจาหยาบคาย'
                                        : parsed.reportReason === 'spam'
                                          ? '📢 สแปม'
                                          : parsed.reportReason === 'inappropriate'
                                            ? '⚠️ เนื้อหาไม่เหมาะสม'
                                            : parsed.reportReason === 'scam'
                                              ? '🎭 หลอกลวง'
                                              : parsed.reportReason}
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
                                <strong className="font-bold">✅ ผลลัพธ์:</strong> รายงานถูกปฏิเสธ คุณไม่มีการดำเนินการใดๆ 
                                เนื้อหายังคงอยู่ตามเดิม
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Old Format - Original display */}
                        <div className="bg-gradient-to-br from-gray-50 to-gray-50 p-5 rounded-xl border-l-4 border-gray-400 shadow-sm">
                          <p className="text-base font-semibold text-gray-900">
                            📋 {getActionDescription(selectedViolation)}
                          </p>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {parsed.adminNote && (
                            <div className="bg-gradient-to-br from-orange-50 to-orange-50 p-4 rounded-xl border-l-4 border-orange-500 shadow-sm">
                              <span className="text-xs font-semibold text-orange-700 uppercase block mb-2">เหตุผลที่แอดมินระบุ</span>
                              <span className="text-sm text-gray-900 font-medium">{parsed.adminNote}</span>
                            </div>
                          )}
                          
                          {parsed.reason && (
                            <div className="bg-gradient-to-br from-red-50 to-red-50 p-4 rounded-xl border-l-4 border-red-500 shadow-sm">
                              <span className="text-xs font-semibold text-red-700 uppercase block mb-2">ประเภทการละเมิด</span>
                              <span className="text-sm text-gray-900 font-medium">
                                {parsed.reason === 'offensive' ? '😤 พูดจาหยาบคาย' :
                                 parsed.reason === 'spam' ? '📢 สแปม' :
                                 parsed.reason === 'inappropriate' ? '⚠️ เนื้อหาไม่เหมาะสม' :
                                 parsed.reason === 'scam' ? '🎭 หลอกลวง' :
                                 parsed.reason}
                              </span>
                            </div>
                          )}

                          {parsed.violations && (
                            <div className="bg-gradient-to-br from-red-50 to-pink-50 p-4 rounded-xl border-l-4 border-red-500 shadow-sm">
                              <span className="text-xs font-semibold text-red-700 uppercase block mb-2">สถิติการละเมิด</span>
                              <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-red-600">{parsed.violations}</span>
                                <span className="text-sm text-gray-600">ครั้ง</span>
                              </div>
                            </div>
                          )}

                          {parsed.duration && (
                            <div className="bg-gradient-to-br from-purple-50 to-purple-50 p-4 rounded-xl border-l-4 border-purple-500 shadow-sm">
                              <span className="text-xs font-semibold text-purple-700 uppercase block mb-2">ระยะเวลาแบน</span>
                              <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-purple-600">{parsed.duration}</span>
                                <span className="text-sm text-gray-600">วัน</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Report ID */}
                        {parsed.reportId && (
                          <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-xl border border-gray-200 shadow-sm">
                            <span className="text-xs font-semibold text-gray-700 uppercase block mb-2">รหัสรายงานอ้างอิง</span>
                            <code className="text-sm bg-white px-3 py-1.5 rounded-lg border border-gray-300 font-mono">
                              {parsed.reportId}
                            </code>
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

        {/* Help Section */}
        {violations.length > 0 && (
          <Card className="border-blue-300 bg-blue-50 mt-8">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-full flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-blue-600" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-blue-900">💡 หากคุณคิดว่ามีการดำเนินการผิดพลาด</h4>
                  <p className="text-sm text-blue-800">
                    คุณสามารถติดต่อทีมงานเพื่ออุทธรณ์การตัดสินใจได้ผ่านหน้า{' '}
                    <Link href="/support" className="font-bold underline hover:text-blue-600">
                      ติดต่อทีมงาน
                    </Link>
                  </p>
                  <p className="text-xs text-blue-700 mt-2">
                    📌 กรุณาเตรียมหลักฐานและระบุรายละเอียดการดำเนินการที่คุณต้องการอุทธรณ์
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
