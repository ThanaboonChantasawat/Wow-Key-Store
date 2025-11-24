import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'
import { BankAccount } from '@/lib/bank-account-types'
import admin from 'firebase-admin'

// POST - Toggle account enabled status
export async function POST(request: NextRequest) {
  try {
    const { shopId, accountId, enabled } = await request.json()

    if (!shopId || !accountId || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Shop ID, Account ID, and enabled status are required' },
        { status: 400 }
      )
    }

    const shopRef = adminDb.collection('shops').doc(shopId)
    const shopDoc = await shopRef.get()

    if (!shopDoc.exists) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    const shopData = shopDoc.data()
    const accounts: BankAccount[] = shopData?.bankAccounts || []

    const accountIndex = accounts.findIndex(acc => acc.id === accountId)
    if (accountIndex === -1) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Check if trying to disable the only enabled account
    const enabledAccounts = accounts.filter(acc => acc.isEnabled)
    if (!enabled && enabledAccounts.length === 1 && enabledAccounts[0].id === accountId) {
      return NextResponse.json(
        { error: 'Cannot disable the only enabled account' },
        { status: 400 }
      )
    }

    // Update account
    accounts[accountIndex] = {
      ...accounts[accountIndex],
      isEnabled: enabled,
      updatedAt: new Date(),
    }

    await shopRef.update({
      bankAccounts: accounts,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error toggling account status:', error)
    return NextResponse.json(
      { error: 'Failed to toggle account status' },
      { status: 500 }
    )
  }
}
