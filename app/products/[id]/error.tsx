'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function ProductDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Product detail error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">😕</h1>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            ไม่พบสินค้านี้
          </h2>
          <p className="text-gray-600">
            สินค้าที่คุณค้นหาอาจถูกลบหรือไม่มีอยู่แล้ว
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={reset}
            className="w-full bg-[#ff9800] hover:bg-[#e08800]"
          >
            ลองอีกครั้ง
          </Button>
          <Link href="/products" className="block w-full">
            <Button variant="outline" className="w-full">
              ดูสินค้าทั้งหมด
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
