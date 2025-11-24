"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle2, XCircle, CreditCard, Lock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface OmiseCreditCardPaymentProps {
  orderId: string
  amount: number
  onPaymentSuccess?: () => void
  onPaymentFailed?: () => void
}

export function OmiseCreditCardPayment({ 
  orderId, 
  amount, 
  onPaymentSuccess, 
  onPaymentFailed 
}: OmiseCreditCardPaymentProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'form' | 'processing' | 'success' | 'failed'>('form')
  const [error, setError] = useState<string | null>(null)
  const [redirecting, setRedirecting] = useState(false)
  const isProcessingRef = useRef(false) // Prevent double submission
  
  // Card form fields
  const [cardNumber, setCardNumber] = useState('')
  const [cardName, setCardName] = useState('')
  const [expiryMonth, setExpiryMonth] = useState('')
  const [expiryYear, setExpiryYear] = useState('')
  const [cvv, setCvv] = useState('')

  console.log('🔷 OmiseCreditCardPayment mounted with:', { orderId, amount })

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '')
    const chunks = cleaned.match(/.{1,4}/g)
    return chunks ? chunks.join(' ') : cleaned
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove all non-digit characters first
    const value = e.target.value.replace(/\D/g, '')
    // Only allow up to 16 digits
    if (value.length <= 16) {
      setCardNumber(formatCardNumber(value))
      setError(null) // Clear error when user types
    }
  }

  const handleExpiryMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value.length <= 2 && /^\d*$/.test(value)) {
      setExpiryMonth(value)
      setError(null) // Clear error when user types
    }
  }

  const handleExpiryYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value.length <= 4 && /^\d*$/.test(value)) {
      setExpiryYear(value)
      setError(null) // Clear error when user types
    }
  }

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value.length <= 3 && /^\d*$/.test(value)) {
      setCvv(value)
      setError(null) // Clear error when user types
    }
  }

  const validateForm = () => {
    const cleanedCardNumber = cardNumber.replace(/\s/g, '')
    
    if (cleanedCardNumber.length !== 16) {
      setError('หมายเลขบัตรไม่ถูกต้อง')
      return false
    }
    
    if (!cardName.trim()) {
      setError('กรุณากรอกชื่อบนบัตร')
      return false
    }
    
    const month = parseInt(expiryMonth)
    if (!expiryMonth || month < 1 || month > 12) {
      setError('เดือนหมดอายุไม่ถูกต้อง')
      return false
    }
    
    const year = parseInt(expiryYear)
    const currentYear = new Date().getFullYear()
    if (!expiryYear || year < currentYear || year > currentYear + 20) {
      setError('ปีหมดอายุไม่ถูกต้อง')
      return false
    }
    
    if (cvv.length < 3) {
      setError('CVV ไม่ถูกต้อง')
      return false
    }
    
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent double submission
    if (isProcessingRef.current) {
      console.log('⚠️ Payment already processing, ignoring duplicate request')
      return
    }
    
    if (!validateForm()) {
      return
    }

    try {
      // Mark as processing immediately
      isProcessingRef.current = true
      setLoading(true)
      setStatus('processing')
      setError(null)

      console.log('💳 Processing credit card payment for order:', orderId)

      const response = await fetch('/api/payment/omise-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amount,
          card: {
            number: cardNumber.replace(/\s/g, ''),
            name: cardName,
            expiration_month: expiryMonth,
            expiration_year: expiryYear,
            security_code: cvv,
          },
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        console.log('✅ Payment successful!')
        setStatus('success')
        
        toast({
          title: "✅ ชำระเงินสำเร็จ!",
          description: "เราได้รับการชำระเงินของคุณแล้ว กำลังนำคุณไปยังหน้าคำสั่งซื้อ...",
          duration: 3000,
        })
        
        onPaymentSuccess?.()
        
        setRedirecting(true)
        setTimeout(() => {
          router.push('/profile?tab=my-orders')
        }, 2000)
      } else {
        // Reset processing flag on error to allow retry
        isProcessingRef.current = false
        throw new Error(data.error || 'การชำระเงินล้มเหลว')
      }
    } catch (err: any) {
      console.error('❌ Payment failed:', err)
      // Reset processing flag on error
      isProcessingRef.current = false
      setStatus('failed')
      setError(err.message || 'เกิดข้อผิดพลาดในการชำระเงิน')
      
      toast({
        title: "❌ การชำระเงินล้มเหลว",
        description: err.message || "กรุณาตรวจสอบข้อมูลบัตรและลองใหม่อีกครั้ง",
        variant: "destructive",
        duration: 5000,
      })
      
      onPaymentFailed?.()
    } finally {
      setLoading(false)
    }
  }

  if (status === 'processing') {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-16 w-16 animate-spin text-purple-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">กำลังดำเนินการชำระเงิน</h3>
            <p className="text-muted-foreground">กรุณารอสักครู่...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (status === 'success') {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle2 className="h-16 w-16 text-green-600 mb-4 animate-bounce" />
          <h3 className="text-2xl font-bold text-green-900 mb-2">ชำระเงินสำเร็จ!</h3>
          <p className="text-green-700 mb-4">ขอบคุณที่ชำระเงิน เราได้รับการยืนยันแล้ว</p>
          {redirecting && (
            <div className="flex items-center gap-2 text-green-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p className="text-sm">กำลังนำคุณไปยังหน้าคำสั่งซื้อ...</p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (status === 'failed') {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-8">
          <div className="flex flex-col items-center text-center">
            <XCircle className="h-16 w-16 text-red-600 mb-4" />
            <h3 className="text-xl font-bold text-red-900 mb-2">การชำระเงินล้มเหลว</h3>
            <p className="text-red-700 mb-4">{error || 'เกิดข้อผิดพลาด'}</p>
            <Button 
              onClick={() => {
                setStatus('form')
                setError(null)
              }}
              variant="outline"
            >
              ลองใหม่อีกครั้ง
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-6 w-6" />
          ชำระเงินด้วยบัตรเครดิต/เดบิต
        </CardTitle>
        <CardDescription>
          กรอกข้อมูลบัตรของคุณ ข้อมูลทั้งหมดเข้ารหัสและปลอดภัย
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Card Number */}
          <div className="space-y-2">
            <Label htmlFor="cardNumber">หมายเลขบัตร</Label>
            <Input
              id="cardNumber"
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={handleCardNumberChange}
              maxLength={19}
              required
              disabled={loading || isProcessingRef.current}
            />
          </div>

          {/* Card Name */}
          <div className="space-y-2">
            <Label htmlFor="cardName">ชื่อบนบัตร</Label>
            <Input
              id="cardName"
              placeholder="JOHN DOE"
              value={cardName}
              onChange={(e) => {
                setCardName(e.target.value.toUpperCase())
                setError(null) // Clear error when user types
              }}
              required
              disabled={loading || isProcessingRef.current}
            />
          </div>

          {/* Expiry and CVV */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiryMonth">เดือน</Label>
              <Input
                id="expiryMonth"
                placeholder="MM"
                value={expiryMonth}
                onChange={handleExpiryMonthChange}
                maxLength={2}
                required
                disabled={loading || isProcessingRef.current}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryYear">ปี</Label>
              <Input
                id="expiryYear"
                placeholder="YYYY"
                value={expiryYear}
                onChange={handleExpiryYearChange}
                maxLength={4}
                required
                disabled={loading || isProcessingRef.current}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cvv">CVV</Label>
              <Input
                id="cvv"
                placeholder="123"
                value={cvv}
                onChange={handleCvvChange}
                maxLength={3}
                type="password"
                required
                disabled={loading || isProcessingRef.current}
              />
            </div>
          </div>

          {/* Amount Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">ยอดชำระ</span>
              <span className="text-2xl font-bold">฿{amount.toLocaleString()}</span>
            </div>
          </div>

          {/* Security Notice */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
            <Lock className="h-4 w-4 text-blue-600" />
            <p>ข้อมูลบัตรของคุณปลอดภัย เข้ารหัส และจัดการโดย Omise</p>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            size="lg"
            disabled={loading || isProcessingRef.current}
          >
            {loading || isProcessingRef.current ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                กำลังดำเนินการ...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-5 w-5" />
                ชำระเงิน ฿{amount.toLocaleString()}
              </>
            )}
          </Button>


        </form>
      </CardContent>
    </Card>
  )
}
