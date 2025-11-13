'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth-context'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, Clock, CheckCircle, XCircle, FileText, ChevronLeft } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { th } from 'date-fns/locale'

interface Report {
  id: string
  reporterId: string
  reporterName: string
  reportedType: 'product' | 'shop' | 'user'
  reportedId: string
  reportedName: string
  reason: string
  description: string
  status: 'pending' | 'reviewed' | 'resolved' | 'rejected'
  createdAt: Date
  reviewedAt?: Date
  reviewedBy?: string
  adminNotes?: string
}

export default function MyReportsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved' | 'rejected'>('all')

  useEffect(() => {
    if (!user) {
      router.push('/profile')
      return
    }
    fetchReports()
  }, [user, router])

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

  const getReportedTypeLabel = (type: string) => {
    switch (type) {
      case 'product':
        return 'สินค้า'
      case 'shop':
        return 'ร้านค้า'
      case 'user':
        return 'ผู้ใช้'
      default:
        return type
    }
  }

  const filteredReports = filter === 'all' 
    ? reports 
    : reports.filter(r => r.status === filter)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/profile')}
            className="mb-4"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            กลับไปโปรไฟล์
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-orange-100 rounded-full">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">รายงานของฉัน</h1>
              <p className="text-gray-600">ติดตามสถานะรายงานที่คุณส่ง</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            size="sm"
            className={filter === 'all' ? 'bg-orange-500 hover:bg-orange-600' : ''}
          >
            ทั้งหมด ({reports.length})
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilter('pending')}
            size="sm"
            className={filter === 'pending' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
          >
            รอดำเนินการ ({reports.filter(r => r.status === 'pending').length})
          </Button>
          <Button
            variant={filter === 'reviewed' ? 'default' : 'outline'}
            onClick={() => setFilter('reviewed')}
            size="sm"
            className={filter === 'reviewed' ? 'bg-blue-500 hover:bg-blue-600' : ''}
          >
            กำลังตรวจสอบ ({reports.filter(r => r.status === 'reviewed').length})
          </Button>
          <Button
            variant={filter === 'resolved' ? 'default' : 'outline'}
            onClick={() => setFilter('resolved')}
            size="sm"
            className={filter === 'resolved' ? 'bg-green-500 hover:bg-green-600' : ''}
          >
            ดำเนินการแล้ว ({reports.filter(r => r.status === 'resolved').length})
          </Button>
          <Button
            variant={filter === 'rejected' ? 'default' : 'outline'}
            onClick={() => setFilter('rejected')}
            size="sm"
            className={filter === 'rejected' ? 'bg-red-500 hover:bg-red-600' : ''}
          >
            ปิดรายงาน ({reports.filter(r => r.status === 'rejected').length})
          </Button>
        </div>

        {/* Reports List */}
        {filteredReports.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                {filter === 'all' ? 'ยังไม่มีรายงาน' : `ไม่มีรายงาน${filter === 'pending' ? 'ที่รอดำเนินการ' : filter === 'reviewed' ? 'ที่กำลังตรวจสอบ' : filter === 'resolved' ? 'ที่ดำเนินการแล้ว' : 'ที่ถูกปิด'}`}
              </h3>
              <p className="text-gray-500">
                {filter === 'all' ? 'คุณยังไม่เคยส่งรายงานใด ๆ' : 'ลองเปลี่ยนตัวกรองเพื่อดูรายงานอื่น'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {getReportedTypeLabel(report.reportedType)}
                        </Badge>
                        {getStatusBadge(report.status)}
                      </div>
                      <CardTitle className="text-lg mb-1">
                        รายงาน: {report.reportedName}
                      </CardTitle>
                      <p className="text-sm text-gray-500">
                        เหตุผล: {report.reason}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {report.description && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">รายละเอียด:</span> {report.description}
                        </p>
                      </div>
                    )}

                    {report.adminNotes && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-blue-900 mb-1">
                          💬 บันทึกจากแอดมิน:
                        </p>
                        <p className="text-sm text-blue-800">{report.adminNotes}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                      <span>
                        ส่งเมื่อ: {formatDistanceToNow(report.createdAt, { addSuffix: true, locale: th })}
                      </span>
                      {report.reviewedAt && (
                        <span>
                          ตรวจสอบเมื่อ: {formatDistanceToNow(report.reviewedAt, { addSuffix: true, locale: th })}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
