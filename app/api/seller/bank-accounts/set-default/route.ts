import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'
import { BankAccount } from '@/lib/bank-account-types'
import admin from 'firebase-admin'

// POST - Set an account as default
export async function POST(request: NextRequest) {
  try {
    const { shopId, accountId } = await request.json()

    if (!shopId || !accountId) {
      return NextResponse.json(
        { error: 'Shop ID and Account ID are required' },
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

    const accountExists = accounts.some(acc => acc.id === accountId)
    if (!accountExists) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Update all accounts: set the selected one as default, others as not default
    const updatedAccounts = accounts.map(acc => ({
      ...acc,
      isDefault: acc.id === accountId,
      updatedAt: new Date(),
    }))

    await shopRef.update({
      bankAccounts: updatedAccounts,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error setting default account:', error)
    return NextResponse.json(
      { error: 'Failed to set default account' },
      { status: 500 }
    )
  }
}
