"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import PaymentCheckout from "@/components/payment/payment-checkout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CreditCard, Info, TestTube } from "lucide-react"
import { useAuth } from "@/components/auth-context"

export default function TestPaymentPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [showCheckout, setShowCheckout] = useState(false)
  
  // Test payment data
  const [amount, setAmount] = useState("10000") // 100 THB in satang
  const [productName, setProductName] = useState("Test Product - Game Key")
  const [sellerId, setSellerId] = useState("")
  const [buyerEmail, setBuyerEmail] = useState(user?.email || "")

  const handleStartPayment = () => {
    if (!sellerId || !buyerEmail || !amount) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน")
      return
    }
    setShowCheckout(true)
  }

  const handleSuccess = () => {
    router.push('/payment/success')
  }

  const handleCancel = () => {
    setShowCheckout(false)
  }

  if (showCheckout) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
        <div className="max-w-4xl mx-auto mb-6">
          <Button variant="outline" onClick={handleCancel}>
            ← กลับ
          </Button>
        </div>
        <PaymentCheckout
          amount={parseInt(amount)}
          currency="thb"
          sellerId={sellerId}
          orderId={`TEST-${Date.now()}`}
          productName={productName}
          buyerEmail={buyerEmail}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="w-6 h-6" />
              🧪 ทดสอบระบบชำระเงิน (Test Mode)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Info Alert */}
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                <strong>ข้อมูลสำหรับทดสอบ Stripe Test Mode:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><strong>บัตรทดสอบ:</strong> 4242 4242 4242 4242</li>
                  <li><strong>วันหมดอายุ:</strong> เดือน/ปีใดก็ได้ในอนาคต (เช่น 12/34)</li>
                  <li><strong>CVC:</strong> 3 หลักใดก็ได้ (เช่น 123)</li>
                  <li><strong>ZIP Code:</strong> 5 หลักใดก็ได้ (เช่น 10110)</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Test Data Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="sellerId">Seller User ID *</Label>
                <Input
                  id="sellerId"
                  value={sellerId}
                  onChange={(e) => setSellerId(e.target.value)}
                  placeholder="ใส่ User ID ของผู้ขาย"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  ผู้ขายต้องเชื่อมต่อ Stripe Account แล้ว
                </p>
              </div>

              <div>
                <Label htmlFor="productName">ชื่อสินค้า</Label>
                <Input
                  id="productName"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="ชื่อสินค้าทดสอบ"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="amount">จำนวนเงิน (สตางค์) *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="10000 = 100 บาท"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {amount && `= ฿${(parseInt(amount) / 100).toFixed(2)}`}
                </p>
              </div>

              <div>
                <Label htmlFor="buyerEmail">อีเมลผู้ซื้อ *</Label>
                <Input
                  id="buyerEmail"
                  type="email"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="buyer@example.com"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Test Card Info */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-purple-900">บัตรทดสอบเพิ่มเติม</h3>
              </div>
              <div className="space-y-2 text-sm text-purple-800">
                <div className="flex justify-between">
                  <span>✅ ชำระเงินสำเร็จ:</span>
                  <code className="bg-purple-100 px-2 py-1 rounded">4242 4242 4242 4242</code>
                </div>
                <div className="flex justify-between">
                  <span>❌ ถูกปฏิเสธ:</span>
                  <code className="bg-purple-100 px-2 py-1 rounded">4000 0000 0000 0002</code>
                </div>
                <div className="flex justify-between">
                  <span>⚠️ ต้อง 3D Secure:</span>
                  <code className="bg-purple-100 px-2 py-1 rounded">4000 0025 0000 3155</code>
                </div>
              </div>
            </div>

            {/* Start Button */}
            <Button
              onClick={handleStartPayment}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              size="lg"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              เริ่มทดสอบการชำระเงิน
            </Button>

            {/* Warning */}
            <p className="text-xs text-center text-muted-foreground">
              ⚠️ นี่คือโหมดทดสอบ จะไม่มีการเรียกเก็บเงินจริง
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
