"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { CreditCard, Smartphone, Loader2 } from "lucide-react"
import { PromptPayQRPayment } from "./promptpay-qr-payment"
import { OmiseCreditCardPayment } from "./omise-credit-card-payment"
import { useAuth } from "@/components/auth-context"
import { useToast } from "@/hooks/use-toast"

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

interface PaymentMethodSelectorProps {
  orderId?: string
  amount: number
  items?: CheckoutItem[]
  onPaymentSuccess?: () => void
  availablePaymentMethods?: {
    promptpay: boolean
    creditCard: boolean
    bankTransfer: boolean
  }
}

export function PaymentMethodSelector({ 
  orderId, 
  amount,
  items,
  onPaymentSuccess,
  availablePaymentMethods = {
    promptpay: true,
    creditCard: true,
    bankTransfer: true,
  }
}: PaymentMethodSelectorProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'promptpay'>(
    availablePaymentMethods.promptpay ? 'promptpay' : 'card'
  )
  const [showPayment, setShowPayment] = useState(false)
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(orderId || null)
  const [creatingOrder, setCreatingOrder] = useState(false)

  const handleProceed = async () => {
    // If orderId is provided (single product purchase), just show payment
    if (orderId) {
      setShowPayment(true)
      return
    }

    // For cart checkout, create order first
    if (!items || items.length === 0) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่พบรายการสินค้า",
        variant: "destructive",
      })
      return
    }

    if (!user) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "กรุณาเข้าสู่ระบบ",
        variant: "destructive",
      })
      return
    }

    try {
      setCreatingOrder(true)
      
      console.log('🛒 Creating order for cart checkout...')
      
      const checkoutItems = items.map(item => ({
        productId: item.gameId,
        shopId: item.shopId,
        price: item.price,
        name: item.name,
      }))
      
      const storedCartItemIds = sessionStorage.getItem('cartItemIds')
      const cartItemIds = storedCartItemIds ? JSON.parse(storedCartItemIds) : items.map(item => item.gameId)
      
      const response = await fetch('/api/cart/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: checkoutItems,
          userId: user.uid,
          cartItemIds,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `API Error: ${response.status}`)
      }

      const data = await response.json()
      
      console.log('✅ Order created:', data.orderId)
      
      setCreatedOrderId(data.orderId)
      setShowPayment(true)
    } catch (err: any) {
      console.error('Create order error:', err)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: err.message || 'ไม่สามารถสร้างคำสั่งซื้อได้',
        variant: "destructive",
      })
    } finally {
      setCreatingOrder(false)
    }
  }

  // If showing payment, render appropriate component
  if (showPayment && createdOrderId) {
    const handleBackToSelection = () => {
      // If this is a cart order that we created, we should cancel it
      if (!orderId && createdOrderId) {
        // Cancel the order via API (optional - could also just let it expire)
        fetch('/api/orders/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: createdOrderId }),
        }).catch(err => console.error('Failed to cancel order:', err))
      }
      
      setShowPayment(false)
      setCreatedOrderId(orderId || null)
    }
    
    if (paymentMethod === 'promptpay') {
      return (
        <div className="space-y-4">
          <Button
            variant="ghost"
            onClick={handleBackToSelection}
            className="mb-4"
          >
            ← เปลี่ยนวิธีชำระเงิน
          </Button>
          <PromptPayQRPayment
            orderId={createdOrderId}
            amount={amount}
            onPaymentSuccess={onPaymentSuccess}
          />
        </div>
      )
    } else {
      return (
        <div className="space-y-4">
          <Button
            variant="ghost"
            onClick={handleBackToSelection}
            className="mb-4"
          >
            ← เปลี่ยนวิธีชำระเงิน
          </Button>
          <OmiseCreditCardPayment
            orderId={createdOrderId}
            amount={amount}
            onPaymentSuccess={onPaymentSuccess}
          />
        </div>
      )
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>เลือกวิธีชำระเงิน</CardTitle>
        <CardDescription>
          เลือกช่องทางที่สะดวกสำหรับคุณ
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
          {/* PromptPay Option */}
          {availablePaymentMethods.promptpay ? (
            <div className="flex items-center space-x-2 rounded-lg border-2 border-blue-200 bg-blue-50 p-4 cursor-pointer hover:bg-blue-100 transition-colors">
              <RadioGroupItem value="promptpay" id="promptpay" />
              <Label 
                htmlFor="promptpay" 
                className="flex items-center gap-3 cursor-pointer flex-1"
              >
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <Smartphone className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-lg">PromptPay QR Code</div>
                  <div className="text-sm text-muted-foreground">
                    สแกนจ่ายผ่านแอพธนาคาร • ค่าธรรมเนียมต่ำ • รับเงินทันที
                  </div>
                  <div className="text-xs text-green-600 font-medium mt-1">
                    ✨ แนะนำ - ค่าธรรมเนียมเพียง 1% + ฿5
                  </div>
                </div>
              </Label>
            </div>
          ) : (
            <div className="flex items-center space-x-2 rounded-lg border-2 border-gray-200 bg-gray-50 p-4 opacity-50 cursor-not-allowed">
              <RadioGroupItem value="promptpay" id="promptpay" disabled />
              <Label 
                htmlFor="promptpay" 
                className="flex items-center gap-3 flex-1"
              >
                <div className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center">
                  <Smartphone className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-lg text-gray-500">PromptPay QR Code</div>
                  <div className="text-sm text-gray-400">
                    ร้านค้ายังไม่ได้ตั้งค่า PromptPay
                  </div>
                </div>
              </Label>
            </div>
          )}

          {/* Credit Card Option */}
          <div className="flex items-center space-x-2 rounded-lg border-2 p-4 cursor-pointer hover:bg-accent transition-colors">
            <RadioGroupItem value="card" id="card" />
            <Label 
              htmlFor="card" 
              className="flex items-center gap-3 cursor-pointer flex-1"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-lg">บัตรเครดิต/เดบิต</div>
                <div className="text-sm text-muted-foreground">
                  Visa, Mastercard, JCB • ปลอดภัย • สะดวกรวดเร็ว
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  ค่าธรรมเนียม 3.65%
                </div>
              </div>
            </Label>
          </div>
        </RadioGroup>

        {/* Amount Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground">ยอดรวม</span>
            <span className="text-2xl font-bold">฿{amount.toLocaleString()}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            * ราคานี้รวมค่าธรรมเนียมแล้ว
          </div>
        </div>

        {/* Proceed Button */}
        <Button 
          onClick={handleProceed} 
          className="w-full" 
          size="lg"
          disabled={creatingOrder}
        >
          {creatingOrder ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              กำลังสร้างคำสั่งซื้อ...
            </>
          ) : paymentMethod === 'promptpay' ? (
            <>
              <Smartphone className="mr-2 h-5 w-5" />
              แสดง QR Code
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-5 w-5" />
              ชำระด้วยบัตร
            </>
          )}
        </Button>

        {/* Info */}
        <div className="text-xs text-center text-muted-foreground">
          {paymentMethod === 'promptpay' ? (
            <p>💡 PromptPay รวดเร็ว ปลอดภัย และค่าธรรมเนียมต่ำ</p>
          ) : (
            <p>🔒 ข้อมูลบัตรของคุณปลอดภัย ผ่านระบบ Omise</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
