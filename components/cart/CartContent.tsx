"use client"

import { useState, useEffect } from "react"
import { Trash2, Store, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import Image from "next/image"
import { useAuth } from "@/components/auth-context"
import { getUserCartWithDetails, removeFromCart } from "@/lib/cart-service"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/components/firebase-config"

interface CartItem {
  id: string
  gameId: string
  name: string
  category: string
  price: number
  image: string
  seller?: string
}

export function CartContent() {
  const { user } = useAuth()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)

  // Load cart items from Firestore
  useEffect(() => {
    const loadCart = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const cartDocs = await getUserCartWithDetails(user.uid)
        
        // Get game details for each cart item
        const items: CartItem[] = []
        for (const cartDoc of cartDocs) {
          const gameId = cartDoc.gameId
          
          // Query games collection to get game details
          const gamesRef = collection(db, "games")
          const gameQuery = query(gamesRef, where("__name__", "==", gameId))
          const gameSnapshot = await getDocs(gameQuery)
          
          if (!gameSnapshot.empty) {
            const gameData = gameSnapshot.docs[0].data()
            items.push({
              id: cartDoc.id,
              gameId: gameId,
              name: gameData.name || "ไม่มีชื่อ",
              category: gameData.categories?.[0] || "ไม่มีหมวดหมู่",
              price: gameData.price || 0,
              image: gameData.imageUrl || "/placeholder.svg",
              seller: gameData.seller || "ไม่ระบุผู้ขาย"
            })
          }
        }
        
        setCartItems(items)
      } catch (error) {
        console.error("Error loading cart:", error)
      } finally {
        setLoading(false)
      }
    }

    loadCart()
  }, [user])

  const handleRemoveItem = async (cartItemId: string) => {
    if (!user) return

    try {
      await removeFromCart(user.uid, cartItemId.split('_')[1]) // Extract gameId from cart item id
      setCartItems((items) => items.filter((item) => item.id !== cartItemId))
      setSelectedItems((selected) => selected.filter((itemId) => itemId !== cartItemId))
    } catch (error) {
      console.error("Error removing item:", error)
    }
  }

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedItems([])
    } else {
      setSelectedItems(cartItems.map((item) => item.id))
    }
    setSelectAll(!selectAll)
  }

  const toggleSelectItem = (id: string) => {
    setSelectedItems((selected) =>
      selected.includes(id) ? selected.filter((itemId) => itemId !== id) : [...selected, id],
    )
  }

  const calculateTotal = () => {
    return cartItems
      .filter((item) => selectedItems.includes(item.id))
      .reduce((sum, item) => sum + item.price, 0)
  }

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      alert("กรุณาเลือกสินค้าที่ต้องการซื้อ")
      return
    }
    
    if (selectedItems.length > 1) {
      alert("สามารถซื้อได้ครั้งละ 1 ไอดีเท่านั้น กรุณาเลือกเพียง 1 รายการ")
      return
    }
    
    // TODO: Navigate to checkout page
    console.log("Checkout items:", selectedItems)
    alert("ระบบชำระเงินกำลังพัฒนา")
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

  if (cartItems.length === 0) {
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-[#ff9800] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={toggleSelectAll}
                  className="border-white data-[state=checked]:bg-white data-[state=checked]:text-[#ff9800]"
                />
                <span className="font-medium">สินค้า (1 ไอดีต่อการสั่งซื้อ)</span>
              </div>
              <span className="font-medium">ราคา</span>
            </div>

            {/* Shop Section */}
            <div className="border-b border-[#d9d9d9]">
              <div className="px-6 py-4 flex items-center gap-3">
                <Checkbox checked={selectAll} onCheckedChange={toggleSelectAll} className="border-[#999999]" />
                <Store className="h-5 w-5 text-[#ff9800]" />
                <span className="font-medium text-[#1e1e1e]">ID Hunter Shop</span>
              </div>

              {/* Cart Items */}
              {cartItems.map((item) => (
                <div key={item.id} className="px-6 py-4 flex items-center gap-4 border-t border-[#d9d9d9]">
                  <Checkbox
                    checked={selectedItems.includes(item.id)}
                    onCheckedChange={() => toggleSelectItem(item.id)}
                    className="border-[#999999]"
                  />

                  <div className="flex items-center gap-4 flex-1">
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                      <Image src={item.image || "/placeholder.svg"} alt={item.name} fill className="object-cover" />
                    </div>

                    <div className="flex-1">
                      <h3 className="font-semibold text-[#1e1e1e] mb-1">{item.name}</h3>
                      <p className="text-sm text-[#999999] mb-2">{item.category}</p>
                      <p className="text-xs text-[#666666]">ผู้ขาย: {item.seller}</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <p className="text-lg font-bold text-[#ff9800]">฿ {item.price.toLocaleString()}</p>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-[#999999] hover:text-[#cf142b] hover:bg-transparent"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
            <h2 className="text-xl font-bold text-[#1e1e1e] mb-6">รายสินค้ารวม</h2>

            <div className="space-y-4 mb-6">
              <p className="text-sm font-medium text-[#999999] mb-3">สรุปรายการสินค้า</p>

              {cartItems
                .filter((item) => selectedItems.includes(item.id))
                .map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-[#1e1e1e]">
                    <span className="text-sm">{item.name}</span>
                    <span className="font-medium">฿ {item.price.toLocaleString()}</span>
                  </div>
                ))}
              
              {selectedItems.length > 1 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                  <p className="text-xs text-yellow-800">
                    ⚠️ สามารถซื้อได้ครั้งละ 1 ไอดีเท่านั้น
                  </p>
                </div>
              )}
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
              className="w-full bg-[#ff9800] hover:bg-[#ff9800]/90 text-white font-medium py-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleCheckout}
              disabled={selectedItems.length === 0 || selectedItems.length > 1}
            >
              {selectedItems.length === 0
                ? "กรุณาเลือกสินค้า"
                : selectedItems.length > 1
                ? "เลือกได้เพียง 1 รายการ"
                : "ยืนยันรายการสั่งซื้อ"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
