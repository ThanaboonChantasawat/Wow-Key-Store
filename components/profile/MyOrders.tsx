"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loading } from "@/components/ui/loading"
import { 
  Package, 
  ShoppingBag, 
  Clock, 
  CheckCircle, 
  XCircle,
  Store,
  Calendar,
  DollarSign,
  Key,
  Copy,
  Check
} from "lucide-react"

interface OrderItem {
  productId: string
  name: string
  price: number
}

interface Order {
  id: string
  userId: string
  shopId: string
  shopName: string
  items: OrderItem[]
  totalAmount: number
  platformFee: number
  sellerAmount: number
  paymentIntentId: string
  transferId?: string
  paymentStatus: 'pending' | 'completed' | 'failed'
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
  email?: string
  username?: string
  password?: string
  additionalInfo?: string
  sellerNotes?: string
  gameCodeDeliveredAt?: string
  createdAt: string
  updatedAt: string
}

export function MyOrdersContent() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchOrders()
    }
  }, [user])

  const fetchOrders = async () => {
    if (!user) return

    try {
      setLoading(true)
      console.log('Fetching orders for user:', user.uid)
      
      const response = await fetch(`/api/orders/user?userId=${user.uid}`)
      
      console.log('Orders API response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Orders API error:', errorText)
        throw new Error(`Failed to fetch orders: ${response.status}`)
      }

      const data = await response.json()
      console.log('Orders data:', data)
      
      setOrders(data.orders || [])
    } catch (err) {
      console.error('Error fetching orders:', err)
      setError('ไม่สามารถโหลดข้อมูลคำสั่งซื้อได้')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Clock className="w-3 h-3 mr-1" />
            รอดำเนินการ
          </Badge>
        )
      case 'processing':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Package className="w-3 h-3 mr-1" />
            กำลังดำเนินการ
          </Badge>
        )
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            สำเร็จ
          </Badge>
        )
      case 'cancelled':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="w-3 h-3 mr-1" />
            ยกเลิก
          </Badge>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="outline" className="border-green-200 text-green-700">
            ชำระเงินแล้ว
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="outline" className="border-yellow-200 text-yellow-700">
            รอชำระเงิน
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="outline" className="border-red-200 text-red-700">
            ชำระเงินไม่สำเร็จ
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const copyToClipboard = async (text: string, orderId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(orderId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    
    try {
      const date = new Date(dateString)
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return '-'
      }
      
      return new Intl.DateTimeFormat('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)
    } catch (error) {
      console.error('Error formatting date:', error)
      return '-'
    }
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">กรุณาเข้าสู่ระบบ</h3>
          <p className="text-gray-600">คุณต้องเข้าสู่ระบบเพื่อดูคำสั่งซื้อ</p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 md:p-12">
          <Loading text="กำลังโหลดคำสั่งซื้อ..." />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 md:p-12 text-center">
          <XCircle className="w-12 h-12 md:w-16 md:h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">เกิดข้อผิดพลาด</h3>
          <p className="text-sm md:text-base text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchOrders} className="bg-[#ff9800] hover:bg-[#ff9800]/90">
            ลองอีกครั้ง
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 md:p-12 text-center">
          <ShoppingBag className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">ยังไม่มีคำสั่งซื้อ</h3>
          <p className="text-sm md:text-base text-gray-600 mb-6">คุณยังไม่มีประวัติการสั่งซื้อ เริ่มช้อปปิ้งกันเลย!</p>
          <Button 
            onClick={() => window.location.href = '/products'}
            className="bg-[#ff9800] hover:bg-[#ff9800]/90"
          >
            เลือกซื้อสินค้า
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            คำสั่งซื้อของฉัน
          </CardTitle>
        </CardHeader>
      </Card>

      {orders.map((order) => (
        <Card key={order.id}>
          <CardContent className="p-4 md:p-6">
            {/* Order Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 md:gap-4 mb-4 pb-4 border-b">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span className="font-semibold text-sm md:text-base text-gray-900 truncate">{order.shopName}</span>
                </div>
                <div className="flex items-center gap-2 text-xs md:text-sm text-gray-500">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{formatDate(order.createdAt)}</span>
                </div>
                <div className="text-xs text-gray-400 truncate">
                  คำสั่งซื้อ: {order.id.substring(0, 8)}...
                </div>
              </div>
              <div className="flex flex-row sm:flex-col gap-2">
                {getStatusBadge(order.status)}
                {getPaymentStatusBadge(order.paymentStatus)}
              </div>
            </div>

            {/* Order Items */}
            <div className="space-y-3 mb-4">
              {order.items.map((item, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm md:text-base text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs md:text-sm text-gray-500 truncate">รหัสสินค้า: {item.productId.substring(0, 8)}...</p>
                  </div>
                  <p className="font-semibold text-sm md:text-base text-[#ff9800] whitespace-nowrap">
                    ฿{item.price.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            {/* Game Account Section */}
            {(order.email || order.username || order.password || order.additionalInfo) && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-3 md:p-5 mb-4 shadow-sm">
                <div className="flex items-start gap-2 md:gap-3">
                  <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-2 md:p-3 rounded-xl shadow-md flex-shrink-0">
                    <Key className="w-4 h-4 md:w-6 md:h-6 text-white" />
                  </div>
                  <div className="flex-1 space-y-3 md:space-y-4 min-w-0">
                    <div>
                      <h4 className="text-base md:text-lg font-bold text-green-900 mb-1">🎮 ข้อมูลบัญชีเกมของคุณ</h4>
                      <p className="text-xs text-green-700">กรุณาเปลี่ยนรหัสผ่านทันทีหลังได้รับบัญชี เพื่อความปลอดภัย</p>
                    </div>
                    
                    {/* Email - Most important for mobile games */}
                    {order.email && (
                      <div className="bg-white border-2 border-green-200 rounded-lg p-3 md:p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-green-800 bg-green-100 px-2 py-1 rounded">EMAIL</span>
                          <span className="text-xs text-gray-500">(สำหรับ Login)</span>
                        </div>
                        <code className="text-sm md:text-base font-mono font-bold text-gray-900 break-all block">
                          {order.email}
                        </code>
                      </div>
                    )}

                    {/* Username / Player ID */}
                    {order.username && (
                      <div className="bg-white border-2 border-green-200 rounded-lg p-3 md:p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-blue-800 bg-blue-100 px-2 py-1 rounded">USERNAME / ID</span>
                        </div>
                        <code className="text-sm md:text-base font-mono font-bold text-gray-900 break-all block">
                          {order.username}
                        </code>
                      </div>
                    )}

                    {/* Password - Critical */}
                    {order.password && (
                      <div className="bg-white border-2 border-orange-300 rounded-lg p-3 md:p-4 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                          <span className="text-xs font-bold text-orange-800 bg-orange-100 px-2 py-1 rounded w-fit">PASSWORD</span>
                          <span className="text-xs font-semibold text-orange-600">⚠️ เปลี่ยนทันที!</span>
                        </div>
                        <code className="text-sm md:text-base font-mono font-bold text-gray-900 break-all block mb-2">
                          {order.password}
                        </code>
                        <div className="bg-orange-50 border border-orange-200 rounded p-2">
                          <p className="text-xs font-semibold text-orange-800">
                            🔒 สำคัญ: เข้าเกมแล้วเปลี่ยนรหัสผ่านใหม่ทันที เพื่อความปลอดภัยของบัญชี
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Additional Info - Account Details */}
                    {order.additionalInfo && (
                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-lg p-3 md:p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-bold text-blue-800 bg-blue-100 px-2 py-1 rounded">ข้อมูลบัญชี / คำแนะนำ</span>
                        </div>
                        <div className="bg-white rounded-lg p-2 md:p-3 border border-blue-200">
                          <p className="text-xs md:text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                            {order.additionalInfo}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Seller Notes */}
                    {order.sellerNotes && (
                      <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-1 rounded">หมายเหตุจากผู้ขาย</span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{order.sellerNotes}</p>
                      </div>
                    )}

                    {/* Delivery Time */}
                    {order.gameCodeDeliveredAt && (
                      <div className="pt-3 border-t-2 border-green-300">
                        <p className="text-xs text-green-700 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          ส่งข้อมูลบัญชีเมื่อ: {formatDate(order.gameCodeDeliveredAt)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Order Total */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">ยอดรวม</span>
                <span className="font-medium">฿{order.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">ค่าธรรมเนียมแพลตฟอร์ม (10%)</span>
                <span className="font-medium">฿{order.platformFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>ยอดชำระทั้งหมด</span>
                <span className="text-[#ff9800]">฿{order.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Order Actions */}
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = `/receipt?orderId=${order.id}`}
                className="text-xs"
              >
                ดูใบเสร็จ
              </Button>
              {order.status === 'pending' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  ยกเลิกคำสั่งซื้อ
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
