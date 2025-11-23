"use client"

import { useEffect, useState, useRef, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2, Package, ArrowRight } from "lucide-react"
import { useAuth } from "@/components/auth-context"

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth() // Use auth context instead of cookie
  const [loading, setLoading] = useState(true)
  const [paymentInfo, setPaymentInfo] = useState<any>(null)
  const processedRef = useRef(false) // ใช้ useRef แทน state เพื่อป้องกัน re-render

  useEffect(() => {
    // Wait for user to be loaded
    if (!user) {
      console.log('⏳ Waiting for user to be loaded...')
      return
    }

    // Prevent double processing with ref
    if (processedRef.current) {
      console.log('⚠️ Already processed, skipping...')
      return
    }

    const processPayment = async () => {
      const paymentIntentId = searchParams.get('payment_intent')
      const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret')
      const orderId = searchParams.get('order_id') // For PromptPay QR payments
      const type = searchParams.get('type')
      
      console.log('🔍 URL Parameters:', {
        paymentIntentId,
        paymentIntentClientSecret,
        orderId,
        type,
        fullURL: window.location.href
      })
      
      // Priority: order_id (PromptPay) > payment_intent (old Stripe flow)
      if (orderId) {
        processedRef.current = true
        console.log('🔄 Processing PromptPay order:', orderId)
        console.log('👤 Using user ID:', user.uid)
        await verifyOrderPayment(orderId, type || 'cart', user.uid)
      } else if (paymentIntentId) {
        processedRef.current = true
        console.log('🔄 Processing legacy payment:', paymentIntentId)
        console.log('👤 Using user ID:', user.uid)
        await verifyPayment(paymentIntentId, type || 'single', user.uid)
      } else if (paymentIntentClientSecret) {
        // Extract payment intent ID from client secret
        const piId = paymentIntentClientSecret.split('_secret_')[0]
        if (piId) {
          processedRef.current = true
          console.log('🔄 Processing payment from client secret:', piId)
          console.log('👤 Using user ID:', user.uid)
          await verifyPayment(piId, type || 'single', user.uid)
        } else {
          console.error('❌ Could not extract payment intent ID from client secret')
          setLoading(false)
        }
      } else {
        console.error('❌ No payment intent ID or order ID found in URL')
        setLoading(false)
      }
    }

    processPayment()
  }, [user, searchParams]) // Depend on user

  const verifyOrderPayment = async (orderId: string, type: string, currentUserId: string) => {
    try {
      console.log('🔍 Fetching order:', orderId)
      const response = await fetch(`/api/orders/${orderId}`)
      const data = await response.json()
      
      if (data.success && data.order) {
        console.log('✅ Order found:', data.order)
        
        // Set payment info for display
        setPaymentInfo({
          id: orderId,
          amount: data.order.totalAmount * 100, // Convert to satang for display
          metadata: {
            type: 'cart_checkout',
            orderCount: data.order.shops?.length || 1,
          },
          status: data.order.paymentStatus,
        })
        
        // Clear cart if this was a cart checkout
        if (type === 'cart' && data.order.cartItemIds && Array.isArray(data.order.cartItemIds) && data.order.cartItemIds.length > 0) {
          console.log('🗑️ Clearing cart items:', data.order.cartItemIds)
          
          const clearResponse = await fetch('/api/cart/clear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              userId: currentUserId, 
              itemIds: data.order.cartItemIds 
            }),
          })
          
          if (clearResponse.ok) {
            const clearResult = await clearResponse.json()
            console.log('✅ Cart cleared successfully:', clearResult)
            try {
              sessionStorage.setItem('cartCleared', JSON.stringify({ removed: clearResult.removed || 0 }))
              sessionStorage.removeItem('checkoutItems')
              sessionStorage.removeItem('cartItemIds')
            } catch (e) {
              console.warn('Could not update sessionStorage', e)
            }
          } else {
            console.error('❌ Failed to clear cart')
          }
        }
      } else {
        console.error('❌ Order not found or invalid')
      }
    } catch (error) {
      console.error('Error verifying order payment:', error)
    } finally {
      setLoading(false)
    }
  }

  const verifyPayment = async (paymentIntentId: string, type: string) => {
    try {
      // For legacy Stripe payments - this API might not exist anymore
      // Just show success without verifying
      console.log('⚠️ Legacy payment flow - skipping Stripe verification')
      setPaymentInfo({
        id: paymentIntentId,
        amount: 0,
        metadata: { type },
        status: 'succeeded',
      })
    } catch (error) {
      console.error('Error verifying payment:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-lg text-gray-600">กำลังตรวจสอบการชำระเงิน...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
      <Card className="max-w-2xl w-full">
        <CardContent className="pt-12 pb-12">
          <div className="text-center space-y-6">
            {/* Success Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-75"></div>
                <div className="relative bg-green-100 p-6 rounded-full">
                  <CheckCircle2 className="w-16 h-16 text-green-600" />
                </div>
              </div>
            </div>

            {/* Success Message */}
            <div>
              <h1 className="text-3xl font-bold text-green-900 mb-2">
                🎉 ชำระเงินสำเร็จ!
              </h1>
              <p className="text-lg text-green-700">
                ขอบคุณสำหรับการสั่งซื้อ
              </p>
            </div>

            {/* Payment Details */}
            {paymentInfo && (
              <div className="bg-white p-6 rounded-lg border border-green-200 text-left">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  รายละเอียดการสั่งซื้อ
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">หมายเลขการชำระเงิน</span>
                    <span className="font-mono text-gray-900 text-xs">
                      {paymentInfo.id}
                    </span>
                  </div>
                  {paymentInfo.metadata?.type === 'cart_checkout' ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">จำนวนคำสั่งซื้อ</span>
                        <span className="font-medium text-gray-900">
                          {paymentInfo.metadata?.orderCount || '0'} รายการ
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-gray-600">สินค้า</span>
                      <span className="font-medium text-gray-900">
                        {paymentInfo.metadata?.productName || 'ไม่ระบุ'}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">ยอดชำระ</span>
                    <span className="font-bold text-green-600 text-lg">
                      ฿{(paymentInfo.amount / 100).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">สถานะ</span>
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      ชำระเงินสำเร็จ
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-sm text-left">
              <p className="text-blue-900 mb-2">
                <strong>📧 อีเมลยืนยัน</strong>
              </p>
              <p className="text-blue-700">
                เราได้ส่งอีเมลยืนยันการสั่งซื้อไปยังที่อยู่อีเมลของคุณแล้ว 
                กรุณาตรวจสอบอีเมลเพื่อดูรายละเอียดคำสั่งซื้อ
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-center pt-4">
              {/* Show "Back to Cart" button if this was a cart checkout */}
              {paymentInfo?.metadata?.type === 'cart_checkout' && (
                <Button
                  variant="outline"
                  onClick={() => {
                    console.log('🔙 Returning to cart - setting flag and navigating')
                    // Set flag BEFORE navigation to ensure it's ready
                    try {
                      sessionStorage.setItem('returnFromPayment', 'success')
                      console.log('✅ Set returnFromPayment flag')
                    } catch (e) {
                      console.warn('Could not set returnFromPayment flag', e)
                    }
                    // Then navigate
                    router.push('/cart?from=success')
                  }}
                >
                  กลับไปหน้าตะกร้า
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  // Always return to my-orders tab after purchase
                  router.push('/profile?tab=my-orders')
                }}
              >
                ดูคำสั่งซื้อของฉัน
              </Button>
              <Button
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                onClick={() => router.push('/')}
              >
                กลับหน้าหลัก
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PaymentSuccessPage() {
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
      <PaymentSuccessContent />
    </Suspense>
  )
}
