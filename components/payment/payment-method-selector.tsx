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
  quantity: number
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
        quantity: item.quantity || 1,
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
          ชำระเงินรวม {items?.length || 1} รายการ (เงินจะถูกโอนไปยังแพลตฟอร์มก่อนกระจายให้ร้านค้า)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
          {/* PromptPay Option */}
          {availablePaymentMethods.promptpay ? (
            <div className={`flex items-center space-x-2 rounded-lg border-2 p-4 cursor-pointer transition-colors ${paymentMethod === 'promptpay' ? 'border-blue-500 bg-blue-50' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}>
              <RadioGroupItem value="promptpay" id="promptpay" />
              <Label 
                htmlFor="promptpay" 
                className="flex-1 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Smartphone className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold">PromptPay QR Code</div>
                    <div className="text-sm text-gray-500">สแกนจ่ายได้ทุกธนาคาร (ฟรีค่าธรรมเนียม)</div>
                  </div>
                </div>
              </Label>
            </div>
          ) : (
            <div className="opacity-50 pointer-events-none flex items-center space-x-2 rounded-lg border border-gray-200 p-4 bg-gray-50">
              <Smartphone className="w-6 h-6 text-gray-400" />
              <div>
                <div className="font-semibold text-gray-500">PromptPay QR Code</div>
                <div className="text-xs text-red-500">ไม่รองรับสำหรับรายการนี้</div>
              </div>
            </div>
          )}

          {/* Credit Card Option */}
          {availablePaymentMethods.creditCard ? (
            <div className={`flex items-center space-x-2 rounded-lg border-2 p-4 cursor-pointer transition-colors ${paymentMethod === 'card' ? 'border-blue-500 bg-blue-50' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}>
              <RadioGroupItem value="card" id="card" />
              <Label 
                htmlFor="card" 
                className="flex-1 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 p-2 rounded-full">
                    <CreditCard className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-semibold">บัตรเครดิต / เดบิต</div>
                    <div className="text-sm text-gray-500">Visa, Mastercard, JCB</div>
                  </div>
                </div>
              </Label>
            </div>
          ) : (
            <div className="opacity-50 pointer-events-none flex items-center space-x-2 rounded-lg border border-gray-200 p-4 bg-gray-50">
              <CreditCard className="w-6 h-6 text-gray-400" />
              <div>
                <div className="font-semibold text-gray-500">บัตรเครดิต / เดบิต</div>
                <div className="text-xs text-red-500">ไม่รองรับสำหรับรายการนี้</div>
              </div>
            </div>
          )}
        </RadioGroup>

        {/* Amount Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground">ยอดรวม ({items?.length || 1} รายการ)</span>
            <span className="text-2xl font-bold">฿{amount.toLocaleString()}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            * ราคานี้รวมค่าธรรมเนียมแล้ว (ชำระที่ WowKeyStore Platform)
          </div>
        </div>

        {/* Proceed Button */}
        <Button 
          onClick={handleProceed} 
          className="w-full h-12 text-lg bg-[#ff9800] hover:bg-[#f57c00]"
          disabled={creatingOrder}
        >
          {creatingOrder ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              กำลังสร้างรายการ...
            </>
          ) : (
            `ชำระเงิน ฿${amount.toLocaleString()}`
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
