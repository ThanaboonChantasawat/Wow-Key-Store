"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  ArrowDownToLine, 
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  Building2,
  TrendingUp,
  Wallet,
  AlertCircle
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-context"
import { Loading } from "@/components/ui/loading"

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

interface BalanceData {
  available: number
  pending: number
  totalEarnings: number
  totalPaid: number
  confirmedOrdersCount: number
  pendingOrdersCount: number
}

export default function SellerPayouts() {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [balance, setBalance] = useState<BalanceData | null>(null)
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [withdrawing, setWithdrawing] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const fetchPayouts = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setRefreshing(true)
      
      // Fetch balance
      const balanceRes = await fetch(`/api/seller/balance?userId=${user.uid}`)
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json()
        console.log('💰 Balance loaded:', balanceData)
        setBalance(balanceData.balance)
      } else {
        const errorData = await balanceRes.json()
        console.error('Failed to fetch balance:', errorData)
        toast({
          title: "ไม่สามารถโหลดยอดเงินได้",
          description: errorData.error || "กรุณาลองใหม่อีกครั้ง",
          variant: "destructive",
        })
      }
      
      // Fetch payout history from Firestore
      const sellerPayoutRes = await fetch(`/api/seller/payouts?userId=${user.uid}`)
      if (sellerPayoutRes.ok) {
        const data = await sellerPayoutRes.json()
        setPayouts(data.payouts || [])
      } else {
        console.warn('Failed to fetch payouts')
        setPayouts([])
      }
    } catch (error) {
      console.error('Error fetching payouts:', error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleWithdraw = async () => {
    if (!user || !withdrawAmount) return

    const amount = parseFloat(withdrawAmount)
    
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "จำนวนเงินไม่ถูกต้อง",
        description: "กรุณากรอกจำนวนเงินที่ต้องการถอน",
        variant: "destructive",
      })
      return
    }

    if (balance && amount > balance.available) {
      toast({
        title: "ยอดเงินไม่เพียงพอ",
        description: `คุณมียอดเงินที่ถอนได้ ฿${balance.available.toFixed(2)} เท่านั้น`,
        variant: "destructive",
      })
      return
    }

    try {
      setWithdrawing(true)
      
      const response = await fetch('/api/seller/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          amount,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "✅ ขอถอนเงินสำเร็จ",
          description: `กำลังโอนเงิน ฿${amount.toFixed(2)} เข้าบัญชีธนาคารของคุณ`,
        })
        setWithdrawDialogOpen(false)
        setWithdrawAmount("")
        fetchPayouts() // Refresh data
      } else {
        // Specific error messages
        let errorMessage = data.error || "ไม่สามารถขอถอนเงินได้"
        
        if (data.error === 'Bank account not configured') {
          errorMessage = "กรุณาตั้งค่าบัญชีธนาคารก่อนถอนเงิน\nไปที่ หน้าแรก → ตั้งค่าร้านค้า"
        } else if (data.error === 'Payouts not enabled for this account') {
          errorMessage = "บัญชีของคุณยังไม่พร้อมรับเงิน\nกรุณาตรวจสอบการตั้งค่าบัญชีธนาคาร"
        } else if (data.error === 'Insufficient balance') {
          errorMessage = `ยอดเงินไม่เพียงพอ\nคุณมีเงินพร้อมถอน ฿${data.availableBalance?.toFixed(2) || '0.00'}`
        }
        
        toast({
          title: "ไม่สามารถถอนเงินได้",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error requesting payout:', error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      })
    } finally {
      setWithdrawing(false)
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
        return 'รอดำเนินการโอนเงิน'
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
        <Loading text="กำลังโหลดข้อมูลการโอนเงิน..." />
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
            ถอนเงินเข้าบัญชีธนาคาร
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

      {/* Withdraw Card */}
      {balance ? (
        <Card className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-5 h-5 text-green-600" />
                  <p className="text-sm font-medium text-green-700">ยอดเงินพร้อมถอน</p>
                </div>
                <p className="text-4xl font-bold text-green-900 mb-1">
                  ฿{balance.available.toFixed(2)}
                </p>
                <p className="text-xs text-green-600">
                  จาก {balance.confirmedOrdersCount} คำสั่งซื้อที่ผู้ซื้อยืนยันแล้ว
                </p>
              </div>
              <Button
                onClick={() => setWithdrawDialogOpen(true)}
                disabled={balance.available <= 0}
                size="lg"
                className="bg-green-600 hover:bg-green-700"
              >
                <ArrowDownToLine className="w-5 h-5 mr-2" />
                ถอนเงิน
              </Button>
            </div>
            
            {balance.pending > 0 && (
              <div className="mt-4 pt-4 border-t border-green-200">
                <p className="text-sm text-green-700">
                  <Clock className="w-4 h-4 inline mr-1" />
                  รอผู้ซื้อยืนยัน: ฿{balance.pending.toFixed(2)} ({balance.pendingOrdersCount} คำสั่งซื้อ)
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-yellow-900 mb-1">ไม่สามารถโหลดยอดเงินได้</p>
                <p className="text-sm text-yellow-700">
                  กรุณาตรวจสอบว่าคุณได้ตั้งค่าบัญชีธนาคารแล้ว
                  หรือลองรีเฟรชหน้านี้อีกครั้ง
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                ระบบจะโอนเงินเข้าบัญชีธนาคารของคุณตามรอบที่กำหนด
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
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">ℹ️ เกี่ยวกับการถอนเงิน</p>
              <ul className="space-y-1 text-blue-700">
                <li>• เงินจากคำสั่งซื้อที่<strong>ผู้ซื้อยืนยันรับสินค้าแล้ว</strong>จึงจะถอนได้</li>
                <li>• เงินที่ถอนจะโอนเข้าบัญชีธนาคารที่คุณตั้งค่าไว้</li>
                <li>• ระบบจะดำเนินการโอนเงินตามรอบที่กำหนด (2-3 วันทำการ)</li>
                <li>• คุณสามารถตรวจสอบข้อมูลบัญชีธนาคารได้ในหน้าตั้งค่าร้านค้า</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ถอนเงินเข้าบัญชีธนาคาร</DialogTitle>
            <DialogDescription>
              ระบุจำนวนเงินที่ต้องการถอน (สูงสุด ฿{balance?.available.toFixed(2) || '0.00'})
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">จำนวนเงิน (บาท)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  ฿
                </span>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="pl-8"
                  min="0"
                  step="0.01"
                  max={balance?.available || 0}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWithdrawAmount(((balance?.available || 0) * 0.25).toFixed(2))}
              >
                25%
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWithdrawAmount(((balance?.available || 0) * 0.5).toFixed(2))}
              >
                50%
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWithdrawAmount(((balance?.available || 0) * 0.75).toFixed(2))}
              >
                75%
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWithdrawAmount((balance?.available || 0).toFixed(2))}
              >
                ทั้งหมด
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <p className="font-medium mb-1">ข้อมูลการถอนเงิน:</p>
              <ul className="space-y-1 text-blue-700">
                <li>• เงินจะโอนเข้าบัญชีธนาคารที่คุณตั้งค่าไว้</li>
                <li>• ระบบจะดำเนินการโอนภายใน 2-3 วันทำการ</li>
                <li>• คุณสามารถตรวจสอบสถานะได้ในหน้านี้</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setWithdrawDialogOpen(false)
                setWithdrawAmount("")
              }}
              disabled={withdrawing}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleWithdraw}
              disabled={withdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {withdrawing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  กำลังดำเนินการ...
                </>
              ) : (
                <>
                  <ArrowDownToLine className="w-4 h-4 mr-2" />
                  ยืนยันถอนเงิน
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
