"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ReviewForm } from "@/components/review/review-form"
import { useAuth } from "@/components/auth-context"
import { 
  Receipt, 
  Loader2, 
  Download, 
  ArrowLeft,
  CheckCircle,
  Store,
  Calendar,
  CreditCard,
  Package,
  Star
} from "lucide-react"

interface OrderItem {
  productId: string
  name: string
  price: number
}

interface ShopOrder {
  shopId: string
  shopName: string
  amount: number
  platformFee: number
  sellerAmount: number
  items: OrderItem[]
}

interface Order {
  id: string
  userId: string
  type?: string // 'cart_checkout' or undefined for direct orders
  shopId?: string // for direct orders
  shopName?: string // for direct orders
  productId?: string // for direct orders
  productName?: string // for direct orders
  shops?: ShopOrder[] // for cart checkout orders
  items?: OrderItem[] // for direct orders
  totalAmount: number
  platformFee: number
  sellerAmount?: number
  paymentIntentId?: string
  transferId?: string
  paymentStatus: string
  status: string
  buyerConfirmed?: boolean
  gameCodeDeliveredAt?: string
  createdAt: string
  updatedAt: string
  isFromStripeMetadata?: boolean // เพิ่ม flag บอกว่ามาจาก Stripe
}

function ReceiptPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const orderId = searchParams.get('orderId')
  const chargeId = searchParams.get('chargeId')
  const from = searchParams.get('from') // 'seller' or 'buyer'
  
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showReviewForm, setShowReviewForm] = useState(false)

  useEffect(() => {
    if (orderId) {
      fetchOrder(orderId)
    } else if (chargeId) {
      fetchOrderByChargeId(chargeId)
    } else {
      setError('ไม่พบหมายเลขคำสั่งซื้อหรือรหัสธุรกรรม')
      setLoading(false)
    }
  }, [orderId, chargeId])

  const fetchOrder = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/orders/${id}`)
      
      if (!response.ok) {
        throw new Error('ไม่พบคำสั่งซื้อ')
      }

      const data = await response.json()
      setOrder(data.order)
    } catch (err: any) {
      console.error('Error fetching order:', err)
      setError(err.message || 'ไม่สามารถโหลดข้อมูลคำสั่งซื้อได้')
    } finally {
      setLoading(false)
    }
  }

  const fetchOrderByChargeId = async (id: string) => {
    try {
      setLoading(true)
      console.log('🔍 Fetching order by chargeId:', id)
      
      const url = `/api/orders/by-charge/${id}`
      console.log('📡 Calling API:', url)
      
      const response = await fetch(url)
      console.log('📥 Response status:', response.status)
      console.log('📥 Response ok:', response.ok)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API Error response:', errorText)
        throw new Error('ไม่พบคำสั่งซื้อจากรหัสธุรกรรมนี้')
      }

      const data = await response.json()
      console.log('✅ Order data received:', data)
      console.log('🏪 Shop Name:', data.order?.shopName)
      console.log('📦 Items:', data.order?.items)
      console.log('💰 Total Amount:', data.order?.totalAmount)
      console.log('📋 Full Order:', JSON.stringify(data.order, null, 2))
      setOrder(data.order)
    } catch (err: any) {
      console.error('❌ Error fetching order by charge:', err)
      console.error('❌ Error stack:', err.stack)
      setError(err.message || 'ไม่สามารถโหลดข้อมูลคำสั่งซื้อได้')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date)
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#ff9800] mx-auto mb-4" />
          <p className="text-gray-600">กำลังโหลดใบเสร็จ...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-12 text-center">
            <Receipt className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">ไม่พบใบเสร็จ</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => router.push('/profile?tab=my-orders')}>
              กลับไปหน้าคำสั่งซื้อ
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 print:bg-white print:py-0">
      <div className="container mx-auto px-4 max-w-3xl print:px-2 print:max-w-full">
        {/* Header Actions - Hidden on print */}
        <div className="mb-6 flex gap-3 print:hidden">
          <Button
            variant="outline"
            onClick={() => {
              if (from === 'seller') {
                router.push('/seller')
              } else {
                router.push('/profile?tab=my-orders')
              }
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            กลับ
          </Button>
          <Button
            onClick={handlePrint}
            className="bg-[#ff9800] hover:bg-[#ff9800]/90"
          >
            <Download className="w-4 h-4 mr-2" />
            พิมพ์ใบเสร็จ
          </Button>
        </div>

        {/* Warning Badge - เมื่อข้อมูลมาจาก Stripe */}
        {order.isFromStripeMetadata && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg print:hidden">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800 mb-1">ข้อมูลไม่สมบูรณ์</h3>
                <p className="text-sm text-yellow-700">
                  ใบเสร็จนี้แสดงข้อมูลจากระบบชำระเงิน (Stripe) เนื่องจากยังไม่พบข้อมูลคำสั่งซื้อในระบบ 
                  ข้อมูลบางส่วนอาจไม่ครบถ้วน เช่น ชื่อร้านค้า รายละเอียดสินค้า และข้อมูลบัญชีเกม
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Receipt Card */}
        <Card className="print:shadow-none print:border-0">
          <CardHeader className="text-center border-b pb-6 print:pb-3">
            <div className="flex justify-center mb-4 print:mb-2">
              <div className="bg-green-100 p-4 rounded-full print:p-2">
                <CheckCircle className="w-12 h-12 text-green-600 print:w-8 print:h-8" />
              </div>
            </div>
            <CardTitle className="text-2xl mb-2 print:text-xl print:mb-1">ใบเสร็จรับเงิน</CardTitle>
            <p className="text-sm text-gray-500 print:text-xs">Wow Key Store</p>
          </CardHeader>

          <CardContent className="p-8 print:p-4">
            {/* Order Info */}
            <div className="grid grid-cols-2 gap-4 mb-6 print:gap-2 print:mb-3">
              <div>
                <p className="text-sm text-gray-500 mb-1 print:text-xs">หมายเลขคำสั่งซื้อ</p>
                <p className="font-mono text-sm font-semibold print:text-xs">{order.id}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 mb-1 print:text-xs">วันที่</p>
                <p className="text-sm font-semibold print:text-xs">{formatDate(order.createdAt)}</p>
              </div>
            </div>

            <Separator className="my-6 print:my-3" />

            {/* Shop Info */}
            <div className="mb-6 print:mb-3">
              <div className="flex items-center gap-2 mb-2 print:mb-1">
                <Store className="w-4 h-4 text-gray-500 print:w-3 print:h-3" />
                <p className="text-sm font-semibold print:text-xs">ข้อมูลร้านค้า</p>
              </div>
              {order.type === 'cart_checkout' ? (
                <div>
                  <p className="text-lg font-bold text-gray-900 print:text-base">
                    {order.shops?.length || 0} ร้านค้า
                  </p>
                  <div className="mt-2 space-y-1">
                    {order.shops?.map((shop, index) => (
                      <p key={index} className="text-sm text-gray-600 print:text-xs">
                        • {shop.shopName}
                      </p>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-lg font-bold text-gray-900 print:text-base">{order.shopName || 'ไม่ระบุ'}</p>
                  {order.shopId && <p className="text-sm text-gray-500 print:text-xs">รหัสร้าน: {order.shopId}</p>}
                </>
              )}
            </div>

            <Separator className="my-6 print:my-3" />

            {/* Items */}
            <div className="mb-6 print:mb-3">
              <div className="flex items-center gap-2 mb-4 print:mb-2">
                <Package className="w-4 h-4 text-gray-500 print:w-3 print:h-3" />
                <p className="text-sm font-semibold print:text-xs">รายการสินค้า</p>
              </div>
              
              <div className="space-y-3 print:space-y-2">
                {order.type === 'cart_checkout' ? (
                  // Cart checkout order - group by shop
                  order.shops?.map((shop, shopIndex) => (
                    <div key={shopIndex} className="space-y-2">
                      <p className="text-sm font-semibold text-gray-700 print:text-xs mt-3">
                        {shop.shopName}
                      </p>
                      {shop.items.map((item, itemIndex) => (
                        <div key={`${shopIndex}-${itemIndex}`} className="flex justify-between items-start print:text-sm pl-4">
                          <div className="flex-1">
                            <p className="font-medium print:text-sm">{item.name}</p>
                            <p className="text-xs text-gray-500">รหัส: {item.productId}</p>
                          </div>
                          <p className="font-semibold ml-4 print:text-sm">
                            ฿{item.price.toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  // Direct order
                  order.items?.map((item, index) => (
                    <div key={index} className="flex justify-between items-start print:text-sm">
                      <div className="flex-1">
                        <p className="font-medium print:text-sm">{item.name}</p>
                        <p className="text-xs text-gray-500">รหัส: {item.productId}</p>
                      </div>
                      <p className="font-semibold ml-4 print:text-sm">
                        ฿{item.price.toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <Separator className="my-6 print:my-3" />

            {/* Totals */}
            <div className="space-y-3 print:space-y-2">
              <div className="flex justify-between text-lg font-bold print:text-base">
                <span>ยอดชำระทั้งหมด</span>
                <span className="text-[#ff9800]">฿{order.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <Separator className="my-6 print:my-3" />

            {/* Payment Info */}
            <div className="mb-6 print:mb-3">
              <div className="flex items-center gap-2 mb-3 print:mb-2">
                <CreditCard className="w-4 h-4 text-gray-500 print:w-3 print:h-3" />
                <p className="text-sm font-semibold print:text-xs">ข้อมูลการชำระเงิน</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm print:gap-2 print:text-xs">
                <div>
                  <p className="text-gray-500">สถานะการชำระเงิน</p>
                  <p className="font-medium text-green-600">
                    {order.paymentStatus === 'completed' ? 'ชำระเงินแล้ว' : order.paymentStatus}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">สถานะคำสั่งซื้อ</p>
                  <p className="font-medium">
                    {order.status === 'pending' && 'รอดำเนินการ'}
                    {order.status === 'processing' && 'กำลังดำเนินการ'}
                    {order.status === 'completed' && 'สำเร็จ'}
                    {order.status === 'cancelled' && 'ยกเลิก'}
                  </p>
                </div>
                <div className="col-span-2 print:hidden">
                  <p className="text-gray-500">Payment Intent ID</p>
                  <p className="font-mono text-xs">{order.paymentIntentId}</p>
                </div>
                {order.transferId && (
                  <div className="col-span-2 print:hidden">
                    <p className="text-gray-500">Transfer ID</p>
                    <p className="font-mono text-xs">{order.transferId}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t text-center text-sm text-gray-500 print:mt-4 print:pt-3 print:text-xs">
              <p>ขอบคุณที่ใช้บริการ Wow Key Store</p>
              <p className="mt-2 print:mt-1">หากมีข้อสงสัย กรุณาติดต่อฝ่ายบริการลูกค้า</p>
            </div>
          </CardContent>
        </Card>

        {/* Review Section - Only show if buyer confirmed delivery */}
        {user && order.userId === user.uid && order.buyerConfirmed && order.status === 'completed' && !showReviewForm && (
          <Card className="mt-6 print:hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                  <div>
                    <h3 className="font-semibold text-lg">รีวิวการซื้อของคุณ</h3>
                    <p className="text-sm text-gray-600">แบ่งปันประสบการณ์ของคุณกับผู้อื่น</p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowReviewForm(true)}
                  className="bg-[#ff9800] hover:bg-[#e08800]"
                >
                  <Star className="w-4 h-4 mr-2" />
                  เขียนรีวิว
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Review Form */}
        {showReviewForm && order.shopId && order.shopName && (
          <div className="mt-6 print:hidden">
            <ReviewForm
              type={order.productId ? "product" : "shop"}
              shopId={order.shopId}
              shopName={order.shopName}
              productId={order.productId}
              productName={order.productName}
              orderId={order.id}
              onSuccess={() => {
                setShowReviewForm(false)
                router.refresh()
              }}
              onCancel={() => setShowReviewForm(false)}
            />
          </div>
        )}

        {/* Print Footer */}
        <div className="hidden print:block mt-8 text-center text-xs text-gray-400">
          <p>เอกสารนี้พิมพ์จากระบบ Wow Key Store</p>
          <p>พิมพ์เมื่อ: {formatDate(new Date().toISOString())}</p>
        </div>
      </div>
    </div>
  )
}

export default function ReceiptPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-[#ff9800] mx-auto mb-4" />
            <p className="text-gray-600">กำลังโหลด...</p>
          </div>
        </div>
      }
    >
      <ReceiptPageContent />
    </Suspense>
  )
}
