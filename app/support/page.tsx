'use client'

import { useState } from 'react'
import { useAuth } from '@/components/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Mail, Phone, MapPin, Clock, Send, CheckCircle, AlertCircle, HelpCircle, Shield, FileText, Ban, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function SupportPage() {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const categories = [
    { value: 'general', label: '💬 คำถามทั่วไป', icon: MessageSquare },
    { value: 'account', label: '👤 บัญชีและการเข้าสู่ระบบ', icon: Shield },
    { value: 'order', label: '📦 คำสั่งซื้อและการชำระเงิน', icon: FileText },
    { value: 'report', label: '⚠️ รายงานปัญหา/การละเมิด', icon: AlertCircle },
    { value: 'appeal', label: '🙏 ยื่นอุทธรณ์', icon: Ban },
    { value: 'other', label: '❓ อื่นๆ', icon: HelpCircle }
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
        message: ''
      })
      
      setTimeout(() => setSubmitStatus('idle'), 5000)
    } catch (error) {
      console.error('Error submitting support request:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#ff9800] to-[#f57c00] rounded-full mb-4 shadow-lg">
            <MessageSquare className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-[#292d32] mb-3">
            ติดต่อทีมงาน
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            เรายินดีให้ความช่วยเหลือและตอบคำถามของคุณ ทุกวัน ตลอด 24 ชั่วโมง
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Information */}
          <div className="lg:col-span-1 space-y-6">
            {/* Contact Methods */}
            <Card className="border-2 border-[#ff9800]/20 shadow-lg overflow-hidden p-0">
              <CardHeader className="bg-gradient-to-r from-[#ff9800] to-[#f57c00] text-white p-4 pb-4 m-0">
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  ช่องทางติดต่อ
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">อีเมล</p>
                    <a href="mailto:support@wowkeystore.com" className="text-[#ff9800] hover:underline text-sm">
                      support@wowkeystore.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Phone className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">โทรศัพท์</p>
                    <a href="tel:+66123456789" className="text-[#ff9800] hover:underline text-sm">
                      +66 12 345 6789
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <MapPin className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">ที่อยู่</p>
                    <p className="text-sm text-gray-600">
                      123 ถนนสุขุมวิท<br />
                      เขตวัฒนา กรุงเทพฯ 10110
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">เวลาทำการ</p>
                    <p className="text-sm text-gray-600">
                      ทุกวัน 24/7
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FAQ Quick Links */}
            <Card className="border-2 border-blue-200 shadow-lg overflow-hidden p-0">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 pb-4 m-0">
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  คำถามที่พบบ่อย
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <Link href="/faq#account" className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <p className="font-medium text-gray-900 text-sm">🔐 วิธีการสมัครสมาชิก</p>
                </Link>
                <Link href="/faq#payment" className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <p className="font-medium text-gray-900 text-sm">💳 วิธีการชำระเงิน</p>
                </Link>
                <Link href="/faq#delivery" className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <p className="font-medium text-gray-900 text-sm">📦 การจัดส่งและรับสินค้า</p>
                </Link>
                <Link href="/faq#refund" className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <p className="font-medium text-gray-900 text-sm">↩️ นโยบายการคืนเงิน</p>
                </Link>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            {user && (
              <Card className="border-2 border-purple-200 shadow-lg overflow-hidden p-0">
                <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 pb-4 m-0">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    บริการสำหรับสมาชิก
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-3">
                  <Link href="/profile?tab=violations" className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <p className="font-medium text-gray-900 text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      ดูประวัติการถูกดำเนินการ
                    </p>
                  </Link>
                  <Link href="/profile?tab=my-orders" className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <p className="font-medium text-gray-900 text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      ตรวจสอบคำสั่งซื้อ
                    </p>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="border-2 border-[#ff9800]/20 shadow-xl overflow-hidden p-0">
              <CardHeader className="bg-gradient-to-r from-[#ff9800] to-[#f57c00] text-white p-6 pb-6 m-0">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Send className="w-6 h-6" />
                  ส่งข้อความถึงเรา
                </CardTitle>
                <p className="text-sm text-white/90 mt-2">
                  กรอกแบบฟอร์มด้านล่าง แล้วทีมงานจะติดต่อกลับโดยเร็วที่สุด
                </p>
              </CardHeader>
              <CardContent className="p-8">
                {/* Success Message */}
                {submitStatus === 'success' && (
                  <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-green-900">ส่งข้อความสำเร็จ!</p>
                      <p className="text-sm text-green-700 mt-1">
                        ขอบคุณที่ติดต่อเรา ทีมงานจะตอบกลับภายใน 24 ชั่วโมง
                      </p>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {submitStatus === 'error' && (
                  <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-red-900">เกิดข้อผิดพลาด</p>
                      <p className="text-sm text-red-700 mt-1">
                        ไม่สามารถส่งข้อความได้ กรุณาลองใหม่อีกครั้ง
                      </p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name & Email */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        ชื่อ-นามสกุล <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        placeholder="กรุณากรอกชื่อของคุณ"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#ff9800] focus:ring-2 focus:ring-[#ff9800]/20 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        อีเมล <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="your@email.com"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#ff9800] focus:ring-2 focus:ring-[#ff9800]/20 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      หมวดหมู่ <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#ff9800] focus:ring-2 focus:ring-[#ff9800]/20 outline-none transition-all bg-white"
                    >
                      <option value="">เลือกหมวดหมู่</option>
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      หัวข้อ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      placeholder="สรุปสั้นๆ ว่าคุณต้องการสอบถามเรื่องอะไร"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#ff9800] focus:ring-2 focus:ring-[#ff9800]/20 outline-none transition-all"
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      รายละเอียด <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={6}
                      placeholder="กรุณาอธิบายรายละเอียดให้ชัดเจน เพื่อให้เราช่วยเหลือคุณได้ดีที่สุด"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#ff9800] focus:ring-2 focus:ring-[#ff9800]/20 outline-none transition-all resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      💡 หากคุณต้องการอุทธรณ์การดำเนินการ กรุณาระบุรหัสรายงาน (Report ID) และเหตุผลด้วย
                    </p>
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-4">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-gradient-to-r from-[#ff9800] to-[#f57c00] hover:from-[#e08800] hover:to-[#e06c00] text-white font-bold py-6 text-lg shadow-lg"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          กำลังส่ง...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5 mr-2" />
                          ส่งข้อความ
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setFormData({
                        name: '',
                        email: '',
                        subject: '',
                        category: '',
                        message: ''
                      })}
                      className="px-8"
                    >
                      ล้างข้อมูล
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Info Banner */}
            <Card className="mt-6 border-2 border-yellow-200 bg-yellow-50 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-yellow-100 rounded-full flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-yellow-900 mb-2">📌 ข้อมูลสำคัญ</h3>
                    <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                      <li>ทีมงานจะตอบกลับภายใน 24 ชั่วโมง (วันทำการ)</li>
                      <li>กรณีเร่งด่วน โปรดโทรติดต่อโดยตรง</li>
                      <li>สำหรับการอุทธรณ์ กรุณาเตรียมหลักฐานประกอบ</li>
                      <li>ข้อมูลของคุณจะถูกเก็บเป็นความลับ</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}