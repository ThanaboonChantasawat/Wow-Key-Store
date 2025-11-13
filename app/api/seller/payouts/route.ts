import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Fetch payout records from Firestore
    const snapshot = await adminDb
      .collection('payouts')
      .where('userId', '==', userId)
      .get()

    const payouts = snapshot.docs.map((doc) => {
      const data = doc.data() as any
      const createdAt = data.createdAt?.toDate?.() ?? new Date()
      const arrivalDate = data.arrivalDate instanceof Date
        ? Math.floor(data.arrivalDate.getTime() / 1000)
        : (typeof data.arrivalDate === 'number' ? data.arrivalDate : Math.floor((Date.now() + 2 * 24 * 3600 * 1000) / 1000))

      // Normalize to Stripe-like shape the UI expects
      return {
        id: doc.id,
        amount: Math.round((Number(data.amount) || 0) * 100), // satang
        currency: 'thb',
        status: (data.status === 'pending_manual_transfer') ? 'pending' : (data.status || 'pending'),
        arrival_date: arrivalDate,
        created: Math.floor(createdAt.getTime() / 1000),
        description: data.method === 'manual' ? 'Manual payout (admin processed)' : (data.description || null),
        destination: data.bankAccount || null,
      }
    })

    // Sort by created desc
    payouts.sort((a, b) => b.created - a.created)

    return NextResponse.json({
      payouts,
      source: 'firestore',
    })
  } catch (error: any) {
    console.error('❌ Error fetching seller payouts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch seller payouts', details: error.message },
      { status: 500 }
    )
  }
}
