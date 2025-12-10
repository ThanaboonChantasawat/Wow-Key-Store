import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      console.error('❌ Balance API: User ID missing')
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    console.log('📊 Fetching seller balance for user:', userId)

    const shopRef = adminDb.collection('shops').doc(`shop_${userId}`)
    const shopDoc = await shopRef.get()

    if (!shopDoc.exists) {
      console.error('❌ Balance API: Shop not found for user:', userId)
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    const shopData = shopDoc.data()
    if (!shopData) {
      console.error('❌ Balance API: Shop data is invalid')
      return NextResponse.json(
        { error: 'Shop data is invalid' },
        { status: 500 }
      )
    }

    const shopId = shopDoc.id

    console.log('🏪 Shop Info:', {
      shopId,
      shopName: shopData.shopName,
      ownerId: shopData.ownerId
    })

    // Debug: Check if there are ANY orders with buyer confirmed (regardless of shopId)
    console.log('🔍 Searching for ANY confirmed orders from this user as buyer...')
    const userBuyerOrdersSnapshot = await adminDb.collection('orders')
      .where('userId', '==', userId)
      .where('buyerConfirmed', '==', true)
      .limit(3)
      .get()
    console.log(`📦 Found ${userBuyerOrdersSnapshot.size} confirmed orders where user is BUYER`)
    
    // Debug: Check orders where user might be the seller
    console.log('🔍 Searching for orders where this user might be SELLER...')
    const allOrdersWithShopSnapshot = await adminDb.collection('orders')
      .limit(10)
      .get()
    
    let ordersMatchingShop = 0
    allOrdersWithShopSnapshot.docs.forEach(doc => {
      const order = doc.data()
      if (order.shopId === shopId) {
        ordersMatchingShop++
        console.log(`  ✓ Order ${doc.id}: shopId matches`)
      }
      // Check other possible shopId formats
      if (order.shopId === userId || order.shopId === `shop_${userId}`) {
        console.log(`  📦 Order ${doc.id}:`, {
          orderId: doc.id,
          shopId: order.shopId,
          status: order.status,
          buyerConfirmed: order.buyerConfirmed,
          gameCodeDelivered: !!order.gameCodeDeliveredAt
        })
      }
    })
    console.log(`Found ${ordersMatchingShop} orders matching shopId="${shopId}"`)

    // Debug: Check all orders for this user to see what shopId they have
    console.log('🔍 Checking ALL orders to find shopId mismatch...')
    const allOrdersSnapshot = await adminDb.collection('orders')
      .where('shopId', '==', shopId)
      .limit(5)
      .get()
    console.log(`📦 Total orders with shopId="${shopId}": ${allOrdersSnapshot.size}`)
    
    if (allOrdersSnapshot.size > 0) {
      allOrdersSnapshot.docs.forEach(doc => {
        const order = doc.data()
        console.log(`  Order ${doc.id}:`, {
          status: order.status,
          buyerConfirmed: order.buyerConfirmed,
          paymentStatus: order.paymentStatus,
          gameCodeDeliveredAt: !!order.gameCodeDeliveredAt,
          sellerAmount: order.sellerAmount
        })
      })
    }

    // Calculate available balance from buyer-confirmed orders
    console.log('🔍 Querying confirmed orders for shopId:', shopId)
    const confirmedOrdersQuery = adminDb.collection('orders')
      .where('shopId', '==', shopId)
      .where('status', '==', 'completed')
      .where('buyerConfirmed', '==', true) // Must be confirmed by buyer

    const confirmedSnapshot = await confirmedOrdersQuery.get()
    console.log('✅ Confirmed orders found:', confirmedSnapshot.size)

    let totalEarnings = 0 // Total from confirmed orders
    let totalPaid = 0 // Already withdrawn
    let availableAmount = 0 // Ready to withdraw
    let todayEarnings = 0 // Today's earnings
    let weekEarnings = 0 // This week's earnings
    let monthEarnings = 0 // This month's earnings

    confirmedSnapshot.docs.forEach(doc => {
      const order = doc.data()
      console.log(`📦 Order ${doc.id}:`, {
        sellerAmount: order.sellerAmount,
        paymentStatus: order.paymentStatus,
        payoutStatus: order.payoutStatus,
        paidOutAmount: order.paidOutAmount,
        buyerConfirmed: order.buyerConfirmed,
        buyerConfirmedAt: order.buyerConfirmedAt
      })
      
      const sellerAmount = Number(order.sellerAmount) || 0
      totalEarnings += sellerAmount

      // Calculate time-based statistics
      if (order.buyerConfirmedAt) {
        const confirmedDate = order.buyerConfirmedAt.toDate ? order.buyerConfirmedAt.toDate() : new Date(order.buyerConfirmedAt)
        const now = new Date()
        
        // Today (same day)
        const isToday = confirmedDate.toDateString() === now.toDateString()
        if (isToday) {
          todayEarnings += sellerAmount
        }
        
        // This week (last 7 days)
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        if (confirmedDate >= weekAgo) {
          weekEarnings += sellerAmount
        }
        
        // This month (same month and year)
        const isThisMonth = confirmedDate.getMonth() === now.getMonth() && 
                           confirmedDate.getFullYear() === now.getFullYear()
        if (isThisMonth) {
          monthEarnings += sellerAmount
        }
      }

      // Check payment status - support partial payments
      const paidOutAmount = Number(order.paidOutAmount) || 0
      
      if (order.payoutStatus === 'paid') {
        // Fully paid out
        totalPaid += sellerAmount
        console.log(`  ✓ Fully paid: ฿${sellerAmount}`)
      } else if (order.payoutStatus === 'partial') {
        // Partially paid out
        totalPaid += paidOutAmount
        const remaining = sellerAmount - paidOutAmount
        availableAmount += remaining
        console.log(`  💰 Partial: Paid ฿${paidOutAmount}, Available ฿${remaining}`)
      } else if (order.payoutStatus === 'ready' || !order.payoutStatus) {
        // Available to withdraw (confirmed but not paid out yet)
        availableAmount += sellerAmount
        console.log(`  💰 Available: ฿${sellerAmount}`)
      }
    })

    // Calculate pending amount (waiting for buyer confirmation)
    // Note: Firestore only allows one != operator, so we filter in code
    console.log('🔍 Querying pending orders for shopId:', shopId)
    const pendingOrdersQuery = adminDb.collection('orders')
      .where('shopId', '==', shopId)
      .where('buyerConfirmed', '==', false) // Not confirmed yet
      .where('paymentStatus', '==', 'completed') // Payment completed

    const pendingSnapshot = await pendingOrdersQuery.get()
    console.log('⏳ Pending orders found:', pendingSnapshot.size)
    
    let pendingAmount = 0

    pendingSnapshot.docs.forEach(doc => {
      const order = doc.data()
      // Filter: must have delivered code and not cancelled
      if (order.gameCodeDeliveredAt && order.status !== 'cancelled') {
        const sellerAmount = Number(order.sellerAmount) || 0
        pendingAmount += sellerAmount
      }
    })

    console.log('💰 Balance calculated:', {
      availableAmount, // พร้อมถอน (ยืนยันแล้ว ยังไม่ถอน)
      pendingAmount, // รอยืนยัน (ส่งรหัสแล้ว ยังไม่ยืนยัน)
      totalEarnings, // ยอดรวมที่ยืนยันแล้ว
      totalPaid, // ถอนไปแล้ว
      confirmedOrders: confirmedSnapshot.size,
      pendingOrders: pendingSnapshot.size,
    })

    console.log('📊 BALANCE SUMMARY:')
    console.log(`  💵 Available (พร้อมถอน): ฿${availableAmount.toLocaleString()}`)
    console.log(`  ⏳ Pending (รอยืนยัน): ฿${pendingAmount.toLocaleString()}`)
    console.log(`  📈 Total Earnings: ฿${totalEarnings.toLocaleString()}`)
    console.log(`  📅 Today: ฿${todayEarnings.toLocaleString()}`)
    console.log(`  📅 This Week: ฿${weekEarnings.toLocaleString()}`)
    console.log(`  📅 This Month: ฿${monthEarnings.toLocaleString()}`)
    console.log(`  ✅ Confirmed Orders: ${confirmedSnapshot.size}`)
    console.log(`  ⏱️ Pending Orders: ${pendingSnapshot.size}`)

    return NextResponse.json({
      success: true,
      balance: {
        available: availableAmount, // เงินที่พร้อมถอนได้ (ผู้ซื้อยืนยันแล้ว)
        pending: pendingAmount, // เงินที่รอผู้ซื้อยืนยัน
        totalEarnings, // รายได้ทั้งหมดที่ได้รับการยืนยัน
        totalPaid, // เงินที่ถอนไปแล้ว
        todayEarnings, // รายได้วันนี้
        weekEarnings, // รายได้สัปดาห์นี้
        monthEarnings, // รายได้เดือนนี้
        confirmedOrdersCount: confirmedSnapshot.size,
        pendingOrdersCount: pendingSnapshot.size,
      },
      shopName: shopData.shopName,
    })
  } catch (error: any) {
    console.error('❌ Error fetching seller balance:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
    })
    return NextResponse.json(
      {
        error: 'Failed to fetch balance',
        details: error.message,
        code: error.code,
      },
      { status: 500 }
    )
  }
}
