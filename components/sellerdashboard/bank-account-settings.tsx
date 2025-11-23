"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Building2, Smartphone, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react"

// Use OMISE_BANK_CODES if using Omise, or THAI_BANK_CODES for SCB
// const PAYOUT_PROVIDER = process.env.NEXT_PUBLIC_PAYOUT_PROVIDER || 'omise'

interface BankAccountProps {
  shopId: string
}

export function BankAccountSettings({ shopId }: BankAccountProps) {
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
    <Card className="border-none shadow-xl bg-white overflow-hidden relative p-0">
      <div className="absolute top-0 left-0 w-full" />
      <CardHeader className="pb-6 pt-8 px-8 bg-gradient-to-b from-slate-100 to-slate-200 border-b-2 border-slate-300">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-3 rounded-xl shadow-md text-white">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">
                ข้อมูลบัญชีรับเงิน
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                กำหนดบัญชีธนาคารหรือ PromptPay สำหรับรับเงินจากการขายของคุณ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100">
              <ShieldCheck className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800">Powered by Omise</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 border border-green-200">
                  Verified
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                ระบบชำระเงินระดับสากล • ปลอดภัย 100%
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8 px-8 pb-8">
        {/* Payment Method Selection */}
        <div className="space-y-3">
          <Label>วิธีการรับเงิน</Label>
          <RadioGroup value={payoutMethod} onValueChange={(v: string) => setPayoutMethod(v as any)} className="grid gap-4">
            <div className={`relative flex items-center space-x-2 rounded-xl border p-4 cursor-pointer transition-all duration-200 ${
              payoutMethod === 'promptpay' 
                ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500 shadow-sm' 
                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
            }`}>
              <RadioGroupItem value="promptpay" id="promptpay" className="sr-only" />
              <Label htmlFor="promptpay" className="flex items-center gap-4 cursor-pointer flex-1 w-full">
                <div className={`p-3 rounded-xl transition-colors ${
                  payoutMethod === 'promptpay' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  <Smartphone className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-gray-900 text-lg">PromptPay</div>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">แนะนำ</span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">โอนเร็วทันใจ • ไม่มีค่าธรรมเนียม • รับเงินใน 1-2 วินาที</div>
                </div>
                <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  payoutMethod === 'promptpay' ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                }`}>
                  {payoutMethod === 'promptpay' && <CheckCircle2 className="h-4 w-4 text-white" />}
                </div>
              </Label>
            </div>

            <div className={`relative flex items-center space-x-2 rounded-xl border p-4 cursor-pointer transition-all duration-200 ${
              payoutMethod === 'bank' 
                ? 'border-green-500 bg-green-50/50 ring-1 ring-green-500 shadow-sm' 
                : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
            }`}>
              <RadioGroupItem value="bank" id="bank" className="sr-only" />
              <Label htmlFor="bank" className="flex items-center gap-4 cursor-pointer flex-1 w-full">
                <div className={`p-3 rounded-xl transition-colors ${
                  payoutMethod === 'bank' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 text-lg">บัญชีธนาคาร</div>
                  <div className="text-sm text-gray-500 mt-1">โอนผ่านธนาคาร • ค่าธรรมเนียม ฿25/ครั้ง • รับภายใน 1-3 วันทำการ</div>
                </div>
                <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  payoutMethod === 'bank' ? 'border-green-600 bg-green-600' : 'border-gray-300'
                }`}>
                  {payoutMethod === 'bank' && <CheckCircle2 className="h-4 w-4 text-white" />}
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* PromptPay Form */}
        {payoutMethod === 'promptpay' && (
          <div className="space-y-6 p-6 bg-blue-50/30 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 p-2 rounded-full shrink-0">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="font-semibold text-blue-900 text-base mb-1">✨ PromptPay โอนเร็ว ผ่าน Omise</div>
                <p className="text-sm text-blue-700 leading-relaxed">
                  รับเงินทันที ผ่านเบอร์โทรศัพท์ หรือเลขบัตรประชาชนที่ลงทะเบียน PromptPay ไว้แล้ว
                  <br />
                  <span className="font-medium mt-1 inline-block">🎉 ไม่มีค่าธรรมเนียม • โอนได้ตลอด 24 ชั่วโมง</span>
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-blue-900">ประเภท PromptPay</Label>
              <Select value={promptPayType} onValueChange={(v) => setPromptPayType(v as any)}>
                <SelectTrigger className="bg-white border-blue-200 focus:ring-blue-500">
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
          <div className="space-y-6 p-6 bg-green-50/30 rounded-xl border border-green-100 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-4">
              <div className="bg-green-100 p-2 rounded-full shrink-0">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="font-semibold text-green-900 text-base mb-1">🏦 โอนเข้าบัญชีธนาคาร ผ่าน Omise</div>
                <p className="text-sm text-green-700 leading-relaxed">
                  รองรับทุกธนาคารไทย โอนผ่านระบบ Omise Transfer
                  <br />
                  <span className="font-medium mt-1 inline-block">💰 ค่าธรรมเนียม ฿25 ต่อครั้ง • รับเงินภายใน 1-3 วันทำการ</span>
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankName" className="text-green-900">ธนาคาร</Label>
              <Select value={bankName} onValueChange={setBankName}>
                <SelectTrigger className="bg-white border-green-200 focus:ring-green-500">
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
              <Label htmlFor="bankAccountNumber" className="text-green-900">เลขที่บัญชี</Label>
              <Input
                id="bankAccountNumber"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="1234567890"
                maxLength={15}
                className="bg-white border-green-200 focus:ring-green-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankAccountName" className="text-green-900">ชื่อบัญชี</Label>
              <Input
                id="bankAccountName"
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
                placeholder="นาย/นาง/นางสาว ชื่อ นามสกุล"
                className="bg-white border-green-200 focus:ring-green-500"
              />
              <p className="text-xs text-green-600">
                *ชื่อบัญชีต้องตรงกับชื่อผู้ขายที่ลงทะเบียนไว้
              </p>
            </div>
          </div>
        )}


        {/* Save Button */}
        <div className="flex justify-center pt-6">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full max-w-md bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold text-lg h-14 rounded-xl shadow-lg shadow-purple-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
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
        </div>

        {/* Warning */}
        <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="bg-orange-100 p-2 rounded-full shrink-0">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h4 className="font-semibold text-orange-900 mb-2">คำแนะนำสำคัญ</h4>
              <ul className="space-y-2 text-sm text-orange-800">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                  <span>ตรวจสอบข้อมูลให้ถูกต้องก่อนบันทึก ข้อมูลที่ผิดพลาดอาจทำให้การโอนเงินล้มเหลว</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  <span>
                    <span className="font-medium text-blue-700">PromptPay (แนะนำ):</span> โอนเร็วที่สุด ไม่มีค่าธรรมเนียม 
                    ใช้เบอร์โทรหรือบัตรประชาชนที่ลงทะเบียนแล้ว
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                  <span>
                    <span className="font-medium text-green-700">บัญชีธนาคาร:</span> มีค่าธรรมเนียม ฿25 และใช้เวลา 1-3 วันทำการ
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
