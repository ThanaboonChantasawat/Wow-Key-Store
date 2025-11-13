'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Products page error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">🎮</h1>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            ไม่สามารถโหลดสินค้าได้
          </h2>
          <p className="text-gray-600">
            ขออภัยค่ะ เกิดข้อผิดพลาดในการโหลดหน้าสินค้า
          </p>
          {error.digest && (
            <p className="text-xs text-gray-400 mt-2">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <Button
            onClick={reset}
            className="w-full bg-[#ff9800] hover:bg-[#e08800]"
          >
            ลองโหลดใหม่
          </Button>
          <Link href="/" className="block w-full">
            <Button variant="outline" className="w-full">
              กลับหน้าแรก
            </Button>
          </Link>
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-900 font-medium mb-2">
            💡 วิธีแก้ปัญหา:
          </p>
          <ul className="text-xs text-blue-800 space-y-1 text-left">
            <li>• กด Ctrl+Shift+R (Windows) หรือ Cmd+Shift+R (Mac) เพื่อรีเฟรชแบบเต็ม</li>
            <li>• ลองล้าง cache ของเบราว์เซอร์</li>
            <li>• ลองใช้โหมด Incognito/Private</li>
            <li>• ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
