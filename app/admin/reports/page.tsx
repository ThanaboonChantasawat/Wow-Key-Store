'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function ReportsRedirectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const reportId = searchParams.get('reportId')
    
    if (reportId) {
      // Redirect to admin dashboard with reports section and reportId
      router.replace(`/admin?section=reports&reportId=${reportId}`)
    } else {
      // Redirect to admin dashboard with reports section
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
