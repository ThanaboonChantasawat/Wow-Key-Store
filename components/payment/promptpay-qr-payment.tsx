"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle2, XCircle, Clock, RefreshCw, Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

interface PromptPayQRProps {
  orderId: string
  orderIds?: string[]
  amount: number
  onPaymentSuccess?: () => void
  onPaymentFailed?: () => void
}

export function PromptPayQRPayment({ 
  orderId, 
  orderIds,
  amount, 
  onPaymentSuccess, 
  onPaymentFailed 
}: PromptPayQRProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [chargeId, setChargeId] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [status, setStatus] = useState<'pending' | 'checking' | 'success' | 'failed' | 'expired'>('pending')
  const [error, setError] = useState<string | null>(null)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [redirecting, setRedirecting] = useState(false)

  console.log('🔷 PromptPayQRPayment mounted with:', { orderId, orderIds, amount })

  // Validate orderId
  if (!orderId) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-8">
          <div className="flex flex-col items-center text-center">
            <XCircle className="h-16 w-16 text-red-600 mb-4" />
            <h3 className="text-xl font-bold text-red-900 mb-2">ข้อมูลไม่ครบถ้วน</h3>
            <p className="text-red-700">ไม่พบหมายเลขคำสั่งซื้อ กรุณาลองใหม่อีกครั้ง</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Create QR Code on mount - only run once
  useEffect(() => {
    let isMounted = true
    
    const initQR = async () => {
      if (isMounted && !qrCodeUrl) {
        await createQR()
      }
    }
    
    initQR()
    
    return () => {
      isMounted = false
    }
  }, []) // Empty dependency - only run once on mount

  // Start checking payment status
  useEffect(() => {
    if (chargeId && status === 'pending') {
      const interval = setInterval(() => {
        checkPaymentStatus(false) // Auto-check without showing loading
      }, 3000) // Check every 3 seconds

      return () => clearInterval(interval)
    }
  }, [chargeId, status])

  // Countdown timer
  useEffect(() => {
    if (expiresAt) {
      const interval = setInterval(() => {
        const now = new Date().getTime()
        const expiry = new Date(expiresAt).getTime()
        const diff = expiry - now

        if (diff <= 0) {
          setStatus('expired')
          setTimeLeft(0)
        } else {
          setTimeLeft(Math.floor(diff / 1000))
        }
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [expiresAt])

  const createQR = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('📱 Creating QR for order:', orderId, 'amount:', amount)

      const res = await fetch('/api/payment/promptpay-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          orderIds,
          amount,
        }),
      })

      console.log('📱 Response status:', res.status)
      const data = await res.json()
      console.log('📱 Response data:', data)
      console.log('📱 QR Code URL from response:', data.qrCodeUrl)
      console.log('📱 QR Code Data from response:', data.qrCodeData)
      console.log('📱 Full response keys:', Object.keys(data))

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create QR code')
      }

      // Use qrCodeUrl if available, otherwise use qrCodeData
      const qrUrl = data.qrCodeUrl || data.qrCodeData
      
      if (!qrUrl) {
        throw new Error('No QR code data received from server')
      }

      setQrCodeUrl(qrUrl)
      setChargeId(data.chargeId)
      setExpiresAt(data.expiresAt ? new Date(data.expiresAt) : null)
      setStatus('pending')
      
      console.log('✅ QR Code set:', qrUrl)
    } catch (err: any) {
      console.error('❌ Error creating QR:', err)
      setError(err.message)
      setStatus('failed')
    } finally {
      setLoading(false)
    }
  }

  const checkPaymentStatus = async (showLoading = false) => {
    try {
      // Only show loading indicator if explicitly requested (manual check)
      if (showLoading) {
        setStatus('checking')
      }

      const res = await fetch(`/api/payment/promptpay-qr?orderId=${orderId}`)
      const data = await res.json()

      // Update last checked time
      setLastChecked(new Date())

      if (data.paymentStatus === 'completed') {
        console.log('🎉 Payment successful!')
        setStatus('success')
        
        // Clear checkout items from sessionStorage
        sessionStorage.removeItem('checkoutItems')
        sessionStorage.removeItem('cartItemIds')
        console.log('🧹 Cleared checkout items from sessionStorage')
        
        // Show success toast
        toast({
          title: "✅ ชำระเงินสำเร็จ!",
          description: "เราได้รับการชำระเงินของคุณแล้ว กำลังนำคุณไปยังหน้าคำสั่งซื้อ...",
          duration: 3000,
        })
        
        // Call callback if provided
        onPaymentSuccess?.()
        
        // Redirect to orders page after 2 seconds
        setRedirecting(true)
        setTimeout(() => {
          router.push('/profile?tab=my-orders')
        }, 2000)
      } else if (data.paymentStatus === 'failed') {
        setStatus('failed')
        toast({
          title: "❌ การชำระเงินล้มเหลว",
          description: "กรุณาลองใหม่อีกครั้งหรือติดต่อฝ่ายสนับสนุน",
          variant: "destructive",
          duration: 5000,
        })
        onPaymentFailed?.()
      } else {
        // Return to pending only if we're not in checking state
        if (status === 'checking') {
          setStatus('pending')
        }
      }
    } catch (err) {
      console.error('Failed to check payment status:', err)
      // Don't change status on error to avoid flickering
    }
  }

  // TEST MODE: Bypass payment for testing
  const handleTestBypass = async () => {
    try {
      setStatus('checking')
      
      const res = await fetch('/api/payment/test-bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId,
          orderIds: orderIds || [orderId]
        }),
      })
      
      if (res.ok) {
        setStatus('success')
        toast({
          title: "✅ ชำระเงินสำเร็จ! (TEST MODE)",
          description: "กำลังนำคุณไปยังหน้าคำสั่งซื้อ...",
          duration: 3000,
        })
        
        // Redirect to orders page after 1 second
        setRedirecting(true)
        setTimeout(() => {
          onPaymentSuccess?.()
          router.push('/profile?tab=my-orders')
        }, 1000)
      } else {
        alert('Failed to bypass payment')
        setStatus('pending')
      }
    } catch (err) {
      console.error('Failed to bypass:', err)
      alert('Error bypassing payment')
      setStatus('pending')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-muted-foreground">กำลังสร้าง QR Code...</p>
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

  if (status === 'failed' || error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-8">
          <div className="flex flex-col items-center text-center">
            <XCircle className="h-16 w-16 text-red-600 mb-4" />
            <h3 className="text-xl font-bold text-red-900 mb-2">เกิดข้อผิดพลาด</h3>
            <p className="text-red-700 mb-4">{error || 'การชำระเงินล้มเหลว'}</p>
            <Button onClick={createQR} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              ลองใหม่อีกครั้ง
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (status === 'expired') {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="py-8">
          <div className="flex flex-col items-center text-center">
            <Clock className="h-16 w-16 text-yellow-600 mb-4" />
            <h3 className="text-xl font-bold text-yellow-900 mb-2">QR Code หมดอายุ</h3>
            <p className="text-yellow-700 mb-4">กรุณาสร้าง QR Code ใหม่</p>
            <Button onClick={createQR}>
              <RefreshCw className="h-4 w-4 mr-2" />
              สร้าง QR Code ใหม่
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>ชำระเงินผ่าน PromptPay</CardTitle>
        <CardDescription>
          สแกน QR Code ด้วยแอพธนาคารของคุณ
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* QR Code */}
        {qrCodeUrl && (
          <div className="flex flex-col items-center">
            <div className="relative w-64 h-64 bg-white p-4 rounded-lg shadow-lg">
              <Image
                src={qrCodeUrl}
                alt="PromptPay QR Code"
                fill
                className="object-contain"
              />
            </div>
            
            {/* Download QR */}
            <Button
              variant="ghost"
              size="sm"
              className="mt-4"
              onClick={() => {
                const link = document.createElement('a')
                link.href = qrCodeUrl
                link.download = `promptpay-qr-${orderId}.png`
                link.click()
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              บันทึก QR Code
            </Button>
          </div>
        )}

        {/* Amount */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">จำนวนเงินที่ต้องชำระ</p>
          <p className="text-3xl font-bold text-blue-600">
            ฿{amount.toLocaleString()}
          </p>
        </div>

        {/* Timer */}
        {timeLeft > 0 && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>QR Code จะหมดอายุใน <strong>{formatTime(timeLeft)}</strong></span>
              {lastChecked && (
                <span className="text-xs text-muted-foreground">
                  ตรวจสอบล่าสุด: {lastChecked.toLocaleTimeString('th-TH')}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Status - Show subtle indicator during background checks */}
        {status === 'checking' && (
          <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>กำลังตรวจสอบการชำระเงิน...</span>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">วิธีชำระเงิน:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>เปิดแอพธนาคารบนมือถือของคุณ</li>
            <li>เลือกเมนู "สแกน QR" หรือ "PromptPay"</li>
            <li>สแกน QR Code ด้านบน</li>
            <li>ตรวจสอบจำนวนเงินให้ถูกต้อง</li>
            <li>ยืนยันการชำระเงิน</li>
          </ol>
        </div>

        {/* TEST MODE BYPASS BUTTON (แสดงเสมอสำหรับทดสอบ) */}
        {status === 'pending' && (
          <div className="border-t pt-4">
            <p className="text-xs text-orange-600 text-center mb-2">
              🧪 ปุ่มสำหรับทดสอบเท่านั้น (ใช้ข้ามการชำระเงินจริง)
            </p>
            <Button
              onClick={handleTestBypass}
              variant="outline"
              className="w-full border-green-600 text-green-800 hover:bg-green-500"
              disabled={status !== 'pending'}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              ชำระเงินผ่าน (Bypass)
            </Button>
          </div>
        )}

        {/* Note */}
        <div className="space-y-2">
          <p className="text-xs text-center text-muted-foreground">
            ระบบจะตรวจสอบสถานะอัตโนมัติทุก 3 วินาที
          </p>
          {lastChecked && status === 'pending' && (
            <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              ตรวจสอบล่าสุด: {lastChecked.toLocaleTimeString('th-TH')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
