'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react'

export default function UpdateStatsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const updateStats = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/shops/update-all-stats', {
        method: 'POST'
      })
      
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ 
        success: false, 
        error: 'Failed to update stats' 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Update Shop Statistics</CardTitle>
            <p className="text-gray-600">
              คลิกปุ่มด้านล่างเพื่ออัพเดทจำนวนสินค้าและยอดขายของทุกร้านค้า
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={updateStats} 
              disabled={loading}
              className="w-full bg-[#ff9800] hover:bg-[#e08800]"
              size="lg"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  กำลังอัพเดท...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  อัพเดทสถิติทุกร้านค้า
                </>
              )}
            </Button>

            {result && (
              <div className={`p-4 rounded-lg ${
                result.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`font-semibold ${
                      result.success ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {result.message || result.error}
                    </p>
                    {result.success && (
                      <p className="text-sm text-green-700 mt-1">
                        อัพเดทสำเร็จ: {result.updated} ร้าน
                        {result.failed > 0 && ` | ล้มเหลว: ${result.failed} ร้าน`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>หมายเหตุ:</strong> การอัพเดทจะนับ:
              </p>
              <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
                <li>จำนวนสินค้า (totalProducts) - นับเฉพาะสินค้าที่มีสถานะ active</li>
                <li>ยอดขาย (totalSales) - นับจากออเดอร์ที่มีสถานะ completed</li>
                <li>รายได้รวม (totalRevenue) - รวมยอดขายทั้งหมด</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
