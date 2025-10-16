"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/components/auth-context"
import { ShoppingCart, Store, CreditCard, Loader2, CheckCircle } from "lucide-react"
import Image from "next/image"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

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
  stripeAccountId: string
  items: CheckoutItem[]
  totalAmount: number
  platformFee: number
  sellerAmount: number
}

function CheckoutForm({ 
  clientSecret, 
  orders, 
  grandTotal,
  totalPlatformFee 
}: { 
  clientSecret: string
  orders: GroupedOrder[]
  grandTotal: number
  totalPlatformFee: number
}) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [processing, setProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setProcessing(true)
    setErrorMessage(null)

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success?type=cart`,
        },
        redirect: "if_required",
      })

      if (error) {
        setErrorMessage(error.message || "เกิดข้อผิดพลาดในการชำระเงิน")
        setProcessing(false)
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        // Payment succeeded
        router.push(`/payment/success?payment_intent=${paymentIntent.id}&type=cart`)
      }
    } catch (err) {
      console.error("Payment error:", err)
      setErrorMessage("เกิดข้อผิดพลาดในการชำระเงิน")
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Element */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            ข้อมูลการชำระเงิน
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentElement />
        </CardContent>
      </Card>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{errorMessage}</p>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-[#ff9800] hover:bg-[#ff9800]/90 text-white font-medium py-6 text-lg"
      >
        {processing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            กำลังดำเนินการ...
          </>
        ) : (
          <>
            <CheckCircle className="w-5 h-5 mr-2" />
            ชำระเงิน ฿{grandTotal.toLocaleString()}
          </>
        )}
      </Button>

      {/* Payment Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-xs text-blue-800">
          🔒 การชำระเงินของคุณปลอดภัยและเข้ารหัสโดย Stripe
        </p>
      </div>
    </form>
  )
}

export default function CartCheckoutPage() {
  const { user, isInitialized } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<CheckoutItem[]>([])
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [orders, setOrders] = useState<GroupedOrder[]>([])
  const [grandTotal, setGrandTotal] = useState(0)
  const [totalPlatformFee, setTotalPlatformFee] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log('Cart Checkout Page: useEffect triggered')
    console.log('User:', user)
    console.log('Auth initialized:', isInitialized)
    
    // Wait for auth to finish initializing
    if (!isInitialized) {
      console.log('Auth not initialized yet, waiting...')
      return
    }
    
    if (!user) {
      console.log('No user, redirecting to cart')
      router.push('/cart')
      return
    }

    // Get items from sessionStorage
    const storedItems = sessionStorage.getItem('checkoutItems')
    console.log('Stored items from sessionStorage:', storedItems)
    
    if (!storedItems) {
      console.log('No stored items, redirecting to cart')
      router.push('/cart')
      return
    }

    const parsedItems: CheckoutItem[] = JSON.parse(storedItems)
    console.log('Parsed items:', parsedItems)
    setItems(parsedItems)

    // Create checkout session
    const createCheckoutSession = async () => {
      try {
        setLoading(true)
        
        // Prepare items for API
        const checkoutItems = parsedItems.map(item => ({
          productId: item.gameId,
          shopId: item.shopId,
          price: item.price,
          name: item.name,
        }))
        
        console.log('Checkout items prepared:', checkoutItems)
        console.log('User ID:', user.uid)

        const response = await fetch('/api/cart/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: checkoutItems,
            userId: user.uid,
          }),
        })
        
        console.log('API response status:', response.status)

        if (!response.ok) {
          const errorText = await response.text()
          console.error('API error response:', errorText)
          let errorData
          try {
            errorData = JSON.parse(errorText)
          } catch {
            errorData = { error: errorText || 'Failed to create checkout session' }
          }
          console.error('API error:', errorData)
          throw new Error(errorData.error || `API Error: ${response.status}`)
        }

        const data = await response.json()
        console.log('API response data:', data)
        
        setClientSecret(data.clientSecret)
        setOrders(data.orders)
        setGrandTotal(data.grandTotal)
        setTotalPlatformFee(data.totalPlatformFee)
      } catch (err: any) {
        console.error('Checkout error:', err)
        setError(err.message || 'เกิดข้อผิดพลาดในการสร้างรายการชำระเงิน')
      } finally {
        setLoading(false)
      }
    }

    createCheckoutSession()
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
              <p className="text-gray-600">กำลังเตรียมการชำระเงิน...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    // Check if error is about payment setup
    const isPaymentSetupError = error.includes('has not set up payment yet')
    const shopName = isPaymentSetupError ? error.match(/Shop (.+) has not set up payment yet/)?.[1] : null
    
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
                    ร้านค้า <span className="font-semibold text-gray-900">{shopName}</span> ยังไม่ได้ตั้งค่าระบบรับชำระเงิน
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
                    <p className="text-sm text-yellow-800 mb-2">
                      <strong>💡 คำแนะนำ:</strong>
                    </p>
                    <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                      <li>กรุณาติดต่อเจ้าของร้านค้าเพื่อแจ้งให้ตั้งค่า Stripe Connect</li>
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

  if (!clientSecret) {
    return null
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
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">ยอดรวม</span>
                    <span className="font-medium">฿{grandTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">ค่าธรรมเนียมแพลตฟอร์ม (10%)</span>
                    <span className="font-medium">฿{totalPlatformFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
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
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#ff9800',
                  },
                },
              }}
            >
              <CheckoutForm
                clientSecret={clientSecret}
                orders={orders}
                grandTotal={grandTotal}
                totalPlatformFee={totalPlatformFee}
              />
            </Elements>
          </div>
        </div>
      </div>
    </div>
  )
}
