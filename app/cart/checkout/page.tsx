"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/components/auth-context"
import { ShoppingCart, Store, Loader2 } from "lucide-react"
import Image from "next/image"
import { PaymentMethodSelector } from "@/components/payment/payment-method-selector"

interface CheckoutItem {
  id: string
  gameId: string
  name: string
  category: string
  price: number
  image: string
  shopId: string
  shopName: string
}

interface GroupedOrder {
  shopId: string
  shopName: string
  items: CheckoutItem[]
  totalAmount: number
  platformFee: number
  sellerAmount: number
}

export default function CartCheckoutPage() {
  const { user, isInitialized } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<CheckoutItem[]>([])
  const [grandTotal, setGrandTotal] = useState(0)
  const [totalPlatformFee, setTotalPlatformFee] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState({
    promptpay: true,
    creditCard: true,
    bankTransfer: true,
  })

  useEffect(() => {
    if (!isInitialized) {
      return
    }
    
    if (!user) {
      router.push('/cart')
      return
    }

    const storedItems = sessionStorage.getItem('checkoutItems')
    if (!storedItems) {
      router.push('/cart')
      return
    }

    const parsedItems: CheckoutItem[] = JSON.parse(storedItems)
    setItems(parsedItems)

    // Validate checkout items (check shop payment setup)
    const validateCheckout = async () => {
      try {
        setLoading(true)
        
        console.log('� Validating checkout items...')
        
        const checkoutItems = parsedItems.map(item => ({
          productId: item.gameId,
          shopId: item.shopId,
          price: item.price,
          name: item.name,
        }))
        
        const response = await fetch('/api/cart/validate-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: checkoutItems,
            userId: user.uid,
          }),
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `API Error: ${response.status}`)
        }

        const data = await response.json()
        
        console.log('✅ Checkout validation successful')
        
        // Calculate totals
        setGrandTotal(data.grandTotal)
        setTotalPlatformFee(data.totalPlatformFee)
        
        // Set available payment methods
        if (data.availablePaymentMethods) {
          setAvailablePaymentMethods(data.availablePaymentMethods)
        }
      } catch (err: any) {
        console.error('Checkout validation error:', err)
        setError(err.message || 'เกิดข้อผิดพลาดในการตรวจสอบรายการชำระเงิน')
      } finally {
        setLoading(false)
      }
    }

    validateCheckout()
  }, [user, isInitialized, router])

  if (!isInitialized) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="w-12 h-12 animate-spin text-[#ff9800] mx-auto mb-4" />
              <p className="text-gray-600">กำลังตรวจสอบสิทธิ์...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="w-12 h-12 animate-spin text-[#ff9800] mx-auto mb-4" />
              <p className="text-gray-600">กำลังตรวจสอบรายการ...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    const isPaymentSetupError = error.includes('ยังไม่ได้ตั้งค่าการรับชำระเงิน')
    const shopName = isPaymentSetupError ? error.match(/ร้านค้า (.+) ยังไม่ได้ตั้งค่าการรับชำระเงิน/)?.[1] : null
    
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-[#1e1e1e] mb-2">
                {isPaymentSetupError ? 'ร้านค้ายังไม่พร้อมรับชำระเงิน' : 'เกิดข้อผิดพลาด'}
              </h2>
              {isPaymentSetupError && shopName ? (
                <div className="space-y-3 mb-6">
                  <p className="text-gray-600">
                    ร้านค้า <span className="font-semibold text-gray-900">{shopName}</span> ยังไม่ได้ตั้งค่าระบบรับชำระเงินผ่าน Omise
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
                    <p className="text-sm text-yellow-800 mb-2">
                      <strong>💡 คำแนะนำ:</strong>
                    </p>
                    <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                      <li>กรุณาติดต่อเจ้าของร้านค้าเพื่อแจ้งให้ตั้งค่าบัญชี Omise</li>
                      <li>หรือเลือกซื้อสินค้าจากร้านค้าอื่นแทน</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600 mb-6">{error}</p>
              )}
              <Button
                onClick={() => router.push('/cart')}
                className="bg-[#ff9800] hover:bg-[#ff9800]/90"
              >
                กลับไปตะกร้าสินค้า
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Group items by shop for display
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.shopId]) {
      acc[item.shopId] = {
        shopName: item.shopName,
        items: [],
      }
    }
    acc[item.shopId].items.push(item)
    return acc
  }, {} as Record<string, { shopName: string; items: CheckoutItem[] }>)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-[#1e1e1e] mb-8">ชำระเงิน</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Summary */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  รายการสั่งซื้อ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(groupedItems).map(([shopId, group]) => (
                  <div key={shopId} className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <Store className="w-4 h-4" />
                      {group.shopName}
                    </div>
                    {group.items.map((item) => (
                      <div key={item.id} className="flex gap-3 pb-3 border-b last:border-0">
                        <div className="relative w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1e1e1e] truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-gray-500">{item.category}</p>
                          <p className="text-sm font-bold text-[#ff9800] mt-1">
                            ฿{item.price.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                {/* Total Breakdown */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>ยอดชำระทั้งหมด</span>
                    <span className="text-[#ff9800]">฿{grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Orders Info */}
            <Card>
              <CardContent className="p-4">
                <div className="text-sm space-y-2">
                  <p className="flex items-center justify-between">
                    <span className="text-gray-600">จำนวนสินค้า:</span>
                    <span className="font-medium">{items.length} รายการ</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="text-gray-600">จำนวนร้านค้า:</span>
                    <span className="font-medium">{Object.keys(groupedItems).length} ร้าน</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Form */}
          <div className="lg:col-span-2">
            <PaymentMethodSelector
              amount={grandTotal}
              items={items}
              availablePaymentMethods={availablePaymentMethods}
              onPaymentSuccess={() => {
                // Payment success is handled by PromptPayQRPayment component
                // It will auto-redirect to orders page
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
