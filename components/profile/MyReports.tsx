'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, Clock, CheckCircle, XCircle, FileText, Star, MessageSquare, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { th } from 'date-fns/locale'

interface Report {
  id: string
  reporterId: string
  reporterName: string
  targetType: 'review' | 'comment'
  targetId: string
  targetUserId: string
  targetUserName: string
  targetContent: string
  productId?: string | null
  productName?: string | null
  shopId?: string | null
  shopName?: string | null
  shopOwnerId?: string | null
  reason: string
  description: string
  status: 'pending' | 'reviewed' | 'resolved' | 'rejected'
  createdAt: Date
  reviewedAt?: Date
  updatedAt?: Date
  reviewedBy?: string
  adminNotes?: string
}

export function MyReportsContent() {
  const { user } = useAuth()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved' | 'rejected'>('all')

  useEffect(() => {
    if (!user) return
    fetchReports()
  }, [user])

  const fetchReports = async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/reports/my-reports?userId=${user.uid}`)
      if (response.ok) {
        const data = await response.json()
        const reportsWithDates = data.reports.map((r: any) => ({
          ...r,
          createdAt: new Date(r.createdAt),
          reviewedAt: r.reviewedAt ? new Date(r.reviewedAt) : undefined
        }))
        setReports(reportsWithDates)
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            <Clock className="w-3 h-3 mr-1" />
            รอดำเนินการ
          </Badge>
        )
      case 'reviewed':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
            <FileText className="w-3 h-3 mr-1" />
            กำลังตรวจสอบ
          </Badge>
        )
      case 'resolved':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            ดำเนินการแล้ว
          </Badge>
        )
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
            <XCircle className="w-3 h-3 mr-1" />
            ปิดรายงาน
          </Badge>
        )
      default:
        return null
    }
  }
  const getReportedTypeIcon = (type: string) => {
    switch (type) {
      case 'review':
        return <Star className="w-4 h-4 text-yellow-600" />
      case 'comment':
        return <FileText className="w-4 h-4 text-blue-600" />
      default:
        return <AlertCircle className="w-4 h-4" />
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
    : reports.filter(r => r.status === filter)

  const getFilterCount = (status: 'all' | 'pending' | 'reviewed' | 'resolved' | 'rejected') => {
    if (status === 'all') return reports.length
    return reports.filter(r => r.status === status).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">รายงานของฉัน</h2>
        <p className="text-gray-600">ติดตามสถานะรายงานที่คุณส่ง</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card 
          className={`cursor-pointer transition-colors ${filter === 'all' ? 'border-orange-500 bg-orange-50' : 'hover:border-gray-300'}`}
          onClick={() => setFilter('all')}
        >
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{getFilterCount('all')}</div>
              <div className="text-sm text-gray-600 mt-1">ทั้งหมด</div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-colors ${filter === 'pending' ? 'border-yellow-500 bg-yellow-50' : 'hover:border-gray-300'}`}
          onClick={() => setFilter('pending')}
        >
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-700">{getFilterCount('pending')}</div>
              <div className="text-sm text-gray-600 mt-1">รอดำเนินการ</div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-colors ${filter === 'reviewed' ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'}`}
          onClick={() => setFilter('reviewed')}
        >
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700">{getFilterCount('reviewed')}</div>
              <div className="text-sm text-gray-600 mt-1">กำลังตรวจสอบ</div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-colors ${filter === 'resolved' ? 'border-green-500 bg-green-50' : 'hover:border-gray-300'}`}
          onClick={() => setFilter('resolved')}
        >
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">{getFilterCount('resolved')}</div>
              <div className="text-sm text-gray-600 mt-1">ดำเนินการแล้ว</div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-colors ${filter === 'rejected' ? 'border-red-500 bg-red-50' : 'hover:border-gray-300'}`}
          onClick={() => setFilter('rejected')}
        >
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-700">{getFilterCount('rejected')}</div>
              <div className="text-sm text-gray-600 mt-1">ปิดรายงาน</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">ไม่พบรายงาน</p>
              <p className="text-sm">
                {filter === 'all' 
                  ? 'คุณยังไม่มีรายงานในระบบ' 
                  : `ไม่มีรายงานที่มีสถานะ "${filter}"`}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Header */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(report.status)}
                      <span className="text-sm text-gray-500">•</span>
                      <span className="text-sm text-gray-600">
                        {formatDistanceToNow(report.createdAt, { 
                          addSuffix: true, 
                          locale: th 
                        })}
                      </span>
                    </div>

                    {/* Reported Item */}
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        {getReportedTypeIcon(report.targetType)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-sm text-gray-600">
                                รายงาน{getReportedTypeLabel(report.targetType)}โดย:
                              </span>
                              <span className="text-sm font-medium text-gray-900">
                                {report.targetUserName}
                              </span>
                            </div>
                            {(report.productName || report.shopName) && (
                              <div className="text-xs text-gray-500 mb-2">
                                {report.productName && (
                                  <span>สินค้า: {report.productName}</span>
                                )}
                                {report.productName && report.shopName && <span className="mx-1">•</span>}
                                {report.shopName && !report.productName && (
                                  <span>ร้านค้า: {report.shopName}</span>
                                )}
                              </div>
                            )}
                            {report.targetContent && (
                              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-200 line-clamp-2 mb-2">
                                "{report.targetContent}"
                              </div>
                            )}
                          {(report.productId || report.shopOwnerId) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200 shrink-0"
                              onClick={() => {
                                if (report.productId) {
                                  window.open(`/products/${report.productId}`, '_blank')
                                } else if (report.shopOwnerId) {
                                  // Go to seller profile
                                  window.open(`/sellerprofile/${report.shopOwnerId}`, '_blank')
                                }
                              }}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              ดูรายการ
                            </Button>
                          )}
                        </div>
                        </div>
                        <div className="mt-2">
                          <span className="text-sm font-medium text-gray-700">เหตุผล: </span>
                          <span className="text-sm text-gray-600">{getReasonText(report.reason)}</span>
                        </div>
                        {report.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            รายละเอียด: {report.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Admin Response */}
                    {report.adminNotes && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <FileText className="w-4 h-4 text-blue-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-blue-900 mb-1">
                              การตอบกลับจากผู้ดูแล:
                            </p>
                            <p className="text-sm text-blue-800">{report.adminNotes}</p>
                            {report.reviewedAt && (
                              <p className="text-xs text-blue-600 mt-1">
                                {formatDistanceToNow(report.reviewedAt, { 
                                  addSuffix: true, 
                                  locale: th 
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
