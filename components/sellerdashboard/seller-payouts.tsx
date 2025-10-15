"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowDownToLine, 
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  Building2,
  TrendingUp
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-context"

interface Payout {
  id: string
  amount: number
  currency: string
  status: string
  arrival_date: number
  created: number
  description: string | null
  destination: string | null
}

export default function SellerPayouts() {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const fetchPayouts = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setRefreshing(true)
      const response = await fetch(`/api/stripe/payouts?userId=${user.uid}`)
      
      if (response.ok) {
        const data = await response.json()
        setPayouts(data.payouts)
      } else {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถโหลดข้อมูลการโอนเงินได้",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching payouts:', error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลการโอนเงินได้",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchPayouts()
  }, [])

  const formatAmount = (amount: number) => {
    return (amount / 100).toFixed(2)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getDaysUntil = (timestamp: number) => {
    const now = new Date()
    const target = new Date(timestamp * 1000)
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-600">โอนสำเร็จ</Badge>
      case 'pending':
        return <Badge variant="secondary">กำลังดำเนินการ</Badge>
      case 'in_transit':
        return <Badge variant="secondary">กำลังโอน</Badge>
      case 'canceled':
        return <Badge variant="destructive">ยกเลิก</Badge>
      case 'failed':
        return <Badge variant="destructive">ล้มเหลว</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'pending':
      case 'in_transit':
        return <Clock className="w-5 h-5 text-yellow-500" />
      case 'canceled':
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'โอนเงินเข้าบัญชีธนาคารเรียบร้อยแล้ว'
      case 'pending':
        return 'รอ Stripe ดำเนินการโอนเงิน'
      case 'in_transit':
        return 'กำลังโอนเงินเข้าบัญชีธนาคาร'
      case 'canceled':
        return 'การโอนเงินถูกยกเลิก'
      case 'failed':
        return 'การโอนเงินล้มเหลว กรุณาตรวจสอบข้อมูลธนาคาร'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const totalPaid = payouts
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0)

  const totalPending = payouts
    .filter(p => p.status === 'pending' || p.status === 'in_transit')
    .reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">💸 การโอนเงิน</h2>
          <p className="text-muted-foreground mt-1">
            ประวัติการโอนเงินเข้าบัญชีธนาคาร
          </p>
        </div>
        <Button 
          onClick={fetchPayouts} 
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          รีเฟรช
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-700">โอนสำเร็จ</p>
                <p className="text-2xl font-bold text-green-900">
                  ฿{formatAmount(totalPaid)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-yellow-700">กำลังดำเนินการ</p>
                <p className="text-2xl font-bold text-yellow-900">
                  ฿{formatAmount(totalPending)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-700">จำนวนครั้ง</p>
                <p className="text-2xl font-bold text-blue-900">
                  {payouts.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payouts List */}
      <Card>
        <CardHeader>
          <CardTitle>ประวัติการโอนเงิน</CardTitle>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <div className="text-center py-12">
              <ArrowDownToLine className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-muted-foreground">ยังไม่มีรายการโอนเงิน</p>
              <p className="text-sm text-muted-foreground mt-1">
                Stripe จะโอนเงินเข้าบัญชีธนาคารของคุณตามรอบที่กำหนด
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {payouts.map((payout) => {
                const daysUntil = getDaysUntil(payout.arrival_date)
                const isPast = daysUntil < 0
                const isToday = daysUntil === 0
                
                return (
                  <div 
                    key={payout.id} 
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Status & Details */}
                      <div className="flex gap-3 flex-1">
                        <div className="mt-1">
                          {getStatusIcon(payout.status)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusBadge(payout.status)}
                            <span className="font-mono text-xs text-muted-foreground">
                              {payout.id}
                            </span>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            {getStatusText(payout.status)}
                          </p>
                          
                          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span className="font-medium">วันที่โอน:</span>
                              {formatDate(payout.arrival_date)}
                              {!isPast && (
                                <span className="text-blue-600 font-medium">
                                  {isToday ? '(วันนี้)' : `(อีก ${daysUntil} วัน)`}
                                </span>
                              )}
                            </span>
                            
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span className="font-medium">สร้างเมื่อ:</span>
                              {formatDateTime(payout.created)}
                            </span>
                            
                            {payout.destination && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                <span className="font-medium">บัญชีธนาคาร:</span>
                                {payout.destination}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount */}
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${
                          payout.status === 'paid' 
                            ? 'text-green-600' 
                            : payout.status === 'failed' || payout.status === 'canceled'
                            ? 'text-red-600'
                            : 'text-yellow-600'
                        }`}>
                          ฿{formatAmount(payout.amount)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {payout.currency.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Note */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">ℹ️ เกี่ยวกับการโอนเงิน</p>
              <ul className="space-y-1 text-blue-700">
                <li>• Stripe จะโอนเงินเข้าบัญชีธนาคารตามรอบที่กำหนด (มักเป็นรายวันหรือรายสัปดาห์)</li>
                <li>• การโอนเงินอาจใช้เวลา 2-3 วันทำการจึงจะปรากฏในบัญชีธนาคาร</li>
                <li>• หากการโอนเงินล้มเหลว กรุณาตรวจสอบข้อมูลธนาคารในการตั้งค่า Stripe</li>
                <li>• คุณสามารถเปลี่ยนรอบการโอนเงินได้ใน Stripe Dashboard</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
