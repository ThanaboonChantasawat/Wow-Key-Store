'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function ReportsRedirectInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const reportId = searchParams.get('reportId')

    if (reportId) {
      router.replace(`/admin?section=reports&reportId=${reportId}`)
    } else {
      router.replace('/admin?section=reports')
    }
  }, [router, searchParams])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-gray-600">กำลังเปลี่ยนเส้นทาง...</p>
      </div>
    </div>
  )
}

export default function ReportsRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">กำลังเตรียมเปลี่ยนเส้นทาง...</p>
          </div>
        </div>
      }
    >
      <ReportsRedirectInner />
    </Suspense>
  )
}
