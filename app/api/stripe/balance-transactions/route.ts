import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getShopByOwnerId } from '@/lib/shop-service'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '100')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get shop
    const shop = await getShopByOwnerId(userId)
    
    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    if (!shop.stripeAccountId) {
      return NextResponse.json(
        { error: 'Stripe account not connected' },
        { status: 400 }
      )
    }

    // Get balance transactions
    const transactions = await stripe.balanceTransactions.list(
      {
        limit,
      },
      {
        stripeAccount: shop.stripeAccountId,
      }
    )

    // Calculate statistics
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisWeekStart = new Date(today)
    thisWeekStart.setDate(today.getDate() - today.getDay())
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    let todayTotal = 0
    let weekTotal = 0
    let monthTotal = 0

    transactions.data.forEach(txn => {
      const txnDate = new Date(txn.created * 1000)
      const amount = txn.net // net amount after fees
      
      if (txnDate >= today) {
        todayTotal += amount
      }
      if (txnDate >= thisWeekStart) {
        weekTotal += amount
      }
      if (txnDate >= thisMonthStart) {
        monthTotal += amount
      }
    })

    return NextResponse.json({
      transactions: transactions.data.map(txn => ({
        id: txn.id,
        amount: txn.amount,
        net: txn.net,
        fee: txn.fee,
        currency: txn.currency,
        type: txn.type,
        status: txn.status,
        created: txn.created,
        description: txn.description,
        source: txn.source,
      })),
      statistics: {
        today: todayTotal,
        week: weekTotal,
        month: monthTotal,
        currency: 'thb',
      },
      has_more: transactions.has_more,
    })
  } catch (error) {
    console.error('Error fetching balance transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch balance transactions' },
      { status: 500 }
    )
  }
}
