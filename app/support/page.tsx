'use client'

import { useState } from 'react'
import { useAuth } from '@/components/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { MessageSquare, Mail, Phone, MapPin, Clock, Send, CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react'

export default function SupportPage() {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: '',
    message: '',
    reportId: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const categories = [
    { value: 'general', label: '💬 คำถามทั่วไป' },
    { value: 'account', label: '👤 บัญชีและการเข้าสู่ระบบ' },
    { value: 'order', label: '📦 คำสั่งซื้อและการชำระเงิน' },
    { value: 'report', label: '⚠️ รายงานปัญหา/การละเมิด' },
    { value: 'appeal', label: '🙏 ยื่นอุทธรณ์' },
    { value: 'other', label: '❓ อื่นๆ' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          userId: user?.uid || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit')
      }
      
      setSubmitStatus('success')
      setFormData({
        name: '',
        email: '',
        subject: '',
        category: '',
        message: '',
        reportId: ''
      })
      
      setTimeout(() => setSubmitStatus('idle'), 5000)
    } catch (error) {
      console.error('Error submitting support request:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      category: value
    }))
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white py-16 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('/images/pattern.png')] opacity-10"></div>
        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-white/20 backdrop-blur-sm rounded-2xl mb-6 shadow-lg">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            ติดต่อทีมงาน
          </h1>
          <p className="text-lg md:text-xl text-orange-50 max-w-2xl mx-auto font-light">
            เราพร้อมดูแลและให้ความช่วยเหลือคุณตลอด 24 ชั่วโมง
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-10 pb-20 relative z-20">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-none p-0 shadow-2xl bg-white/95 backdrop-blur-sm overflow-hidden rounded-2xl ring-1 ring-black/5">
              <div className="relative h-32 bg-gradient-to-br from-orange-400 to-amber-500 overflow-hidden">
                <div className="absolute inset-0 bg-[url('/images/pattern.png')] opacity-20 mix-blend-overlay"></div>
                <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                <div className="absolute top-6 left-6">
                  <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl inline-flex">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mt-3">ช่องทางติดต่อ</h3>
                </div>
              </div>
              
              <CardContent className="p-6 space-y-6">
                <div className="flex items-start gap-4 group p-3 rounded-xl hover:bg-orange-50/50 transition-all duration-300">
                  <div className="p-3 bg-orange-100/50 text-orange-600 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-all duration-300 shadow-sm">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-0.5">อีเมล</p>
                    <a href="mailto:wowkeystore@gmail.com" className="text-gray-900 font-medium hover:text-orange-600 transition-colors">
                      wowkeystore@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4 group p-3 rounded-xl hover:bg-orange-50/50 transition-all duration-300">
                  <div className="p-3 bg-orange-100/50 text-orange-600 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-all duration-300 shadow-sm">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-0.5">โทรศัพท์</p>
                    <a href="tel:024073888" className="text-gray-900 font-medium hover:text-orange-600 transition-colors">
                      02 407 3888
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4 group p-3 rounded-xl hover:bg-orange-50/50 transition-all duration-300">
                  <div className="p-3 bg-orange-100/50 text-orange-600 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-all duration-300 shadow-sm">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-0.5">ที่อยู่</p>
                    <p className="text-gray-900 font-medium text-sm leading-relaxed">
                      9 1 ถ. พหลโยธิน ตำบล คลองหนึ่ง<br />
                      อำเภอ คลองหลวง ปทุมธานี 12120
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 group p-3 rounded-xl hover:bg-orange-50/50 transition-all duration-300">
                  <div className="p-3 bg-orange-100/50 text-orange-600 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-all duration-300 shadow-sm">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-0.5">เวลาทำการ</p>
                    <p className="text-gray-900 font-medium text-sm">
                      ทุกวัน ตลอด 24 ชั่วโมง
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="border-none p-0 shadow-2xl bg-white/95 backdrop-blur-sm overflow-hidden rounded-2xl ring-1 ring-black/5">
              <CardHeader className="p-8 relative bg-gradient-to-br from-orange-400 to-amber-500 overflow-hidden">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl inline-flex">
                    <Send className="w-5 h-5 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-white">
                    ส่งข้อความถึงเรา
                  </CardTitle>
                </div>
                <p className="text-white pl-12">
                  กรอกแบบฟอร์มด้านล่าง ทีมงานจะรีบติดต่อกลับโดยเร็วที่สุด
                </p>
              </CardHeader>
              <CardContent className="p-8">
                {submitStatus === 'success' && (
                  <div className="mb-8 p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="bg-green-100 p-2 rounded-full">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold text-green-900">ส่งข้อความสำเร็จ!</p>
                      <p className="text-sm text-green-700">
                        ขอบคุณที่ติดต่อเรา ทีมงานจะตอบกลับภายใน 24 ชั่วโมง
                      </p>
                    </div>
                  </div>
                )}

                {submitStatus === 'error' && (
                  <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="bg-red-100 p-2 rounded-full">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-bold text-red-900">เกิดข้อผิดพลาด</p>
                      <p className="text-sm text-red-700">
                        ไม่สามารถส่งข้อความได้ กรุณาลองใหม่อีกครั้ง
                      </p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">ชื่อ-นามสกุล <span className="text-red-500">*</span></Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        placeholder="กรุณากรอกชื่อของคุณ"
                        className="h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">อีเมล <span className="text-red-500">*</span></Label>
                      <Input
                        id="email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="your@email.com"
                        className="h-12"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">หมวดหมู่ <span className="text-red-500">*</span></Label>
                    <Select value={formData.category} onValueChange={handleSelectChange}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="เลือกหมวดหมู่เรื่องที่ต้องการติดต่อ" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.category === 'appeal' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                      <Label htmlFor="reportId">เลขประวัติการละเมิด (Report ID) <span className="text-red-500">*</span></Label>
                      <Input
                        id="reportId"
                        name="reportId"
                        value={formData.reportId}
                        onChange={handleChange}
                        required
                        placeholder="ระบุเลข Report ID ที่ต้องการอุทธรณ์"
                        className="h-12"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="subject">หัวข้อ <span className="text-red-500">*</span></Label>
                    <Input
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      placeholder="สรุปสั้นๆ ว่าคุณต้องการสอบถามเรื่องอะไร"
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">รายละเอียด <span className="text-red-500">*</span></Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={6}
                      placeholder="กรุณาอธิบายรายละเอียดให้ชัดเจน เพื่อให้เราช่วยเหลือคุณได้ดีที่สุด"
                      className="resize-none"
                    />
                  </div>

                  <div className="pt-4">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold h-14 text-lg rounded-xl shadow-lg shadow-orange-200 transition-all hover:scale-[1.01] active:scale-[0.99]"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          กำลังส่งข้อความ...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5 mr-2" />
                          ส่งข้อความ
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}