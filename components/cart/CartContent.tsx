"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Trash2, Store, ShoppingCart, Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import Image from "next/image"
import { useAuth } from "@/components/auth-context"
import { getUserCartWithDetails, removeFromCart, updateCartQuantity } from "@/lib/cart-service"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"
import { db } from "@/components/firebase-config"
import { canProceedWithTransaction } from "@/lib/email-verification"
import { EmailVerificationWarning } from "@/components/email-verification-warning"
import { useToast } from "@/hooks/use-toast"

interface CartItem {
  id: string
  gameId: string
  name: string
  category: string
  price: number
  image: string
  shopId: string
  shopName: string
  quantity: number
  stock: number
}

interface GroupedCart {
  shopId: string
  shopName: string
  items: CartItem[]
}

export function CartContent() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [groupedCarts, setGroupedCarts] = useState<GroupedCart[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  
  const verification = canProceedWithTransaction(user);

  // Load cart items from Firestore
  // extract loadCart so other effects can call it (for refresh after checkout)
  const loadCart = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const cartDocs = await getUserCartWithDetails(user.uid)

      // Get product details for each cart item
      const items: CartItem[] = []
      const shopIds = new Set<string>()

      for (const cartDoc of cartDocs) {
        const itemId = cartDoc.itemId
        // const itemType = cartDoc.itemType || 'product'

        // Query products collection
        const productsRef = collection(db, "products")
        const itemQuery = query(productsRef, where("__name__", "==", itemId))
        const itemSnapshot = await getDocs(itemQuery)

        if (!itemSnapshot.empty) {
          const itemData = itemSnapshot.docs[0].data()
          const shopId = itemData.shopId || "unknown"
          shopIds.add(shopId)

          items.push({
            id: cartDoc.id,
            gameId: itemId,
            name: itemData.name || "ไม่มีชื่อ",
            category: itemData.gameName || "ไม่มีหมวดหมู่",
            price: itemData.price || 0,
            image: itemData.images?.[0] || "/placeholder.svg",
            shopId: shopId,
            shopName: "", // Will be filled later
            quantity: cartDoc.quantity || 1,
            stock: itemData.stock === "unlimited" ? 9999 : (itemData.stock || 0)
          })
        } else {
          // Product not found (deleted?), remove from cart automatically
          console.log(`Removing orphan cart item: ${itemId}`)
          if (user) {
            await removeFromCart(user.uid, itemId)
          }
        }
      }

      // Get shop names
      const shopNames: { [key: string]: string } = {}
      for (const shopId of shopIds) {
        if (shopId === "unknown") {
          shopNames[shopId] = "ไม่ระบุร้านค้า"
          continue
        }

        try {
          const shopDocRef = doc(db, "shops", shopId)
          const shopDoc = await getDoc(shopDocRef)
          if (shopDoc.exists()) {
            shopNames[shopId] = shopDoc.data().shopName || "ไม่ระบุชื่อร้าน"
          } else {
            shopNames[shopId] = "ไม่พบข้อมูลร้าน"
          }
        } catch (error) {
          console.error(`Error fetching shop ${shopId}:`, error)
          shopNames[shopId] = "ไม่สามารถโหลดข้อมูลร้าน"
        }
      }

      // Update items with shop names and group by shop
      const itemsWithShopNames = items.map(item => ({
        ...item,
        shopName: shopNames[item.shopId] || "ไม่ระบุร้านค้า"
      }))

      // Group items by shop
      const grouped: { [key: string]: GroupedCart } = {}
      itemsWithShopNames.forEach(item => {
        if (!grouped[item.shopId]) {
          grouped[item.shopId] = {
            shopId: item.shopId,
            shopName: item.shopName,
            items: []
          }
        }
        grouped[item.shopId].items.push(item)
      })

      setGroupedCarts(Object.values(grouped))
    } catch (error) {
      console.error("Error loading cart:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCart()
  }, [user])

  // Listen for navigation from payment success and refresh cart
  useEffect(() => {
    if (!user) return

    // Small delay to ensure component is fully mounted and URL is updated
    const checkTimer = setTimeout(() => {
      // Method 1: Check URL parameter directly from window
      const urlParams = new URLSearchParams(window.location.search)
      const fromPayment = urlParams.get('from')
      
      // Method 2: Also check useSearchParams hook
      const fromPaymentHook = searchParams.get('from')
      
      // Method 3: Check sessionStorage flag set before navigation
      let fromSessionStorage = null
      try {
        fromSessionStorage = sessionStorage.getItem('returnFromPayment')
        if (fromSessionStorage) {
          sessionStorage.removeItem('returnFromPayment')
        }
      } catch (e) {
        console.error('Error checking returnFromPayment:', e)
      }
      
      console.log('🔍 Checking URL from window:', fromPayment)
      console.log('🔍 Checking URL from hook:', fromPaymentHook)
      console.log('🔍 Checking sessionStorage returnFromPayment:', fromSessionStorage)
      
      const isFromSuccess = fromPayment === 'success' || fromPaymentHook === 'success' || fromSessionStorage === 'success'
      
      if (isFromSuccess) {
        console.log('✅ Came from payment success, refreshing cart in 1 second...')
        // Clean URL
        window.history.replaceState({}, '', '/cart')
        // Reload cart after a short delay to ensure database updates are complete
        setTimeout(() => {
          console.log('🔄 Reloading cart after purchase...')
          loadCart()
        }, 1000)
      }

      // Also check cartCleared flag as backup
      try {
        const raw = sessionStorage.getItem('cartCleared')
        if (raw) {
          console.log('✅ Detected cartCleared flag, refreshing cart')
          sessionStorage.removeItem('cartCleared')
          setTimeout(() => loadCart(), 500)
        }
      } catch (e) {
        console.error('❌ Error checking cartCleared:', e)
      }
    }, 100) // Small delay to ensure everything is ready

    return () => clearTimeout(checkTimer)
  }, [user, searchParams])

  const handleRemoveItem = async (cartItemId: string) => {
    if (!user) return

    try {
      await removeFromCart(user.uid, cartItemId.split('_')[1]) // Extract itemId from cart item id
      
      // Remove item from grouped carts
      setGroupedCarts((groups) => 
        groups.map(group => ({
          ...group,
          items: group.items.filter(item => item.id !== cartItemId)
        })).filter(group => group.items.length > 0) // Remove empty groups
      )
      
      setSelectedItems((selected) => selected.filter((itemId) => itemId !== cartItemId))
    } catch (error) {
      console.error("Error removing item:", error)
    }
  }

  const handleUpdateQuantity = async (cartItemId: string, newQuantity: number) => {
    if (!user || newQuantity < 1) return

    const itemId = cartItemId.split('_')[1]
    
    // Find item to check stock
    const allItems = getAllItems()
    const item = allItems.find(i => i.id === cartItemId)
    if (!item) return
    
    if (newQuantity > item.stock) {
      toast({
        title: "สินค้ามีจำนวนจำกัด",
        description: `มีสินค้าเหลือเพียง ${item.stock} ชิ้น`,
        variant: "destructive",
      })
      return
    }

    try {
      // Optimistic update
      setGroupedCarts(groups => 
        groups.map(group => ({
          ...group,
          items: group.items.map(i => 
            i.id === cartItemId ? { ...i, quantity: newQuantity } : i
          )
        }))
      )

      await updateCartQuantity(user.uid, itemId, newQuantity)
    } catch (error) {
      console.error("Error updating quantity:", error)
      // Revert on error (reload cart)
      loadCart()
    }
  }

  const getAllItems = () => {
    return groupedCarts.flatMap(group => group.items)
  }

  // const toggleSelectAll = () => {
  //   if (selectAll) {
  //     setSelectedItems([])
  //   } else {
  //     setSelectedItems(getAllItems().map((item) => item.id))
  //   }
  //   setSelectAll(!selectAll)
  // }

  const toggleSelectShop = (shopId: string) => {
    const shop = groupedCarts.find(g => g.shopId === shopId)
    if (!shop) return
    
    const shopItemIds = shop.items.map(item => item.id)
    const allSelected = shopItemIds.every(id => selectedItems.includes(id))
    
    if (allSelected) {
      setSelectedItems(prev => prev.filter(id => !shopItemIds.includes(id)))
    } else {
      setSelectedItems(prev => [...new Set([...prev, ...shopItemIds])])
    }
  }

  const toggleSelectItem = (id: string) => {
    setSelectedItems((selected) =>
      selected.includes(id) ? selected.filter((itemId) => itemId !== id) : [...selected, id],
    )
  }

  const calculateTotal = () => {
    const allItems = getAllItems()
    return allItems
      .filter((item) => selectedItems.includes(item.id))
      .reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }

  const handleCheckout = async () => {
    if (selectedItems.length === 0) {
      console.log('🔔 Showing toast: No items selected')
      toast({
        title: "⚠️ กรุณาเลือกสินค้า",
        description: "กรุณาเลือกสินค้าที่ต้องการซื้อ",
        variant: "destructive",
      })
      return
    }

    // Check email verification before proceeding
    const verification = canProceedWithTransaction(user)
    if (!verification.canProceed) {
      console.log('🔔 Showing toast: Email verification required')
      toast({
        title: "⚠️ ต้องยืนยันอีเมล",
        description: verification.message,
        variant: "destructive",
      })
      return
    }
    
    // Get selected items with full details
    const allItems = getAllItems()
    const selectedProducts = allItems.filter(item => selectedItems.includes(item.id))
    
    // Validate that all shops have payment setup before proceeding
    try {
      const checkoutItems = selectedProducts.map(item => ({
        productId: item.gameId,
        shopId: item.shopId,
        price: item.price,
        name: item.name,
        quantity: item.quantity,
      }))
      
      const response = await fetch('/api/cart/validate-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: checkoutItems,
          userId: user!.uid,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        const errorMsg = errorData.error || 'ไม่สามารถดำเนินการชำระเงินได้'
        
        // Extract shop name from error message if available
        const shopNameMatch = errorMsg.match(/ร้านค้า (.+) ยังไม่ได้ตั้งค่าการรับชำระเงิน/)
        const shopName = shopNameMatch ? shopNameMatch[1] : null
        
        console.log('🔔 Showing toast: Payment validation failed', { shopName, errorMsg })
        toast({
          title: "❌ ไม่สามารถชำระเงินได้",
          description: shopName 
            ? `ร้านค้า "${shopName}" ยังไม่ได้ตั้งค่าบัญชีรับเงิน กรุณาติดต่อผู้ขาย`
            : errorMsg,
          variant: "destructive",
          duration: 5000,
        })
        return
      }
    } catch (err: any) {
      console.error('Checkout validation error:', err)
      console.log('🔔 Showing toast: Checkout validation error')
      toast({
        title: "❌ เกิดข้อผิดพลาด",
        description: err.message || 'เกิดข้อผิดพลาดในการตรวจสอบรายการชำระเงิน',
        variant: "destructive",
      })
      return
    }
    
    // Store selected items in sessionStorage for checkout page
    sessionStorage.setItem('checkoutItems', JSON.stringify(selectedProducts))
    
    // Store item IDs (gameId only, not full cart document ID) for cart clearing
    const itemIdsToStore = selectedProducts.map(item => item.gameId)
    sessionStorage.setItem('cartItemIds', JSON.stringify(itemIdsToStore))
    
    console.log('📦 Storing for checkout:', {
      checkoutItems: selectedProducts.length,
      cartItemIds: itemIdsToStore,
    })
    
    // Save current profile tab before going to checkout (default to 'my-orders' for cart page)
    sessionStorage.setItem('lastProfileTab', 'my-orders')
    
    // Navigate to checkout page in-place (do not open a new tab)
    // Use Next.js router for client-side navigation
    router.push('/cart/checkout')
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <ShoppingCart className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#1e1e1e] mb-2">กรุณาเข้าสู่ระบบ</h2>
          <p className="text-gray-600">คุณต้องเข้าสู่ระบบเพื่อดูตะกร้าสินค้า</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff9800] mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดตะกร้าสินค้า...</p>
        </div>
      </div>
    )
  }

  if (groupedCarts.length === 0 && !loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <ShoppingCart className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#1e1e1e] mb-2">ตะกร้าสินค้าว่างเปล่า</h2>
          <p className="text-gray-600 mb-6">คุณยังไม่มีสินค้าในตะกร้า เริ่มช้อปปิ้งกันเลย!</p>
          <Button 
            className="bg-[#ff9800] hover:bg-[#ff9800]/90 text-white px-8 py-6 rounded-lg"
            onClick={() => window.location.href = '/products'}
          >
            เลือกซื้อสินค้า
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-[#1e1e1e] mb-8">ตะกร้าสินค้า</h1>

      {/* Email Verification Warning */}
      <EmailVerificationWarning action="buy" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {groupedCarts.map((group) => {
            const shopItemIds = group.items.map(item => item.id)
            const allShopItemsSelected = shopItemIds.every(id => selectedItems.includes(id))
            
            return (
              <div key={group.shopId} className="bg-white rounded-lg shadow-sm overflow-hidden">
                {/* Shop Header */}
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={allShopItemsSelected}
                      onCheckedChange={() => toggleSelectShop(group.shopId)}
                      className="border-white data-[state=checked]:bg-white data-[state=checked]:text-orange-600"
                    />
                    <Store className="w-5 h-5" />
                    <span className="font-semibold text-lg">{group.shopName}</span>
                  </div>
                </div>

                {/* Shop Items */}
                <div className="divide-y divide-gray-100">
                  {group.items.map((item) => (
                    <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-4">
                        {/* Checkbox */}
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={() => toggleSelectItem(item.id)}
                          className="mt-1"
                        />

                        {/* Product Image */}
                        <Link href={`/product/${item.gameId}`} className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity">
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        </Link>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <Link href={`/product/${item.gameId}`} className="hover:text-[#ff9800] transition-colors">
                            <h3 className="text-lg font-semibold text-[#1e1e1e] mb-1 truncate">
                              {item.name}
                            </h3>
                          </Link>
                          <p className="text-sm text-gray-500 mb-1">{item.category}</p>
                          {item.stock < 10 && item.stock > 0 && (
                            <p className="text-xs text-orange-600 font-medium mb-2">
                              ⚠️ เหลือเพียง {item.stock} ชิ้น
                            </p>
                          )}
                          {item.stock === 0 && (
                            <p className="text-xs text-red-600 font-bold mb-2">
                              ❌ สินค้าหมด
                            </p>
                          )}
                          
                          <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
                            <p className="text-xl font-bold text-[#ff9800]">
                              ฿{item.price.toLocaleString()}
                            </p>
                            
                            {/* Quantity Controls */}
                            <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-md hover:bg-white hover:shadow-sm"
                                onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-md hover:bg-white hover:shadow-sm"
                                onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                disabled={item.quantity >= item.stock}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Remove Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(item.id)}
                          className="flex-shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
            <h2 className="text-xl font-bold text-[#1e1e1e] mb-6">รายสินค้ารวม</h2>

            <div className="space-y-4 mb-6">
              <p className="text-sm font-medium text-[#999999] mb-3">สรุปรายการสินค้า</p>

              {getAllItems()
                .filter((item) => selectedItems.includes(item.id))
                .map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-[#1e1e1e]">
                    <span className="text-sm truncate mr-2">{item.name}</span>
                    <span className="font-medium whitespace-nowrap">฿ {item.price.toLocaleString()}</span>
                  </div>
                ))}
              

            </div>

            <div className="border-t border-[#d9d9d9] pt-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[#999999]">จำนวนที่เลือก</span>
                <span className="text-sm font-medium text-[#1e1e1e]">{selectedItems.length} รายการ</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#999999]">ยอดรวมทั้งหมด</span>
                <span className="text-xl font-bold text-[#ff9800]">฿ {calculateTotal().toLocaleString()}</span>
              </div>
            </div>

            <Button 
              className="w-full bg-[#ff9800] hover:bg-[#ff9800]/90 text-white font-medium py-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              onClick={handleCheckout}
              disabled={selectedItems.length === 0 || !verification.canProceed}
            >
              {!verification.canProceed 
                ? "กรุณายืนยันอีเมลก่อนชำระเงิน" 
                : selectedItems.length === 0
                  ? "กรุณาเลือกสินค้า"
                  : `ชำระเงิน (${selectedItems.length} รายการ)`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
