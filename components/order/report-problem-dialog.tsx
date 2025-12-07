"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertTriangle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-context"

interface ReportProblemDialogProps {
  orderId: string
  orderNumber: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const problemTypes = [
  { value: 'wrong_code', label: 'รหัสผิด/ไม่ถูกต้อง' },
  { value: 'code_not_working', label: 'รหัสใช้ไม่ได้' },
  { value: 'code_already_used', label: 'รหัสถูกใช้ไปแล้ว' },
  { value: 'no_code_received', label: 'ไม่ได้รับรหัส' },
  { value: 'seller_unresponsive', label: 'ผู้ขายไม่ตอบ' },
  { value: 'other', label: 'อื่น ๆ' }
]

export function ReportProblemDialog({
  orderId,
  orderNumber,
  isOpen,
  onClose,
  onSuccess
}: ReportProblemDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [problemType, setProblemType] = useState<string>('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "กรุณาเข้าสู่ระบบ",
        variant: "destructive"
      })
      return
    }

    if (!problemType || !subject.trim() || !description.trim()) {
      toast({
        title: "กรุณากรอกข้อมูลให้ครบถ้วน",
        variant: "destructive"
      })
      return
    }

    try {
      setLoading(true)

      const token = await user.getIdToken()
      const response = await fetch('/api/disputes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderId,
          type: problemType,
          subject: subject.trim(),
          description: description.trim()
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'เกิดข้อผิดพลาด')
      }

      toast({
        title: "รายงานปัญหาสำเร็จ",
        description: "ทีมงานจะตรวจสอบและติดต่อกลับภายใน 24-48 ชั่วโมง"
      })

      // Reset form
      setProblemType('')
      setSubject('')
      setDescription('')
      
      onSuccess?.()
      onClose()

    } catch (error: any) {
      console.error('Error reporting problem:', error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            รายงานปัญหา
          </DialogTitle>
          <DialogDescription>
            คำสั่งซื้อ {orderNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="problem-type">ประเภทปัญหา <span className="text-red-500">*</span></Label>
            <Select value={problemType} onValueChange={setProblemType}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกประเภทปัญหา" />
              </SelectTrigger>
              <SelectContent>
                {problemTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">หัวข้อปัญหา <span className="text-red-500">*</span></Label>
            <input
              id="subject"
              type="text"
              className="w-full px-3 py-2 border rounded-md"
              placeholder="สรุปปัญหาสั้น ๆ"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={100}
              disabled={loading}
            />
            <p className="text-xs text-gray-500">{subject.length}/100</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">รายละเอียดปัญหา <span className="text-red-500">*</span></Label>
            <Textarea
              id="description"
              placeholder="อธิบายปัญหาโดยละเอียด เช่น รหัสที่ได้รับ, ข้อความแสดงข้อผิดพลาด, เวลาที่พบปัญหา"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              maxLength={1000}
              disabled={loading}
            />
            <p className="text-xs text-gray-500">{description.length}/1000</p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">
              <strong>หมายเหตุ:</strong> เมื่อรายงานปัญหา การโอนเงินให้ผู้ขายจะถูกพักไว้จนกว่าแอดมินจะตรวจสอบ
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !problemType || !subject.trim() || !description.trim()}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                กำลังส่ง...
              </>
            ) : (
              'ส่งรายงาน'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
