import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

export async function POST(request: NextRequest) {
  try {
    const { userId, itemIds } = await request.json()
    
    console.log('🗑️ Cart clear request:', { userId, itemIds })

    if (!userId) {
      console.error('❌ Missing userId')
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    if (!itemIds || !Array.isArray(itemIds)) {
      console.error('❌ Missing or invalid itemIds:', itemIds)
      return NextResponse.json(
        { error: 'Item IDs array is required' },
        { status: 400 }
      )
    }

    console.log(`📦 Attempting to delete ${itemIds.length} items`)
    
    // Method 1: Remove individual cart items (old structure)
    let successCount = 0
    let errorCount = 0
    
    for (const itemId of itemIds) {
      const cartItemId = `${userId}_${itemId}`
      console.log(`🔍 Deleting cart item: ${cartItemId}`)
      
      try {
        await adminDb.collection('cart').doc(cartItemId).delete()
        successCount++
        console.log(`✅ Deleted: ${cartItemId}`)
      } catch (error) {
        errorCount++
        console.error(`❌ Failed to delete ${cartItemId}:`, error)
      }
    }

    // Method 2: Also update carts collection (new structure)
    try {
      const cartRef = adminDb.collection('carts').doc(userId)
      const cartDoc = await cartRef.get()
      
      if (cartDoc.exists) {
        const cartData = cartDoc.data()
        const currentItems = cartData?.items || []
        
        // Filter out items that were checked out
        const remainingItems = currentItems.filter((item: any) => {
          const itemId = item.productId || item.gameId || item.id
          return !itemIds.includes(itemId)
        })
        
        await cartRef.update({
          items: remainingItems,
          updatedAt: new Date(),
        })
        
        console.log(`✅ Updated carts collection: ${currentItems.length - remainingItems.length} items removed`)
      }
    } catch (cartsError) {
      console.error('⚠️ Failed to update carts collection:', cartsError)
      // Don't fail the entire operation if this fails
    }

    console.log(`✅ Cart clear completed: ${successCount} deleted, ${errorCount} failed`)

    return NextResponse.json({
      success: true,
      message: `Removed ${successCount} items from cart`,
      removed: successCount,
      failed: errorCount,
    })
  } catch (error) {
    console.error('❌ Error clearing cart:', error)
    return NextResponse.json(
      { error: 'Failed to clear cart items' },
      { status: 500 }
    )
  }
}
