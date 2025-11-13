// Client-side wrapper for cart operations
// Calls API routes instead of using Firebase Client SDK directly

export interface CartItem {
  userId: string;
  itemId: string;
  itemType: 'game' | 'product';
  quantity: number;
  addedAt: Date;
}

export async function addToCart(
  userId: string,
  itemId: string,
  quantity: number = 1,
  itemType: 'game' | 'product' = 'game'
): Promise<void> {
  const response = await fetch('/api/cart/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId, itemId, quantity, itemType })
  })

  if (!response.ok) {
    throw new Error('Failed to add to cart')
  }
}

export async function removeFromCart(userId: string, itemId: string): Promise<void> {
  const response = await fetch('/api/cart/remove', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId, itemId })
  })

  if (!response.ok) {
    throw new Error('Failed to remove from cart')
  }
}

export async function updateCartQuantity(
  userId: string,
  itemId: string,
  quantity: number
): Promise<void> {
  const response = await fetch('/api/cart/update-quantity', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId, itemId, quantity })
  })

  if (!response.ok) {
    throw new Error('Failed to update cart quantity')
  }
}

export async function getUserCart(userId: string): Promise<string[]> {
  try {
    const response = await fetch(`/api/cart/user?userId=${userId}`)
    if (!response.ok) throw new Error('Failed to get cart')
    const data = await response.json()
    return data.items
  } catch (error) {
    console.error('Error getting user cart:', error)
    return []
  }
}

export async function getUserCartWithDetails(
  userId: string
): Promise<Array<{ id: string; itemId: string; itemType: string; quantity: number }>> {
  try {
    // This uses the existing checkout route which has full details
    const response = await fetch('/api/cart/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId })
    })
    
    if (!response.ok) throw new Error('Failed to get cart details')
    const data = await response.json()
    
    // Map the response to match expected format
    return data.items?.map((item: any) => ({
      id: `${userId}_${item.itemId}`,
      itemId: item.itemId,
      itemType: item.itemType || 'game',
      quantity: item.quantity || 1
    })) || []
  } catch (error) {
    console.error('Error getting cart details:', error)
    return []
  }
}

export async function isInCart(userId: string, itemId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/cart/check?userId=${userId}&itemId=${itemId}`)
    if (!response.ok) return false
    const data = await response.json()
    return data.inCart
  } catch (error) {
    console.error('Error checking cart:', error)
    return false
  }
}

export async function getCartCount(userId: string): Promise<number> {
  try {
    const response = await fetch(`/api/cart/count?userId=${userId}`)
    if (!response.ok) return 0
    const data = await response.json()
    return data.count
  } catch (error) {
    console.error('Error getting cart count:', error)
    return 0
  }
}

export async function clearCart(userId: string): Promise<void> {
  const response = await fetch('/api/cart/clear', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId })
  })

  if (!response.ok) {
    throw new Error('Failed to clear cart')
  }
}
