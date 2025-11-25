// API Route: POST /api/auto-confirm
// Run auto-confirm job (should be called by cron job)

import { NextRequest, NextResponse } from 'next/server'
import { autoConfirmOrders } from '@/lib/auto-confirm-service'

export async function POST(request: NextRequest) {
  try {
    // ตรวจสอบ Secret Key (ป้องกันการเรียกใช้จากภายนอก)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key'

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🤖 Running auto-confirm cron job...')

    const result = await autoConfirmOrders()

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Error in POST /api/auto-confirm:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// สำหรับ Vercel Cron Jobs
export const runtime = 'edge'
export const dynamic = 'force-dynamic'
