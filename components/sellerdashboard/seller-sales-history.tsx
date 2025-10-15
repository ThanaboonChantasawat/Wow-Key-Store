"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ShoppingCart, 
  RefreshCw,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  Receipt
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-context"

interface Charge {
  id: string
  amount: number
  currency: string
  status: string
  created: number
  description: string | null
  receipt_url: string | null
  paid: boolean
  refunded: boolean
  amount_refunded: number
  payment_method_details: {
    type: string
    card?: {
      brand: string
      last4: string
    }
  } | null
}

export default function SellerSalesHistory() {
  const [charges, setCharges] = useState<Charge[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const fetchCharges = async () => {
    if (!user) return
    
    try {
      setRefreshing(true)
      const response = await fetch(`/api/stripe/charges?userId=${user.uid}`)
      
      if (response.ok) {
        const data = await response.json()
        setCharges(data.charges)
      } else {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถโหลดประวัติการขายได้",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching charges:', error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดประวัติการขายได้",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchCharges()
  }, [])

  const formatAmount = (amount: number) => {
    return (amount / 100).toFixed(2)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (charge: Charge) => {
    if (charge.refunded) {
      return <Badge variant="destructive">คืนเงินแล้ว</Badge>
    }
    if (charge.paid && charge.status === 'succeeded') {
      return <Badge variant="default" className="bg-green-600">สำเร็จ</Badge>
    }
    if (charge.status === 'pending') {
      return <Badge variant="secondary">รอดำเนินการ</Badge>
    }
    if (charge.status === 'failed') {
      return <Badge variant="destructive">ล้มเหลว</Badge>
    }
    return <Badge variant="outline">{charge.status}</Badge>
  }

  const getStatusIcon = (charge: Charge) => {
    if (charge.refunded) {
      return <XCircle className="w-5 h-5 text-red-500" />
    }
    if (charge.paid && charge.status === 'succeeded') {
      return <CheckCircle className="w-5 h-5 text-green-500" />
    }
    if (charge.status === 'pending') {
      return <Clock className="w-5 h-5 text-yellow-500" />
    }
    return <XCircle className="w-5 h-5 text-gray-400" />
  }

  const getCardBrand = (brand: string) => {
    const brands: { [key: string]: string } = {
      'visa': '💳 Visa',
      'mastercard': '💳 Mastercard',
      'amex': '💳 Amex',
      'discover': '💳 Discover',
      'jcb': '💳 JCB',
      'unionpay': '💳 UnionPay',
    }
    return brands[brand.toLowerCase()] || `💳 ${brand}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">📊 ประวัติการขาย</h2>
          <p className="text-muted-foreground mt-1">
            รายการธุรกรรมทั้งหมดของคุณ
          </p>
        </div>
        <Button 
          onClick={fetchCharges} 
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          รีเฟรช
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ยอดขายทั้งหมด</p>
                <p className="text-2xl font-bold">{charges.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">สำเร็จ</p>
                <p className="text-2xl font-bold">
                  {charges.filter(c => c.paid && c.status === 'succeeded' && !c.refunded).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">คืนเงิน</p>
                <p className="text-2xl font-bold">
                  {charges.filter(c => c.refunded).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales List */}
      <Card>
        <CardHeader>
          <CardTitle>รายการธุรกรรม</CardTitle>
        </CardHeader>
        <CardContent>
          {charges.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-muted-foreground">ยังไม่มีรายการขาย</p>
              <p className="text-sm text-muted-foreground mt-1">
                เมื่อมีลูกค้าซื้อสินค้า รายการจะแสดงที่นี่
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {charges.map((charge) => (
                <div 
                  key={charge.id} 
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Status Icon & Details */}
                    <div className="flex gap-3 flex-1">
                      <div className="mt-1">
                        {getStatusIcon(charge)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm text-muted-foreground">
                            {charge.id}
                          </span>
                          {getStatusBadge(charge)}
                        </div>
                        
                        {charge.description && (
                          <p className="text-sm font-medium mb-1">
                            {charge.description}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(charge.created)}
                          </span>
                          
                          {charge.payment_method_details?.card && (
                            <span className="flex items-center gap-1">
                              <CreditCard className="w-3 h-3" />
                              {getCardBrand(charge.payment_method_details.card.brand)} 
                              •••• {charge.payment_method_details.card.last4}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount & Actions */}
                    <div className="text-right flex flex-col items-end gap-2">
                      <div>
                        <div className={`text-xl font-bold ${
                          charge.refunded ? 'text-red-600 line-through' : 'text-green-600'
                        }`}>
                          ฿{formatAmount(charge.amount)}
                        </div>
                        {charge.refunded && charge.amount_refunded > 0 && (
                          <div className="text-xs text-muted-foreground">
                            คืน ฿{formatAmount(charge.amount_refunded)}
                          </div>
                        )}
                      </div>
                      
                      {charge.receipt_url && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => window.open(charge.receipt_url!, '_blank')}
                        >
                          <Receipt className="w-3 h-3 mr-1" />
                          ใบเสร็จ
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
