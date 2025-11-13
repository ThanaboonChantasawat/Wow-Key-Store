"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Building2, Smartphone, CreditCard, CheckCircle2 } from "lucide-react"

// Use OMISE_BANK_CODES if using Omise, or THAI_BANK_CODES for SCB
const PAYOUT_PROVIDER = process.env.NEXT_PUBLIC_PAYOUT_PROVIDER || 'omise'

interface BankAccountProps {
  userId: string
  shopId: string
}

export function BankAccountSettings({ userId, shopId }: BankAccountProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [payoutMethod, setPayoutMethod] = useState<'bank' | 'promptpay'>('promptpay')
  
  // Bank account fields
  const [bankName, setBankName] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankAccountName, setBankAccountName] = useState('')
  const [bankBranch, setBankBranch] = useState('')
  
  // PromptPay fields
  const [promptPayId, setPromptPayId] = useState('')
  const [promptPayType, setPromptPayType] = useState<'mobile' | 'citizen_id'>('mobile')

  // Load existing bank account info
  useEffect(() => {
    async function loadBankAccount() {
      setLoading(true)
      try {
        const res = await fetch(`/api/seller/bank-account?shopId=${shopId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.bankAccountNumber) {
            setPayoutMethod('bank')
            setBankName(data.bankName || '')
            setBankAccountNumber(data.bankAccountNumber || '')
            setBankAccountName(data.bankAccountName || '')
            setBankBranch(data.bankBranch || '')
          } else if (data.promptPayId) {
            setPayoutMethod('promptpay')
            setPromptPayId(data.promptPayId || '')
            setPromptPayType(data.promptPayType || 'mobile')
          }
        }
      } catch (error) {
        console.error('Failed to load bank account:', error)
      } finally {
        setLoading(false)
      }
    }
    loadBankAccount()
  }, [shopId])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: any = {
        shopId,
        payoutMethod,
      }

      if (payoutMethod === 'bank') {
        if (!bankName || !bankAccountNumber || !bankAccountName) {
          toast({
            title: "ข้อมูลไม่ครบถ้วน",
            description: "กรุณากรอกข้อมูลธนาคารให้ครบถ้วน",
            variant: "destructive",
          })
          setSaving(false)
          return
        }
        payload.bankName = bankName
        payload.bankAccountNumber = bankAccountNumber
        payload.bankAccountName = bankAccountName
        payload.bankBranch = bankBranch
      } else {
        if (!promptPayId) {
          toast({
            title: "ข้อมูลไม่ครบถ้วน",
            description: "กรุณากรอกหมายเลข PromptPay",
            variant: "destructive",
          })
          setSaving(false)
          return
        }
        
        // Validate PromptPay format
        if (promptPayType === 'mobile' && !/^0\d{9}$/.test(promptPayId)) {
          toast({
            title: "รูปแบบไม่ถูกต้อง",
            description: "เบอร์โทรศัพท์ต้องเป็น 10 หลัก เริ่มด้วย 0",
            variant: "destructive",
          })
          setSaving(false)
          return
        }
        
        if (promptPayType === 'citizen_id' && !/^\d{13}$/.test(promptPayId)) {
          toast({
            title: "รูปแบบไม่ถูกต้อง",
            description: "เลขบัตรประชาชนต้องเป็น 13 หลัก",
            variant: "destructive",
          })
          setSaving(false)
          return
        }
        
        payload.promptPayId = promptPayId
        payload.promptPayType = promptPayType
      }

      const res = await fetch('/api/seller/bank-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save')
      }

      toast({
        title: "✅ บันทึกสำเร็จ",
        description: "ข้อมูลบัญชีธนาคารของคุณถูกบันทึกแล้ว",
      })
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-purple-200 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 border-b-2 border-purple-200">
        <CardTitle className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-2 rounded-lg">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-xl">ข้อมูลบัญชีรับเงิน</div>
            <div className="text-sm font-normal text-purple-600 mt-1">
              Powered by Omise • ระบบชำระเงินระดับสากล
            </div>
          </div>
        </CardTitle>
        <CardDescription className="text-base mt-2 text-gray-700">
          กำหนดบัญชีธนาคารหรือ PromptPay สำหรับรับเงินจากการขายของคุณ
          <br />
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Method Selection */}
        <div className="space-y-3">
          <Label>วิธีการรับเงิน</Label>
          <RadioGroup value={payoutMethod} onValueChange={(v: string) => setPayoutMethod(v as any)}>
            <div className="flex items-center space-x-2 rounded-lg border-2 border-blue-200 bg-blue-50 p-4 hover:bg-blue-100 cursor-pointer transition-colors">
              <RadioGroupItem value="promptpay" id="promptpay" />
              <Label htmlFor="promptpay" className="flex items-center gap-3 cursor-pointer flex-1">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Smartphone className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-blue-900">PromptPay (แนะนำ)</div>
                  <div className="text-sm text-blue-700 mt-0.5">โอนเร็วทันใจ • ไม่มีค่าธรรมเนียม • รับเงินใน 1-2 วินาที</div>
                </div>
                {payoutMethod === 'promptpay' && (
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                )}
              </Label>
            </div>
            <div className="flex items-center space-x-2 rounded-lg border-2 border-green-200 bg-green-50 p-4 hover:bg-green-100 cursor-pointer transition-colors">
              <RadioGroupItem value="bank" id="bank" />
              <Label htmlFor="bank" className="flex items-center gap-3 cursor-pointer flex-1">
                <div className="bg-green-600 p-2 rounded-lg">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-green-900">บัญชีธนาคาร</div>
                  <div className="text-sm text-green-700 mt-0.5">โอนผ่านธนาคาร • ค่าธรรมเนียม ฿25/ครั้ง • รับภายใน 1-3 วันทำการ</div>
                </div>
                {payoutMethod === 'bank' && (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                )}
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* PromptPay Form */}
        {payoutMethod === 'promptpay' && (
          <div className="space-y-4 p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border-2 border-blue-300">
            <div className="flex items-start gap-3 text-sm">
              <div className="bg-blue-600 p-2 rounded-full">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="font-semibold text-blue-900 text-base mb-1">✨ PromptPay โอนเร็ว ผ่าน Omise</div>
                <p className="text-sm text-blue-800 leading-relaxed">
                  รับเงินทันที ผ่านเบอร์โทรศัพท์ หรือเลขบัตรประชาชนที่ลงทะเบียน PromptPay ไว้แล้ว
                  <br />
                  <span className="font-medium">🎉 ไม่มีค่าธรรมเนียม • โอนได้ตลอด 24 ชั่วโมง</span>
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>ประเภท PromptPay</Label>
              <Select value={promptPayType} onValueChange={(v) => setPromptPayType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobile">เบอร์โทรศัพท์</SelectItem>
                  <SelectItem value="citizen_id">เลขบัตรประชาชน</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="promptPayId">
                {promptPayType === 'mobile' ? 'เบอร์โทรศัพท์' : 'เลขบัตรประชาชน'}
              </Label>
              <Input
                id="promptPayId"
                value={promptPayId}
                onChange={(e) => setPromptPayId(e.target.value.replace(/\D/g, ''))}
                placeholder={promptPayType === 'mobile' ? '0812345678' : '1234567890123'}
                maxLength={promptPayType === 'mobile' ? 10 : 13}
              />
              <p className="text-xs text-muted-foreground">
                {promptPayType === 'mobile' 
                  ? 'ตัวอย่าง: 0812345678 (10 หลัก)'
                  : 'ตัวอย่าง: 1234567890123 (13 หลัก)'}
              </p>
            </div>
          </div>
        )}

        {/* Bank Account Form */}
        {payoutMethod === 'bank' && (
          <div className="space-y-4 p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border-2 border-green-300">
            <div className="flex items-start gap-3 text-sm">
              <div className="bg-green-600 p-2 rounded-full">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="font-semibold text-green-900 text-base mb-1">🏦 โอนเข้าบัญชีธนาคาร ผ่าน Omise</div>
                <p className="text-sm text-green-800 leading-relaxed">
                  รองรับทุกธนาคารไทย โอนผ่านระบบ Omise Transfer
                  <br />
                  <span className="font-medium">💰 ค่าธรรมเนียม ฿25 ต่อครั้ง • รับเงินภายใน 1-3 วันทำการ</span>
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankName">ธนาคาร</Label>
              <Select value={bankName} onValueChange={setBankName}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกธนาคาร" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCB">ธนาคารไทยพาณิชย์ (SCB)</SelectItem>
                  <SelectItem value="KBANK">ธนาคารกสิกรไทย (KBANK)</SelectItem>
                  <SelectItem value="BBL">ธนาคารกรุงเทพ (BBL)</SelectItem>
                  <SelectItem value="KTB">ธนาคารกรุงไทย (KTB)</SelectItem>
                  <SelectItem value="TMB">ธนาคารทหารไทยธนชาต (TTB)</SelectItem>
                  <SelectItem value="BAY">ธนาคารกรุงศรีอยุธยา (BAY)</SelectItem>
                  <SelectItem value="GSB">ธนาคารออมสิน (GSB)</SelectItem>
                  <SelectItem value="BAAC">ธนาคาร ธ.ก.ส. (BAAC)</SelectItem>
                  <SelectItem value="CIMB">ธนาคาร CIMB ไทย (CIMB)</SelectItem>
                  <SelectItem value="TISCO">ธนาคารทิสโก้ (TISCO)</SelectItem>
                  <SelectItem value="UOBT">ธนาคาร ยูโอบี (UOB)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankAccountNumber">เลขที่บัญชี</Label>
              <Input
                id="bankAccountNumber"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="1234567890"
                maxLength={15}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankAccountName">ชื่อบัญชี</Label>
              <Input
                id="bankAccountName"
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
                placeholder="นาย/นาง/นางสาว ชื่อ นามสกุล"
              />
              <p className="text-xs text-muted-foreground">
                ใช้ชื่อเดียวกับที่ลงทะเบียนในบัญชีธนาคาร
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankBranch">สาขา (ไม่บังคับ)</Label>
              <Input
                id="bankBranch"
                value={bankBranch}
                onChange={(e) => setBankBranch(e.target.value)}
                placeholder="เช่น สาขาสยาม, สาขาเซ็นทรัลเวิลด์"
              />
            </div>
          </div>
        )}

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold"
          size="lg"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              กำลังบันทึกข้อมูล...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-5 w-5" />
              บันทึกข้อมูลบัญชีรับเงิน
            </>
          )}
        </Button>

        {/* Warning */}
        <div className="text-sm bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <strong className="text-yellow-900 text-base">คำแนะนำสำคัญ:</strong>
              <ul className="mt-2 space-y-1.5 text-yellow-800 ml-0 list-none">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600">•</span>
                  <span>ตรวจสอบข้อมูลให้ถูกต้องก่อนบันทึก ข้อมูลที่ผิดพลาดอาจทำให้การโอนเงินล้มเหลว</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">💡</span>
                  <span>
                    <strong className="text-blue-900">PromptPay (แนะนำ):</strong> โอนเร็วที่สุด ไม่มีค่าธรรมเนียม 
                    ใช้เบอร์โทรหรือบัตรประชาชนที่ลงทะเบียนแล้ว
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600">🏦</span>
                  <span>
                    <strong className="text-green-900">บัญชีธนาคาร:</strong> รองรับทุกธนาคาร 
                    ค่าธรรมเนียม ฿25/ครั้ง รับเงินภายใน 1-3 วันทำการ
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600">🔒</span>
                  <span className="text-purple-800">
                    ข้อมูลบัญชีของคุณปลอดภัย เข้ารหัส และจัดการโดย <strong>Omise</strong> ระบบชำระเงินชั้นนำของไทย
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
