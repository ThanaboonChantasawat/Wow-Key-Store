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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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
  AlertCircle,
  Smartphone,
  CreditCard,
  Star,
  Loader2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-context"
import { Loading } from "@/components/ui/loading"
import { BankAccount } from "@/lib/bank-account-types"

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
  const [withdrawStep, setWithdrawStep] = useState<1 | 2>(1) // Step 1: Select account, Step 2: Enter amount
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")
  const [withdrawing, setWithdrawing] = useState(false)
  const [shopData, setShopData] = useState<any>(null)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const { toast } = useToast()
  const { user } = useAuth()

  const fetchPayouts = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      // Fetch shop data for payment methods
      const shopRes = await fetch(`/api/shops/owner/${user.uid}`)
      if (shopRes.ok) {
        const shopData = await shopRes.json()
        console.log('🏪 Shop data loaded:', shopData.shop)
        setShopData(shopData.shop)
        
        // Fetch bank accounts (new multi-account system)
        if (shopData.shop?.shopId) {
          const accountsRes = await fetch(`/api/seller/bank-accounts?shopId=${shopData.shop.shopId}`)
          if (accountsRes.ok) {
            const accountsData = await accountsRes.json()
            const enabledAccounts = (accountsData.accounts || []).filter((acc: BankAccount) => acc.isEnabled)
            setBankAccounts(enabledAccounts)
            console.log('💳 Loaded enabled accounts:', enabledAccounts.length)
            
            // Set default account as selected
            const defaultAccount = enabledAccounts.find((acc: BankAccount) => acc.isDefault)
            if (defaultAccount) {
              setSelectedAccountId(defaultAccount.id)
            } else if (enabledAccounts.length > 0) {
              setSelectedAccountId(enabledAccounts[0].id)
            }
          }
        }
      } else {
        console.error('Failed to fetch shop data:', await shopRes.text())
      }
      
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
    if (!user || !withdrawAmount || !selectedAccountId) return

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

    const selectedAccount = bankAccounts.find(acc => acc.id === selectedAccountId)
    if (!selectedAccount) {
      toast({
        title: "กรุณาเลือกบัญชี",
        variant: "destructive",
      })
      return
    }

    // Check if account is verified
    if (selectedAccount.verificationStatus !== 'verified') {
      toast({
        title: "บัญชียังไม่ได้รับการยืนยัน",
        description: selectedAccount.verificationStatus === 'pending' 
          ? "กรุณารอการยืนยันบัญชีให้เสร็จสิ้น (ประมาณ 1-2 นาที)"
          : "บัญชีนี้ยังไม่ได้รับการยืนยัน กรุณาตรวจสอบข้อมูลบัญชี หรือเพิ่มบัญชีใหม่",
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
          accountId: selectedAccountId, // Send account ID instead of method
        }),
      })

      const data = await response.json()

      if (response.ok) {
        const accountInfo = selectedAccount.accountType === 'promptpay' 
          ? `พร้อมเพย์: ${selectedAccount.promptPayId}`
          : `${selectedAccount.bankName} ${selectedAccount.bankAccountNumber}`
        
        toast({
          title: "✅ ขอถอนเงินสำเร็จ",
          description: `กำลังถอนเงิน ฿${amount.toFixed(2)} เข้า${accountInfo}`,
        })
        setWithdrawDialogOpen(false)
        setWithdrawAmount("")
        setWithdrawStep(1)
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
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchPayouts()
    }, 30000)
    
    return () => clearInterval(interval)
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
        return 'ถอนเงินเข้าบัญชีธนาคารเรียบร้อยแล้ว'
      case 'pending':
        return 'รอดำเนินการถอนเงิน'
      case 'in_transit':
        return 'กำลังถอนเงินเข้าบัญชีธนาคาร'
      case 'canceled':
        return 'การถอนเงินถูกยกเลิก'
      case 'failed':
        return 'การถอนเงินล้มเหลว กรุณาตรวจสอบข้อมูลธนาคาร'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading text="กำลังโหลดข้อมูลการถอนเงิน..." />
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">💸 การถอนเงิน</h2>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          จัดการการถอนเงินและตรวจสอบประวัติการโอน (อัปเดตอัตโนมัติทุก 30 วินาที)
        </p>
      </div>

      {/* Withdraw Card */}
      {balance ? (
        <Card className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-green-200">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="w-full sm:w-auto">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  <p className="text-xs sm:text-sm font-medium text-green-700">ยอดเงินพร้อมถอน</p>
                </div>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-900 mb-1">
                  ฿{balance.available.toFixed(2)}
                </p>
                <p className="text-xs sm:text-sm text-green-600">
                  จาก {balance.confirmedOrdersCount} คำสั่งซื้อที่ผู้ซื้อยืนยันแล้ว
                </p>
              </div>
              <Button
                onClick={() => setWithdrawDialogOpen(true)}
                disabled={balance.available <= 0}
                size="lg"
                className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
              >
                <ArrowDownToLine className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                ถอนเงิน
              </Button>
            </div>
            
            {balance.pending > 0 && (
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-green-200">
                <p className="text-xs sm:text-sm text-green-700">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                  รอผู้ซื้อยืนยัน: ฿{balance.pending.toFixed(2)} ({balance.pendingOrdersCount} คำสั่งซื้อ)
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-start gap-2 sm:gap-3">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-yellow-900 mb-1 text-sm sm:text-base">ไม่สามารถโหลดยอดเงินได้</p>
                <p className="text-xs sm:text-sm text-yellow-700">
                  กรุณาตรวจสอบว่าคุณได้ตั้งค่าบัญชีธนาคารแล้ว
                  หรือลองรีเฟรชหน้านี้อีกครั้ง
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-green-700">โอนสำเร็จ</p>
                <p className="text-xl sm:text-2xl font-bold text-green-900">
                  ฿{formatAmount(totalPaid)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-yellow-700">กำลังดำเนินการ</p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-900">
                  ฿{formatAmount(totalPending)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-blue-700">จำนวนครั้ง</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-900">
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
          <CardTitle className="text-lg sm:text-xl">ประวัติการถอนเงิน</CardTitle>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <ArrowDownToLine className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm sm:text-base">ยังไม่มีรายการถอนเงิน</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                ระบบจะถอนเงินเข้าบัญชีธนาคารของคุณตามรอบที่กำหนด
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {payouts.map((payout) => {
                const daysUntil = getDaysUntil(payout.arrival_date)
                const isPast = daysUntil < 0
                const isToday = daysUntil === 0
                
                return (
                  <div 
                    key={payout.id} 
                    className="p-3 sm:p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                      {/* Left: Status & Details */}
                      <div className="flex gap-2 sm:gap-3 flex-1 w-full">
                        <div className="mt-1">
                          {getStatusIcon(payout.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                            {getStatusBadge(payout.status)}
                            <span className="font-mono text-xs text-muted-foreground truncate">
                              {payout.id}
                            </span>
                          </div>
                          
                          <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                            {getStatusText(payout.status)}
                          </p>
                          
                          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
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
                      <div className="text-left sm:text-right w-full sm:w-auto">
                        <div className={`text-xl sm:text-2xl font-bold ${
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
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex gap-2 sm:gap-3">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-blue-800">
              <p className="font-medium mb-1">ℹ️ เกี่ยวกับการถอนเงิน</p>
              <ul className="space-y-1 text-blue-700">
                <li>• เงินจากคำสั่งซื้อที่<strong>ผู้ซื้อยืนยันรับสินค้าแล้ว</strong>จึงจะถอนได้</li>
                <li>• เงินที่ถอนจะโอนเข้าบัญชีธนาคารที่คุณตั้งค่าไว้</li>
                <li>• ระบบจะดำเนินการถอนเงินตามรอบที่กำหนด (2-3 วันทำการ)</li>
                <li>• คุณสามารถตรวจสอบข้อมูลบัญชีธนาคารได้ในหน้าตั้งค่าร้านค้า</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={(open) => {
        setWithdrawDialogOpen(open)
        if (!open) {
          setWithdrawStep(1)
          setWithdrawAmount("")
        }
      }}>
        <DialogContent className="max-w-full sm:max-w-md md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {withdrawStep === 1 ? 'เลือกบัญชีที่ต้องการถอนเงิน' : 'ระบุจำนวนเงินที่ต้องการถอน'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {withdrawStep === 1 
                ? 'กรุณาเลือกบัญชีปลายทางสำหรับการรับเงิน' 
                : `สูงสุด ฿${balance?.available.toFixed(2) || '0.00'}`
              }
            </DialogDescription>
          </DialogHeader>
          
          {withdrawStep === 1 ? (
            /* Step 1: Select Account */
            <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
              {bankAccounts.length > 0 ? (
                <RadioGroup 
                  value={selectedAccountId} 
                  onValueChange={(value: string) => {
                    console.log('Selected account:', value)
                    setSelectedAccountId(value)
                  }}
                >
                  {bankAccounts.map((account) => (
                    <div 
                      key={account.id}
                      className="flex items-start space-x-2 sm:space-x-3 border rounded-lg p-3 sm:p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => {
                        if (account.verificationStatus === 'verified') {
                          setSelectedAccountId(account.id)
                        }
                      }}
                    >
                      <RadioGroupItem 
                        value={account.id} 
                        id={account.id} 
                        className="mt-1"
                        disabled={account.verificationStatus !== 'verified'}
                      />
                      <Label htmlFor={account.id} className="flex-1 cursor-pointer">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                          {account.accountType === 'promptpay' ? (
                            <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                          ) : (
                            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                          )}
                          <span className="font-medium text-sm sm:text-base">{account.displayName}</span>
                          {account.isDefault && (
                            <Badge variant="default" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              บัญชีหลัก
                            </Badge>
                          )}
                          {/* Verification Badge */}
                          {account.verificationStatus === 'verified' && (
                            <Badge variant="default" className="text-xs bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              ยืนยันแล้ว
                            </Badge>
                          )}
                          {account.verificationStatus === 'pending' && (
                            <Badge variant="secondary" className="text-xs bg-yellow-500 text-white">
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              รอยืนยัน
                            </Badge>
                          )}
                          {account.verificationStatus === 'failed' && (
                            <Badge variant="destructive" className="text-xs">
                              <XCircle className="h-3 w-3 mr-1" />
                              ล้มเหลว
                            </Badge>
                          )}
                        </div>
                        
                        {account.accountType === 'promptpay' ? (
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {account.promptPayType === 'mobile' ? '📱 ' : '🆔 '}
                            {account.promptPayId}
                          </p>
                        ) : (
                          <div className="text-xs sm:text-sm text-muted-foreground space-y-0.5">
                            <p>🏦 {account.bankName}</p>
                            <p>เลขบัญชี: {account.bankAccountNumber}</p>
                            <p>ชื่อบัญชี: {account.bankAccountName}</p>
                          </div>
                        )}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <div className="text-center py-6 sm:py-8 text-muted-foreground">
                  <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-orange-500" />
                  <p className="text-sm sm:text-base">ยังไม่มีบัญชีสำหรับรับเงิน</p>
                  <p className="text-xs sm:text-sm mt-1">กรุณาตั้งค่าบัญชีธนาคารหรือพร้อมเพย์</p>
                </div>
              )}
            </div>
          ) : (
            /* Step 2: Enter Amount */
            <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
              <div className="bg-accent/50 border rounded-lg p-2.5 sm:p-3 mb-3 sm:mb-4">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">จะถอนเงินเข้า:</p>
                {(() => {
                  const selectedAccount = bankAccounts.find(acc => acc.id === selectedAccountId)
                  if (!selectedAccount) return null
                  
                  return (
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {selectedAccount.accountType === 'promptpay' ? (
                        <>
                          <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                          <span className="font-medium text-xs sm:text-sm">{selectedAccount.displayName}</span>
                          <span className="text-xs sm:text-sm text-muted-foreground truncate">
                            {selectedAccount.promptPayId}
                          </span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                          <span className="font-medium text-xs sm:text-sm">{selectedAccount.displayName}</span>
                          <span className="text-xs sm:text-sm text-muted-foreground truncate">
                            {selectedAccount.bankName} - {selectedAccount.bankAccountNumber}
                          </span>
                        </>
                      )}
                    </div>
                  )
                })()}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm">จำนวนเงิน (บาท)</Label>
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

              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs sm:text-sm h-8 sm:h-9"
                  onClick={() => setWithdrawAmount(((balance?.available || 0) * 0.25).toFixed(2))}
                >
                  25%
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs sm:text-sm h-8 sm:h-9"
                  onClick={() => setWithdrawAmount(((balance?.available || 0) * 0.5).toFixed(2))}
                >
                  50%
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs sm:text-sm h-8 sm:h-9"
                  onClick={() => setWithdrawAmount(((balance?.available || 0) * 0.75).toFixed(2))}
                >
                  75%
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs sm:text-sm h-8 sm:h-9"
                  onClick={() => setWithdrawAmount((balance?.available || 0).toFixed(2))}
                >
                  ทั้งหมด
                </Button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 sm:p-3 text-xs sm:text-sm text-blue-800">
                <p className="font-medium mb-1">ข้อมูลการถอนเงิน:</p>
                <ul className="space-y-1 text-blue-700">
                  <li>• เงินจะโอนเข้าบัญชีที่คุณเลือก</li>
                  <li>• ระบบจะดำเนินการโอนภายใน 2-3 วันทำการ</li>
                  <li>• คุณสามารถตรวจสอบสถานะได้ในหน้านี้</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {withdrawStep === 2 && (
              <Button
                variant="outline"
                onClick={() => setWithdrawStep(1)}
                disabled={withdrawing}
                className="w-full sm:w-auto"
              >
                ย้อนกลับ
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setWithdrawDialogOpen(false)
                setWithdrawStep(1)
                setWithdrawAmount("")
              }}
              disabled={withdrawing}
              className="w-full sm:w-auto"
            >
              ยกเลิก
            </Button>
            {withdrawStep === 1 ? (
              <Button
                onClick={() => {
                  const selectedAccount = bankAccounts.find(acc => acc.id === selectedAccountId)
                  if (selectedAccount?.verificationStatus !== 'verified') {
                    toast({
                      title: "บัญชียังไม่ได้รับการยืนยัน",
                      description: selectedAccount?.verificationStatus === 'pending'
                        ? "กรุณารอการยืนยันบัญชีให้เสร็จสิ้น (ประมาณ 1-2 นาที)"
                        : "กรุณาเลือกบัญชีที่ได้รับการยืนยันแล้ว",
                      variant: "destructive",
                    })
                    return
                  }
                  setWithdrawStep(2)
                }}
                disabled={!selectedAccountId || bankAccounts.length === 0}
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
              >
                ถัดไป
              </Button>
            ) : (
              <Button
                onClick={handleWithdraw}
                disabled={withdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
              >
                {withdrawing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {withdrawing ? 'กำลังดำเนินการ...' : 'ยืนยันถอนเงิน'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
