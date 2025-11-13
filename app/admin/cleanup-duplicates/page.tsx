"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Trash2, AlertTriangle, CheckCircle } from "lucide-react"
import { useAuth } from "@/components/auth-context"

export default function CleanupDuplicatesPage() {
  const { user } = useAuth()
  const [userId, setUserId] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCleanup = async (dryRun: boolean) => {
    if (!userId.trim()) {
      setError("กรุณากรอก User ID")
      return
    }

    try {
      setLoading(true)
      setError(null)
      setResult(null)

      const response = await fetch('/api/admin/cleanup-duplicate-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId.trim(),
          dryRun,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด')
      }
    } catch (err: any) {
      console.error('Cleanup error:', err)
      setError(err.message || 'เกิดข้อผิดพลาดในการลบข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>ลบคำสั่งซื้อซ้ำ (Cleanup Duplicate Orders)</CardTitle>
          <CardDescription>
            ลบคำสั่งซื้อที่ซ้ำกันโดยเก็บเฉพาะคำสั่งซื้อล่าสุด (สำหรับ Admin เท่านั้น)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User ID Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">User ID</label>
            <Input
              placeholder="กรอก User ID (Firebase UID)"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              💡 Tip: คุณสามารถหา User ID ได้จาก Firebase Console → Authentication
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => handleCleanup(true)}
              disabled={loading || !userId.trim()}
              variant="outline"
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  กำลังตรวจสอบ...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  ทดสอบ (Dry Run)
                </>
              )}
            </Button>
            <Button
              onClick={() => handleCleanup(false)}
              disabled={loading || !userId.trim()}
              variant="destructive"
              className="flex-1"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              ลบจริง
            </Button>
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-4">
              <Alert className={result.dryRun ? "border-yellow-200 bg-yellow-50" : "border-green-200 bg-green-50"}>
                <CheckCircle className={`w-4 h-4 ${result.dryRun ? 'text-yellow-600' : 'text-green-600'}`} />
                <AlertDescription className={result.dryRun ? 'text-yellow-800' : 'text-green-800'}>
                  {result.message}
                </AlertDescription>
              </Alert>

              {/* Summary */}
              <Card className="bg-gray-50">
                <CardHeader>
                  <CardTitle className="text-lg">สรุปผลการตรวจสอบ</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-700">คำสั่งซื้อทั้งหมด:</span>
                    <span className="font-semibold">{result.summary.totalOrders} รายการ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">กลุ่มที่มีคำสั่งซื้อซ้ำ:</span>
                    <span className="font-semibold text-orange-600">{result.summary.duplicateGroups} กลุ่ม</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">จำนวนที่จะลบ:</span>
                    <span className="font-semibold text-red-600">{result.summary.ordersToDelete} รายการ</span>
                  </div>
                </CardContent>
              </Card>

              {/* Duplicate Details */}
              {result.duplicatesFound && result.duplicatesFound.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">รายละเอียดคำสั่งซื้อซ้ำ</h3>
                  {result.duplicatesFound.map((group: any, index: number) => (
                    <Card key={index} className="border-orange-200">
                      <CardContent className="pt-6 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">กลุ่ม #{index + 1}</span>
                          <span className="text-xs text-gray-500">จำนวน: {group.totalCount} รายการ</span>
                        </div>
                        
                        {/* Keep Order */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-semibold text-green-800">เก็บไว้</span>
                          </div>
                          <div className="text-xs text-gray-700 space-y-1">
                            <div>ID: {group.keepOrder.id}...</div>
                            <div>สถานะ: {group.keepOrder.status} | การชำระ: {group.keepOrder.paymentStatus}</div>
                            <div>สร้างเมื่อ: {new Date(group.keepOrder.createdAt).toLocaleString('th-TH')}</div>
                          </div>
                        </div>

                        {/* Duplicate Orders */}
                        <div className="space-y-2">
                          <span className="text-sm font-medium text-red-700">ลบทิ้ง ({group.duplicateOrders.length} รายการ):</span>
                          {group.duplicateOrders.map((dup: any, dupIndex: number) => (
                            <div key={dupIndex} className="bg-red-50 border border-red-200 rounded-lg p-2">
                              <div className="text-xs text-gray-700 space-y-1">
                                <div>ID: {dup.id}...</div>
                                <div>สถานะ: {dup.status} | การชำระ: {dup.paymentStatus}</div>
                                <div>สร้างเมื่อ: {new Date(dup.createdAt).toLocaleString('th-TH')}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
