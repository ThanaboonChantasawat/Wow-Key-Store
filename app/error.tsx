'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">😕</h1>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            เกิดข้อผิดพลาด
          </h2>
          <p className="text-gray-600">
            ขออภัยค่ะ เกิดข้อผิดพลาดในการโหลดหน้านี้
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
            ลองอีกครั้ง
          </Button>
          <Button
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="w-full"
          >
            กลับหน้าแรก
          </Button>
        </div>

        <p className="text-sm text-gray-500 mt-6">
          หากปัญหายังคงอยู่ กรุณาลองรีเฟรชหน้าเว็บ หรือล้าง cache
        </p>
      </div>
    </div>
  )
}
