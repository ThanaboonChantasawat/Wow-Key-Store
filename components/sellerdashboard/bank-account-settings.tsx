"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Building2, Smartphone, CheckCircle2, ShieldCheck } from "lucide-react"

// Use OMISE_BANK_CODES if using Omise, or THAI_BANK_CODES for SCB
// const PAYOUT_PROVIDER = process.env.NEXT_PUBLIC_PAYOUT_PROVIDER || 'omise'

interface BankAccountProps {
  shopId: string
}

export function BankAccountSettings({ shopId }: BankAccountProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Bank account fields
  const [bankName, setBankName] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankAccountName, setBankAccountName] = useState('')
  const [bankBranch, setBankBranch] = useState('')
  const [enableBank, setEnableBank] = useState(false)
  
  // PromptPay fields
  const [promptPayId, setPromptPayId] = useState('')
  const [promptPayType, setPromptPayType] = useState<'mobile' | 'citizen_id'>('mobile')
  const [enablePromptPay, setEnablePromptPay] = useState(false)

  // Load existing bank account info
  useEffect(() => {
    async function loadBankAccount() {
      setLoading(true)
      try {
        const res = await fetch(`/api/seller/bank-account?shopId=${shopId}`)
        if (res.ok) {
          const data = await res.json()
          
          // Load bank account data
          if (data.bankAccountNumber) {
            setBankName(data.bankName || '')
            setBankAccountNumber(data.bankAccountNumber || '')
            setBankAccountName(data.bankAccountName || '')
            setBankBranch(data.bankBranch || '')
            setEnableBank(data.enableBank !== false) // default true if exists
          }
          
          // Load PromptPay data
          if (data.promptPayId) {
            setPromptPayId(data.promptPayId || '')
            setPromptPayType(data.promptPayType || 'mobile')
            setEnablePromptPay(data.enablePromptPay !== false) // default true if exists
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
      }

      // Validate and add bank account if enabled
      if (enableBank) {
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
        payload.enableBank = true
      } else {
        payload.enableBank = false
      }

      // Validate and add PromptPay if enabled
      if (enablePromptPay) {
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
        payload.enablePromptPay = true
      } else {
        payload.enablePromptPay = false
      }

      // Check if at least one method is enabled
      if (!enableBank && !enablePromptPay) {
        toast({
          title: "กรุณาเปิดใช้งานอย่างน้อย 1 บัญชี",
          description: "เลือกอย่างน้อย 1 ช่องทางสำหรับรับเงิน",
          variant: "destructive",
        })
        setSaving(false)
        return
      }

      console.log('💾 Saving bank account with payload:', payload)

      const res = await fetch('/api/seller/bank-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      console.log('📡 Response status:', res.status)
      
      if (!res.ok) {
        const error = await res.json()
        console.error('❌ Save failed:', error)
        throw new Error(error.error || 'Failed to save')
      }

      const result = await res.json()
      console.log('✅ Save success:', result)

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
      <CardContent className="space-y-6 px-8 py-8">
        {/* PromptPay Section */}
        <div className={`p-6 rounded-xl border-2 transition-all ${
          enablePromptPay ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200 bg-gray-50/30'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <Checkbox 
              id="enable-promptpay" 
              checked={enablePromptPay}
              onCheckedChange={(checked) => setEnablePromptPay(checked as boolean)}
            />
            <Label htmlFor="enable-promptpay" className="flex items-center gap-3 cursor-pointer flex-1">
              <div className={`p-2 rounded-lg ${enablePromptPay ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">PromptPay</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">แนะนำ</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">โอนเร็วทันใจ • ไม่มีค่าธรรมเนียม</p>
              </div>
            </Label>
          </div>

          {enablePromptPay && (
            <div className="space-y-4 pl-8 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <Label>ประเภท PromptPay</Label>
                <Select value={promptPayType} onValueChange={(v) => setPromptPayType(v as any)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mobile">📱 เบอร์โทรศัพท์</SelectItem>
                    <SelectItem value="citizen_id">🆔 เลขบัตรประชาชน</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  {promptPayType === 'mobile' ? 'เบอร์โทรศัพท์' : 'เลขบัตรประชาชน'}
                </Label>
                <Input
                  value={promptPayId}
                  onChange={(e) => setPromptPayId(e.target.value.replace(/\D/g, ''))}
                  placeholder={promptPayType === 'mobile' ? '0812345678' : '1234567890123'}
                  maxLength={promptPayType === 'mobile' ? 10 : 13}
                  className="bg-white"
                />
                <p className="text-xs text-muted-foreground">
                  {promptPayType === 'mobile' 
                    ? 'ตัวอย่าง: 0812345678 (10 หลัก)'
                    : 'ตัวอย่าง: 1234567890123 (13 หลัก)'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bank Account Section */}
        <div className={`p-6 rounded-xl border-2 transition-all ${
          enableBank ? 'border-green-500 bg-green-50/30' : 'border-gray-200 bg-gray-50/30'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <Checkbox 
              id="enable-bank" 
              checked={enableBank}
              onCheckedChange={(checked) => setEnableBank(checked as boolean)}
            />
            <Label htmlFor="enable-bank" className="flex items-center gap-3 cursor-pointer flex-1">
              <div className={`p-2 rounded-lg ${enableBank ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                <Building2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <span className="font-semibold text-gray-900">บัญชีธนาคาร</span>
                <p className="text-xs text-gray-500 mt-0.5">โอนผ่านธนาคาร • ค่าธรรมเนียม ฿25/ครั้ง</p>
              </div>
            </Label>
          </div>

          {enableBank && (
            <div className="space-y-4 pl-8 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <Label>ธนาคาร</Label>
                <Select value={bankName} onValueChange={setBankName}>
                  <SelectTrigger className="bg-white">
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
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>เลขที่บัญชี</Label>
                <Input
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="1234567890"
                  maxLength={15}
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label>ชื่อบัญชี</Label>
                <Input
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  placeholder="นาย/นาง/นางสาว ชื่อ นามสกุล"
                  className="bg-white"
                />
                <p className="text-xs text-muted-foreground">
                  *ชื่อบัญชีต้องตรงกับชื่อผู้ขายที่ลงทะเบียนไว้
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3 pt-4">
          <Button 
            onClick={handleSave} 
            disabled={saving || (!enableBank && !enablePromptPay)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            size="lg"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                บันทึกข้อมูล
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
