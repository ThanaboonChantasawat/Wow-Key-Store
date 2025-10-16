"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  Receipt,
  User as UserIcon,
  Mail,
  Phone,
  Shield,
  Info,
  Calendar
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-context"
import { Loading } from "@/components/ui/loading"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/components/firebase-config"

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
  payment_intent: string | null
  metadata?: { [key: string]: string }
  billing_details?: {
    email?: string | null
    name?: string | null
    phone?: string | null
  } | null
  outcome?: {
    network_status: string
    risk_level?: string
    seller_message?: string
  } | null
  payment_method_details: {
    type: string
    card?: {
      brand: string
      last4: string
      exp_month?: number
      exp_year?: number
    }
  } | null
}

interface Order {
  id: string
  paymentIntentId: string
}

export default function SellerSalesHistory() {
  const [charges, setCharges] = useState<Charge[]>([])
  const [orders, setOrders] = useState<{ [key: string]: string }>({}) // Map paymentIntentId -> orderId
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()

  const fetchCharges = async () => {
    if (!user) return
    
    try {
      setRefreshing(true)
      const response = await fetch(`/api/stripe/charges?userId=${user.uid}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('📊 Charges data:', data)
        
        // Filter ออก test transactions (ที่มีคำว่า "Test" ใน description)
        const filteredCharges = data.charges.filter((charge: Charge) => {
          const isTest = charge.description?.includes('Test') || 
                         charge.metadata?.productName?.includes('Test')
          if (isTest) {
            console.log('🧪 Hiding test transaction:', charge.id, charge.description)
          }
          return !isTest // ซ่อนถ้าเป็น test
        })
        
        console.log('✅ Filtered charges (hide tests):', filteredCharges.length)
        setCharges(filteredCharges)
        
        // ดึง orders ที่เกี่ยวข้องกับ payment_intent
        const paymentIntents = filteredCharges
          .map((c: Charge) => c.payment_intent)
          .filter((pi: string | null) => pi !== null)
        
        console.log('💳 Payment Intents from charges:', paymentIntents)
        console.log('💳 Total payment intents:', paymentIntents.length)
        
        if (paymentIntents.length > 0) {
          await fetchOrders(paymentIntents)
        } else {
          console.log('⚠️ No payment intents found in charges')
        }
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

  const fetchOrders = async (paymentIntents: string[]) => {
    try {
      console.log('🔍 Fetching orders for payment intents:', paymentIntents)
      
      // Firestore 'in' query จำกัดแค่ 10 items ต่อครั้ง
      const chunks = []
      for (let i = 0; i < paymentIntents.length; i += 10) {
        chunks.push(paymentIntents.slice(i, i + 10))
      }

      const orderMap: { [key: string]: string } = {}
      
      for (const chunk of chunks) {
        console.log('🔍 Querying chunk:', chunk)
        const ordersRef = collection(db, 'orders')
        const q = query(ordersRef, where('paymentIntentId', 'in', chunk))
        const snapshot = await getDocs(q)
        
        console.log(`📦 Found ${snapshot.docs.length} orders in this chunk`)
        
        snapshot.docs.forEach(doc => {
          const orderData = doc.data()
          console.log('📄 Order:', doc.id, 'PaymentIntent:', orderData.paymentIntentId)
          orderMap[orderData.paymentIntentId] = doc.id
        })
      }
      
      setOrders(orderMap)
      console.log('✅ Orders mapping:', orderMap)
      console.log('✅ Total orders loaded:', Object.keys(orderMap).length)
    } catch (error) {
      console.error('❌ Error fetching orders:', error)
    }
  }

  useEffect(() => {
    console.log('🔄 SellerSalesHistory mounted')
    console.log('👤 User:', user?.uid || 'Not logged in')
    
    if (user) {
      console.log('✅ User is logged in, fetching charges...')
      fetchCharges()
    } else {
      console.log('❌ User not logged in yet')
    }
  }, [user])

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
        <Loading text="กำลังโหลดประวัติการขาย..." />
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
                  {/* Mobile Layout */}
                  <div className="flex flex-col gap-3 md:hidden">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex gap-2 flex-1 min-w-0">
                        <div className="mt-0.5 flex-shrink-0">
                          {getStatusIcon(charge)}
                        </div>
                        <div className="flex-1 min-w-0">
                          {getStatusBadge(charge)}
                          {charge.description && (
                            <p className="text-sm font-medium mt-1 truncate">
                              {charge.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className={`text-lg font-bold flex-shrink-0 ${
                        charge.refunded ? 'text-red-600 line-through' : 'text-green-600'
                      }`}>
                        ฿{formatAmount(charge.amount)}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1.5 text-xs text-muted-foreground pl-7">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{formatDate(charge.created)}</span>
                      </span>
                      
                      {charge.payment_method_details?.card && (
                        <span className="flex items-center gap-1">
                          <CreditCard className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">
                            {getCardBrand(charge.payment_method_details.card.brand)} 
                            •••• {charge.payment_method_details.card.last4}
                          </span>
                        </span>
                      )}

                      {charge.payment_method_details?.card?.exp_month && charge.payment_method_details?.card?.exp_year && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">
                            หมดอายุ {charge.payment_method_details.card.exp_month}/{charge.payment_method_details.card.exp_year}
                          </span>
                        </span>
                      )}

                      {charge.billing_details?.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{charge.billing_details.email}</span>
                        </span>
                      )}
                      
                      {charge.billing_details?.name && (
                        <span className="flex items-center gap-1">
                          <UserIcon className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{charge.billing_details.name}</span>
                        </span>
                      )}

                      {charge.outcome?.risk_level && charge.outcome.risk_level !== 'normal' && (
                        <span className="flex items-center gap-1 text-orange-600">
                          <Shield className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">ระดับความเสี่ยง: {charge.outcome.risk_level}</span>
                        </span>
                      )}
                      
                      <span className="font-mono text-[10px] text-gray-400">
                        ID: {charge.id}
                      </span>
                    </div>
                    
                    {charge.refunded && charge.amount_refunded > 0 && (
                      <div className="text-xs text-red-600 pl-7">
                        คืนเงิน ฿{formatAmount(charge.amount_refunded)}
                      </div>
                    )}
                    
                    {/* ปุ่มดูใบเสร็จ */}
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => {
                          console.log('Mobile Button clicked!')
                          console.log('Payment Intent:', charge.payment_intent)
                          console.log('Charge ID:', charge.id)
                          console.log('Order ID:', orders[charge.payment_intent!])
                          console.log('All orders:', orders)
                          
                          if (charge.payment_intent && orders[charge.payment_intent]) {
                            // มี orderId → เปิดหน้าใบเสร็จในเว็บเรา
                            const orderId = orders[charge.payment_intent]
                            console.log('✅ Opening internal receipt with orderId:', `/receipt?orderId=${orderId}`)
                            router.push(`/receipt?orderId=${orderId}`)
                          } else {
                            // ไม่มี orderId → ใช้ chargeId แทน
                            console.log('⚠️ No order found, using chargeId:', charge.id)
                            router.push(`/receipt?chargeId=${charge.id}`)
                          }
                        }}
                      >
                        ดูใบเสร็จ
                      </Button>
                      
                      {/* Badge เตือนว่าข้อมูลไม่ครบ */}
                      {charge.payment_intent && !orders[charge.payment_intent] && (
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-yellow-700 bg-yellow-100 rounded">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            ข้อมูลไม่ครบ
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden md:flex items-start justify-between gap-4">
                    {/* Left: Main Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-lg truncate">
                          {charge.description || 'ไม่มีรายละเอียด'}
                        </span>
                        <Badge variant={charge.refunded ? 'destructive' : 'default'}>
                          {charge.refunded ? 'คืนเงินแล้ว' : 'สำเร็จ'}
                        </Badge>
                      </div>
                      
                      {/* ข้อมูลการชำระเงิน */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CreditCard className="w-3 h-3 flex-shrink-0" />
                          {charge.payment_method_details?.card?.brand?.toUpperCase()} •••• {charge.payment_method_details?.card?.last4}
                        </span>
                        
                        {charge.payment_method_details?.card?.exp_month && charge.payment_method_details?.card?.exp_year && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 flex-shrink-0" />
                            หมดอายุ {charge.payment_method_details.card.exp_month}/{charge.payment_method_details.card.exp_year}
                          </span>
                        )}
                      </div>
                      
                      {/* ข้อมูลลูกค้า */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
                        {charge.billing_details?.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{charge.billing_details.email}</span>
                          </span>
                        )}
                        {charge.billing_details?.name && (
                          <span className="flex items-center gap-1">
                            <UserIcon className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{charge.billing_details.name}</span>
                          </span>
                        )}
                        {charge.outcome?.risk_level && charge.outcome.risk_level !== 'normal' && (
                          <span className="flex items-center gap-1 text-orange-600">
                            <Shield className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">ระดับความเสี่ยง: {charge.outcome.risk_level}</span>
                          </span>
                        )}
                      </div>
                      
                      {/* Transaction ID */}
                      <div className="text-xs text-muted-foreground mt-2">
                        รหัสธุรกรรม: {charge.id}
                      </div>
                    </div>

                    {/* Right: Amount & Actions */}
                    <div className="text-right flex flex-col items-end gap-2 flex-shrink-0">
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
                      
                      {/* ปุ่มและ Badge */}
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            console.log('Desktop Button clicked!')
                            console.log('Payment Intent:', charge.payment_intent)
                            console.log('Charge ID:', charge.id)
                            console.log('Order ID:', orders[charge.payment_intent!])
                            console.log('All orders:', orders)
                            
                            if (charge.payment_intent && orders[charge.payment_intent]) {
                              // มี orderId → เปิดหน้าใบเสร็จในเว็บเรา
                              const orderId = orders[charge.payment_intent]
                              console.log('✅ Opening internal receipt with orderId:', `/receipt?orderId=${orderId}`)
                              router.push(`/receipt?orderId=${orderId}`)
                            } else {
                              // ไม่มี orderId → ใช้ chargeId แทน
                              console.log('⚠️ No order found, using chargeId:', charge.id)
                              router.push(`/receipt?chargeId=${charge.id}`)
                            }
                          }}
                          className="text-xs"
                        >
                          ดูใบเสร็จ
                        </Button>
                        
                        {/* Badge เตือนว่าข้อมูลไม่ครบ */}
                        {charge.payment_intent && !orders[charge.payment_intent] && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-yellow-700 bg-yellow-100 rounded whitespace-nowrap">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            ข้อมูลไม่ครบ
                          </span>
                        )}
                      </div>
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