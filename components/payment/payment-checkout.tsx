"use client"

import { useState, useEffect } from "react"
import { loadStripe } from "@stripe/stripe-js"
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, CheckCircle2, XCircle, CreditCard, Lock } from "lucide-react"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface CheckoutFormProps {
  clientSecret: string
  amount: number
  productName: string
  onSuccess: () => void
  onCancel: () => void
}

function CheckoutForm({ clientSecret, amount, productName, onSuccess, onCancel }: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setMessage(null)

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success`,
        },
        redirect: "if_required",
      })

      if (error) {
        setMessage(error.message || "เกิดข้อผิดพลาดในการชำระเงิน")
        toast({
          title: "การชำระเงินล้มเหลว",
          description: error.message,
          variant: "destructive",
        })
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        toast({
          title: "ชำระเงินสำเร็จ! 🎉",
          description: "ขอบคุณสำหรับการสั่งซื้อ",
        })
        onSuccess()
      }
    } catch (err: any) {
      setMessage("เกิดข้อผิดพลาดที่ไม่คาดคิด")
      console.error("Payment error:", err)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Product Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-700 mb-1">คุณกำลังซื้อ</p>
            <p className="font-semibold text-blue-900">{productName}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-700 mb-1">ยอดชำระ</p>
            <p className="text-2xl font-bold text-blue-900">
              ฿{(amount / 100).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Payment Element */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold">ข้อมูลการชำระเงิน</h3>
        </div>
        <PaymentElement />
      </div>

      {/* Error Message */}
      {message && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{message}</p>
        </div>
      )}

      {/* Security Note */}
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <Lock className="w-4 h-4" />
        <p>การชำระเงินของคุณปลอดภัยด้วย Stripe</p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1"
        >
          ยกเลิก
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              กำลังดำเนินการ...
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 mr-2" />
              ชำระเงิน ฿{(amount / 100).toFixed(2)}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

interface PaymentCheckoutProps {
  amount: number // in smallest currency unit (satang)
  currency: string
  sellerId: string
  orderId: string
  productName: string
  buyerEmail: string
  onSuccess: () => void
  onCancel: () => void
}

export default function PaymentCheckout({
  amount,
  currency,
  sellerId,
  orderId,
  productName,
  buyerEmail,
  onSuccess,
  onCancel,
}: PaymentCheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [platformFee, setPlatformFee] = useState<number>(0)
  const { toast } = useToast()

  useEffect(() => {
    createPaymentIntent()
  }, [])

  const createPaymentIntent = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency,
          sellerId,
          orderId,
          productName,
          buyerEmail,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment intent')
      }

      setClientSecret(data.clientSecret)
      setPlatformFee(data.platformFee)
    } catch (err: any) {
      setError(err.message)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-12 pb-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-muted-foreground">กำลังเตรียมการชำระเงิน...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-12 pb-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <XCircle className="w-12 h-12 text-red-500" />
            <div className="text-center">
              <p className="font-semibold text-red-900 mb-2">เกิดข้อผิดพลาด</p>
              <p className="text-sm text-red-700 mb-4">{error}</p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={onCancel}>
                  กลับ
                </Button>
                <Button onClick={createPaymentIntent}>
                  ลองอีกครั้ง
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!clientSecret) {
    return null
  }

  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#3b82f6',
    },
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-6 h-6" />
          💳 ชำระเงิน
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance,
          }}
        >
          <CheckoutForm
            clientSecret={clientSecret}
            amount={amount}
            productName={productName}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />
        </Elements>

        {/* Fee Info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">ยอดรวมทั้งหมด</span>
              <span className="font-medium text-lg">฿{(amount / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
