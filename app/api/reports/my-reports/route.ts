import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

/**
 * GET /api/reports/my-reports
 * Get all reports submitted by a specific user
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Get all reports from this user (without orderBy to avoid index requirement)
    const reportsSnapshot = await adminDb
      .collection('reports')
      .where('reporterId', '==', userId)
      .get()

    const reports = reportsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      reviewedAt: doc.data().reviewedAt?.toDate?.()?.toISOString() || null,
    }))

    // Sort by createdAt in memory
    reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ reports })
  } catch (error: any) {
    console.error('Error fetching user reports:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reports' },
      { status: 500 }
    )
  }
}
