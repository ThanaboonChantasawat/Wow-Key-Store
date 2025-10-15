"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Wallet, 
  TrendingUp, 
  Clock, 
  RefreshCw,
  AlertCircle,
  DollarSign,
  Calendar,
  ArrowUpRight
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface BalanceData {
  available: Array<{ amount: number; currency: string }>
  pending: Array<{ amount: number; currency: string }>
  currency: string
}

interface Statistics {
  today: number
  week: number
  month: number
  currency: string
}

interface NextPayout {
  id: string
  amount: number
  currency: string
  arrival_date: number
  status: string
}

export default function SellerEarnings() {
  const [balance, setBalance] = useState<BalanceData | null>(null)
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [nextPayout, setNextPayout] = useState<NextPayout | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()

  const fetchData = async () => {
    try {
      setRefreshing(true)

      // Fetch balance
      const balanceRes = await fetch('/api/stripe/balance')
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json()
        setBalance(balanceData)
      }

      // Fetch statistics
      const statsRes = await fetch('/api/stripe/balance-transactions')
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStatistics(statsData.statistics)
      }

      // Fetch next payout
      const payoutsRes = await fetch('/api/stripe/payouts')
      if (payoutsRes.ok) {
        const payoutsData = await payoutsRes.json()
        if (payoutsData.payouts && payoutsData.payouts.length > 0) {
          // Find next pending payout
          const pending = payoutsData.payouts.find((p: NextPayout) => p.status === 'pending')
          if (pending) {
            setNextPayout(pending)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching earnings data:', error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลรายได้ได้",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
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

  const getDaysUntil = (timestamp: number) => {
    const now = new Date()
    const target = new Date(timestamp * 1000)
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const availableAmount = balance?.available?.[0]?.amount || 0
  const pendingAmount = balance?.pending?.[0]?.amount || 0
  const totalAmount = availableAmount + pendingAmount

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">💰 รายได้ของฉัน</h2>
          <p className="text-muted-foreground mt-1">
            ติดตามยอดเงินและสถิติการขายของคุณ
          </p>
        </div>
        <Button 
          onClick={fetchData} 
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          รีเฟรช
        </Button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Available Balance */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              พร้อมโอน
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">
              ฿{formatAmount(availableAmount)}
            </div>
            <p className="text-xs text-green-600 mt-2">
              สามารถโอนเข้าบัญชีธนาคารได้
            </p>
          </CardContent>
        </Card>

        {/* Pending Balance */}
        <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-yellow-700 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              รอดำเนินการ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-900">
              ฿{formatAmount(pendingAmount)}
            </div>
            <p className="text-xs text-yellow-600 mt-2">
              รอการตรวจสอบจาก Stripe
            </p>
          </CardContent>
        </Card>

        {/* Total Balance */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              ยอดรวม
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">
              ฿{formatAmount(totalAmount)}
            </div>
            <p className="text-xs text-blue-600 mt-2">
              ยอดเงินทั้งหมดในบัญชี
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Next Payout */}
      {nextPayout && (
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-purple-900 mb-1">
                  📅 รอบโอนเงินถัดไป
                </h3>
                <p className="text-sm text-purple-700 mb-2">
                  {formatDate(nextPayout.arrival_date)}
                  {getDaysUntil(nextPayout.arrival_date) > 0 && (
                    <span className="ml-2 text-purple-600">
                      (อีก {getDaysUntil(nextPayout.arrival_date)} วัน)
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-purple-900">
                    ฿{formatAmount(nextPayout.amount)}
                  </span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                    {nextPayout.status === 'pending' ? 'กำลังดำเนินการ' : nextPayout.status}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      {statistics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              📊 สถิติการขาย
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Today */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  วันนี้
                </div>
                <div className="text-2xl font-bold">฿{formatAmount(statistics.today)}</div>
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <ArrowUpRight className="w-3 h-3" />
                  ยอดขายประจำวัน
                </div>
              </div>

              {/* This Week */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  สัปดาห์นี้
                </div>
                <div className="text-2xl font-bold">฿{formatAmount(statistics.week)}</div>
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <ArrowUpRight className="w-3 h-3" />
                  ยอดขายสัปดาห์นี้
                </div>
              </div>

              {/* This Month */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                  เดือนนี้
                </div>
                <div className="text-2xl font-bold">฿{formatAmount(statistics.month)}</div>
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <ArrowUpRight className="w-3 h-3" />
                  ยอดขายเดือนนี้
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Note */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">ℹ️ หมายเหตุ</p>
              <ul className="space-y-1 text-blue-700">
                <li>• ยอดเงินจะถูกโอนเข้าบัญชีธนาคารตามรอบที่ Stripe กำหนด</li>
                <li>• ค่าธรรมเนียม Stripe จะถูกหักออกจากยอดขายอัตโนมัติ</li>
                <li>• สถิติแสดงเฉพาะยอดสุทธิหลังหักค่าธรรมเนียม</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
