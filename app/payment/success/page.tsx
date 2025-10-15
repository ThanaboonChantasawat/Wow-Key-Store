"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2, Package, ArrowRight } from "lucide-react"

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [paymentInfo, setPaymentInfo] = useState<any>(null)

  useEffect(() => {
    const paymentIntentId = searchParams.get('payment_intent')
    
    if (paymentIntentId) {
      verifyPayment(paymentIntentId)
    } else {
      setLoading(false)
    }
  }, [searchParams])

  const verifyPayment = async (paymentIntentId: string) => {
    try {
      const response = await fetch(`/api/stripe/payment-intent?paymentIntentId=${paymentIntentId}`)
      const data = await response.json()
      
      if (data.success) {
        setPaymentInfo(data.paymentIntent)
      }
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
                    <span className="text-gray-600">หมายเลขคำสั่งซื้อ</span>
                    <span className="font-mono text-gray-900">
                      {paymentInfo.metadata?.orderId || paymentInfo.id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">สินค้า</span>
                    <span className="font-medium text-gray-900">
                      {paymentInfo.metadata?.productName || 'ไม่ระบุ'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ยอดชำระ</span>
                    <span className="font-bold text-green-600 text-lg">
                      ฿{(paymentInfo.amount / 100).toFixed(2)}
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
              <Button
                variant="outline"
                onClick={() => router.push('/profile')}
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
