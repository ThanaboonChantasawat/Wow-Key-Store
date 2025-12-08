"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { BankAccount } from "@/lib/bank-account-types"
import { Loader2, Building2, Smartphone, Plus, Edit2, Trash2, Star, CheckCircle2, XCircle, CreditCard } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface BankAccountsManagerProps {
  shopId: string
}

const THAI_BANKS = [
  "ธนาคารกรุงเทพ",
  "ธนาคารกสิกรไทย", 
  "ธนาคารกรุงไทย",
  "ธนาคารทหารไทยธนชาต",
  "ธนาคารไทยพาณิชย์",
  "ธนาคารกรุงศรีอยุธยา",
  "ธนาคารเกียรตินาคินภัทร",
  "ธนาคารซีไอเอ็มบีไทย",
  "ธนาคารทิสโก้",
  "ธนาคารยูโอบี",
  "ธนาคารไทยเครดิตเพื่อรายย่อย",
  "ธนาคารแลนด์ แอนด์ เฮ้าส์",
  "ธนาคารไอซีบีซี (ไทย)",
  "ธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อมแห่งประเทศไทย",
  "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร",
  "ธนาคารเพื่อการส่งออกและนำเข้าแห่งประเทศไทย",
  "ธนาคารออมสิน",
  "ธนาคารอาคารสงเคราะห์",
]

export function BankAccountsManager({ shopId }: BankAccountsManagerProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Form state
  const [accountType, setAccountType] = useState<'bank' | 'promptpay'>('bank')
  const [displayName, setDisplayName] = useState('')
  
  // Bank fields
  const [bankName, setBankName] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankAccountName, setBankAccountName] = useState('')
  const [bankBranch, setBankBranch] = useState('')
  
  // PromptPay fields
  const [promptPayId, setPromptPayId] = useState('')
  const [promptPayType, setPromptPayType] = useState<'mobile' | 'citizen_id' | 'ewallet'>('mobile')

  // Load accounts
  useEffect(() => {
    loadAccounts(true)
    
    // Auto-refresh every 30 seconds to check verification status
    const interval = setInterval(() => {
      loadAccounts(false)
    }, 30000)
    
    return () => clearInterval(interval)
  }, [shopId])

  const loadAccounts = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const res = await fetch(`/api/seller/bank-accounts?shopId=${shopId}`)
      if (res.ok) {
        const data = await res.json()
        setAccounts(data.accounts || [])
      }
    } catch (error) {
      console.error('Failed to load accounts:', error)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const resetForm = () => {
    setAccountType('bank')
    setDisplayName('')
    setBankName('')
    setBankAccountNumber('')
    setBankAccountName('')
    setBankBranch('')
    setPromptPayId('')
    setPromptPayType('mobile')
    setEditingAccount(null)
  }

  const handleEdit = (account: BankAccount) => {
    setEditingAccount(account)
    setAccountType(account.accountType)
    setDisplayName(account.displayName || '')
    
    if (account.accountType === 'bank') {
      setBankName(account.bankName || '')
      setBankAccountNumber(account.bankAccountNumber || '')
      setBankAccountName(account.bankAccountName || '')
      setBankBranch(account.bankBranch || '')
    } else {
      setPromptPayId(account.promptPayId || '')
      setPromptPayType(account.promptPayType || 'mobile')
    }
    
    setDialogOpen(true)
  }

  const handleSave = async () => {
    // Validation
    if (!displayName.trim()) {
      toast({
        title: "กรุณาใส่ชื่อบัญชี",
        description: "เช่น บัญชีหลัก, บัญชีรอง",
        variant: "destructive",
      })
      return
    }

    if (accountType === 'bank') {
      if (!bankName || !bankAccountNumber || !bankAccountName) {
        toast({
          title: "กรุณากรอกข้อมูลให้ครบถ้วน",
          description: "ต้องกรอก ธนาคาร, เลขบัญชี และชื่อบัญชี",
          variant: "destructive",
        })
        return
      }

      if (!/^\d{10,20}$/.test(bankAccountNumber)) {
        toast({
          title: "เลขบัญชีไม่ถูกต้อง",
          description: "เลขบัญชีต้องเป็นตัวเลข 10-20 หลัก",
          variant: "destructive",
        })
        return
      }
    } else {
      if (!promptPayId) {
        toast({
          title: "กรุณากรอก PromptPay ID",
          variant: "destructive",
        })
        return
      }

      if (promptPayType === 'mobile' && !/^0\d{9}$/.test(promptPayId)) {
        toast({
          title: "เบอร์โทรไม่ถูกต้อง",
          description: "เบอร์โทรต้องขึ้นต้นด้วย 0 และมี 10 หลัก",
          variant: "destructive",
        })
        return
      }

      if (promptPayType === 'citizen_id' && !/^\d{13}$/.test(promptPayId)) {
        toast({
          title: "เลขบัตรประชาชนไม่ถูกต้อง",
          description: "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก",
          variant: "destructive",
        })
        return
      }
    }

    try {
      const payload = {
        shopId,
        accountType,
        displayName,
        ...(accountType === 'bank' ? {
          bankName,
          bankAccountNumber,
          bankAccountName,
          bankBranch,
        } : {
          promptPayId,
          promptPayType,
        }),
        ...(editingAccount ? { id: editingAccount.id } : {}),
      }

      const res = await fetch('/api/seller/bank-accounts', {
        method: editingAccount ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const result = await res.json()
        
        let toastMessage = editingAccount ? "✅ อัพเดตบัญชีสำเร็จ" : "✅ เพิ่มบัญชีสำเร็จ"
        let toastDescription = ""
        
        if (result.verification) {
          if (result.verification.verified) {
            toastDescription = "✅ ยืนยันบัญชีสำเร็จ! สามารถถอนเงินได้แล้ว"
          } else {
            toastDescription = result.verification.message || "กำลังยืนยันบัญชี..."
          }
        }
        
        toast({
          title: toastMessage,
          description: toastDescription,
        })
        setDialogOpen(false)
        resetForm()
        loadAccounts()
      } else {
        const error = await res.json()
        toast({
          title: "เกิดข้อผิดพลาด",
          description: error.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกข้อมูลได้",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (accountId: string) => {
    setDeleting(accountId)
    try {
      const res = await fetch(`/api/seller/bank-accounts?shopId=${shopId}&accountId=${accountId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast({ title: "✅ ลบบัญชีสำเร็จ" })
        setDeleteDialogOpen(false)
        setDialogOpen(false)
        loadAccounts()
      } else {
        const error = await res.json()
        toast({
          title: "เกิดข้อผิดพลาด",
          description: error.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    } finally {
      setDeleting(null)
    }
  }

  const handleSetDefault = async (accountId: string) => {
    try {
      const res = await fetch('/api/seller/bank-accounts/set-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId, accountId }),
      })

      if (res.ok) {
        toast({ title: "✅ ตั้งเป็นบัญชีหลักแล้ว" })
        loadAccounts()
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    }
  }

  const handleToggleEnabled = async (accountId: string, enabled: boolean) => {
    // Check verification status before enabling
    const account = accounts.find(a => a.id === accountId)
    if (enabled && account?.verificationStatus !== 'verified') {
      toast({
        title: "ไม่สามารถเปิดใช้งานได้",
        description: "กรุณารอการยืนยันบัญชีให้เสร็จสิ้นก่อน",
        variant: "destructive",
      })
      return
    }

    try {
      const res = await fetch('/api/seller/bank-accounts/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId, accountId, enabled }),
      })

      if (res.ok) {
        toast({ title: enabled ? "✅ เปิดใช้งานบัญชี" : "⏸️ ปิดใช้งานบัญชี" })
        loadAccounts(false) // Reload without full loading spinner
      } else {
        const error = await res.json()
        let errorMessage = error.error

        if (errorMessage === 'Cannot disable the only enabled account') {
          errorMessage = "ไม่สามารถปิดบัญชีนี้ได้ เนื่องจากต้องมีบัญชีที่เปิดใช้งานอย่างน้อย 1 บัญชี"
        }

        toast({
          title: "ไม่สามารถเปลี่ยนสถานะได้",
          description: errorMessage || "เกิดข้อผิดพลาดในการเปลี่ยนสถานะ",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8 sm:py-12">
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div>
              <CardTitle className="text-lg sm:text-xl">บัญชีรับเงิน</CardTitle>
              <CardDescription className="text-xs sm:text-sm">จัดการบัญชีธนาคารและ PromptPay สำหรับรับเงิน</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open)
              if (!open) resetForm()
            }}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  เพิ่มบัญชี
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-full sm:max-w-2xl max-h-[85vh] flex flex-col mx-2 sm:mx-auto">
                <DialogHeader>
                  <DialogTitle className="text-base sm:text-lg lg:text-xl">
                    {editingAccount ? '✏️ แก้ไขบัญชี' : '➕ เพิ่มบัญชีใหม่'}
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm">
                    กรอกข้อมูลบัญชีธนาคารหรือ PromptPay เพื่อรับเงิน (ช่องที่มี <span className="text-red-500">*</span> จำเป็นต้องกรอก)
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  {/* Display Name */}
                  <div>
                    <Label className="text-sm font-medium">
                      ชื่อบัญชี (สำหรับแสดง) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="เช่น บัญชีหลัก, บัญชีรอง"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="mt-1.5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      ตั้งชื่อที่จำง่ายสำหรับจดจำบัญชีนี้
                    </p>
                  </div>

                  {/* Account Type */}
                  <div>
                    <Label className="text-sm font-medium">
                      ประเภทบัญชี <span className="text-red-500">*</span>
                    </Label>
                    <Select 
                      value={accountType} 
                      onValueChange={(v) => setAccountType(v as any)}
                      disabled={!!editingAccount}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank">🏦 บัญชีธนาคาร</SelectItem>
                        <SelectItem value="promptpay">📱 PromptPay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Bank Account Fields */}
                  {accountType === 'bank' && (
                    <>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                        <p className="font-medium text-blue-900 mb-1">📋 ข้อมูลบัญชีธนาคาร</p>
                        <p className="text-blue-700 text-xs">
                          กรอกข้อมูลให้ตรงกับบัญชีธนาคารของคุณ ระบบจะยืนยันด้วยการโอน 1 บาท
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">
                          ธนาคาร <span className="text-red-500">*</span>
                        </Label>
                        <Select value={bankName} onValueChange={setBankName}>
                          <SelectTrigger className="mt-1.5">
                            <SelectValue placeholder="เลือกธนาคาร" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {THAI_BANKS.map(bank => (
                              <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">
                          เลขบัญชี <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="text"
                          placeholder="1234567890"
                          value={bankAccountNumber}
                          onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                          maxLength={20}
                          className="mt-1.5 font-mono text-lg tracking-wider"
                        />
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-xs text-muted-foreground">
                            ตัวเลข 10-20 หลัก (ไม่ต้องมีขีด)
                          </p>
                          {bankAccountNumber.length >= 4 && (
                            <div className="text-xs font-medium">
                              {/^4/.test(bankAccountNumber) && <span className="text-blue-600 flex items-center gap-1"><CreditCard className="w-3 h-3" /> Visa</span>}
                              {/^5/.test(bankAccountNumber) && <span className="text-orange-600 flex items-center gap-1"><CreditCard className="w-3 h-3" /> Mastercard</span>}
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">
                          ชื่อบัญชี <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          placeholder="นาย/นาง... (ภาษาไทยหรืออังกฤษ)"
                          value={bankAccountName}
                          onChange={(e) => setBankAccountName(e.target.value)}
                          className="mt-1.5"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          ชื่อเจ้าของบัญชีตามที่ปรากฏในสมุดบัญชี
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">สาขา (ไม่บังคับ)</Label>
                        <Input
                          placeholder="เช่น สาขาสยามพารากอน"
                          value={bankBranch}
                          onChange={(e) => setBankBranch(e.target.value)}
                          className="mt-1.5"
                        />
                      </div>
                    </>
                  )}

                  {/* PromptPay Fields */}
                  {accountType === 'promptpay' && (
                    <>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                        <p className="font-medium text-green-900 mb-1">📱 PromptPay</p>
                        <p className="text-green-700 text-xs">
                          รับเงินผ่าน PromptPay ด้วยเบอร์โทรหรือเลขบัตรประชาชน
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">
                          ประเภท PromptPay <span className="text-red-500">*</span>
                        </Label>
                        <Select value={promptPayType} onValueChange={(v) => setPromptPayType(v as any)}>
                          <SelectTrigger className="mt-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mobile">📱 เบอร์โทรศัพท์</SelectItem>
                            <SelectItem value="citizen_id">🆔 เลขบัตรประชาชน</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">
                          {promptPayType === 'mobile' ? 'เบอร์โทรศัพท์' : 'เลขบัตรประชาชน'}
                          <span className="text-red-500"> *</span>
                        </Label>
                        <Input
                          type="text"
                          placeholder={promptPayType === 'mobile' ? '0812345678' : '1234567890123'}
                          value={promptPayId}
                          onChange={(e) => setPromptPayId(e.target.value.replace(/\D/g, ''))}
                          maxLength={promptPayType === 'mobile' ? 10 : 13}
                          className="mt-1.5 font-mono text-lg tracking-wider"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {promptPayType === 'mobile' 
                            ? 'เบอร์โทรศัพท์ 10 หลัก (ขึ้นต้นด้วย 0)' 
                            : 'เลขบัตรประชาชน 13 หลัก'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <DialogFooter className="mt-6 flex flex-col sm:flex-row justify-between gap-2">
                  {editingAccount && (
                    <Button 
                      type="button"
                      variant="destructive" 
                      onClick={(e) => {
                        e.preventDefault()
                        setDeleteDialogOpen(true)
                      }}
                      disabled={deleting === editingAccount.id || (editingAccount.isDefault && accounts.length > 1)}
                      className="w-full sm:w-auto"
                    >
                      {deleting === editingAccount.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          ลบบัญชี
                        </>
                      )}
                    </Button>
                  )}
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setDialogOpen(false)
                        resetForm()
                      }}
                      className="flex-1 sm:flex-none"
                    >
                      ยกเลิก
                    </Button>
                    <Button 
                      onClick={handleSave} 
                      className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700"
                    >
                      {editingAccount ? '💾 บันทึก' : '➕ เพิ่มบัญชี'}
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-gray-500">
              <Building2 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
              <p className="text-sm sm:text-base">ยังไม่มีบัญชีรับเงิน</p>
              <p className="text-xs sm:text-sm">คลิก "เพิ่มบัญชี" เพื่อเริ่มต้น</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="border rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors cursor-pointer relative group"
                  onClick={() => handleEdit(account)}
                >
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                    <div className="flex items-start gap-2 sm:gap-3 flex-1 w-full">
                      <div className="mt-1">
                        {account.accountType === 'bank' ? (
                          <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        ) : (
                          <Smartphone className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                          <h4 className="font-semibold group-hover:text-blue-600 transition-colors text-sm sm:text-base">{account.displayName}</h4>
                          {account.isDefault && (
                            <Badge variant="default" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              บัญชีหลัก
                            </Badge>
                          )}
                          {/* Verification Status Badge */}
                          {account.verificationStatus === 'verified' && (
                            <Badge variant="default" className="text-xs bg-green-500">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              ยืนยันแล้ว
                            </Badge>
                          )}
                          {account.verificationStatus === 'pending' && (
                            <Badge variant="secondary" className="text-xs bg-yellow-500 text-white">
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              รอยืนยัน
                            </Badge>
                          )}
                          {account.verificationStatus === 'failed' && (
                            <Badge variant="destructive" className="text-xs">
                              <XCircle className="h-3 w-3 mr-1" />
                              ยืนยันล้มเหลว
                            </Badge>
                          )}
                          {account.isEnabled ? (
                            <Badge variant="outline" className="text-xs text-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              เปิดใช้งาน
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-gray-500">
                              <XCircle className="h-3 w-3 mr-1" />
                              ปิดใช้งาน
                            </Badge>
                          )}
                        </div>

                        {account.accountType === 'bank' ? (
                          <div className="text-xs sm:text-sm text-gray-600 space-y-0.5 sm:space-y-1">
                            <p>{account.bankName}</p>
                            <p>เลขบัญชี: {account.bankAccountNumber}</p>
                            <p>ชื่อบัญชี: {account.bankAccountName}</p>
                            {account.bankBranch && <p>สาขา: {account.bankBranch}</p>}
                          </div>
                        ) : (
                          <div className="text-xs sm:text-sm text-gray-600">
                            <p>
                              {account.promptPayType === 'mobile' ? '📱 เบอร์โทร: ' : '🆔 บัตรประชาชน: '}
                              {account.promptPayId}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1.5 sm:gap-2 items-center">
                      {!account.isDefault && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSetDefault(account.id)
                          }}
                          title="ตั้งเป็นบัญชีหลัก"
                          className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                        >
                          <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      )}
                      
                      {account.verificationStatus === 'verified' && (
                        <div 
                          className="flex items-center gap-2 z-10 relative"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Switch
                            checked={!!account.isEnabled}
                            onCheckedChange={(checked) => handleToggleEnabled(account.id, checked)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>คุณต้องการลบบัญชีนี้หรือไม่?</AlertDialogTitle>
            <AlertDialogDescription>
              การกระทำนี้ไม่สามารถย้อนกลับได้ ข้อมูลบัญชีจะถูกลบออกจากระบบอย่างถาวร
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (editingAccount) handleDelete(editingAccount.id)
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={!!deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "ยืนยันการลบ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
