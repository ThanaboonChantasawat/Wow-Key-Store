"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { LoadingScreen, Loading } from "@/components/ui/loading"
import { useAuth } from "@/components/auth-context"
import { Package, Clock, CheckCircle, XCircle, AlertCircle, Store } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Helper function to ensure minimum loading time for better UX
const withMinimumLoadingTime = async <T,>(
  promiseOrFunction: Promise<T> | (() => Promise<T>),
  minimumMs: number = 500
): Promise<T> => {
  const start = Date.now()
  const promise = typeof promiseOrFunction === 'function' ? promiseOrFunction() : promiseOrFunction
  const result = await promise
  const elapsed = Date.now() - start
  const remaining = minimumMs - elapsed
  
  if (remaining > 0) {
    await new Promise(resolve => setTimeout(resolve, remaining))
  }
  
  return result
}

interface OrderItem {
  productId: string
  name: string
  price: number
  quantity: number
}

interface Order {
  id: string
  userId: string
  shopId: string
  shopName: string
  items: OrderItem[]
  totalAmount: number
  platformFee: number
  sellerAmount: number
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
  paymentStatus: string
  paymentIntentId: string
  transferId?: string
  email?: string
  username?: string
  password?: string
  additionalInfo?: string
  sellerNotes?: string
  createdAt: string
  updatedAt: string
  gameCodeDeliveredAt?: string
}

export function SellerUpdateOrders() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [orders, setOrders] = useState<Order[]>([])
  const [loadingShop, setLoadingShop] = useState(true)
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  // Form states for game account info
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [additionalInfo, setAdditionalInfo] = useState("")
  const [notes, setNotes] = useState("")
  
  const [updating, setUpdating] = useState(false)
  const itemsPerPage = 10

  // Fetch seller's shop ID first
  const [shopId, setShopId] = useState<string | null>(null)

  useEffect(() => {
    const fetchShopId = async () => {
      if (!user?.uid) {
        setLoadingShop(false)
        return
      }

      try {
        console.log('Fetching shop for user:', user.uid)
        await withMinimumLoadingTime(async () => {
          const response = await fetch(`/api/shops/user?userId=${user.uid}`)
          const data = await response.json()

          console.log('Shop data response:', data)

          if (data.success && data.shop) {
            setShopId(data.shop.id)
            console.log('Shop ID set:', data.shop.id)
          } else {
            console.log('No shop found for user')
          }
        })
      } catch (error) {
        console.error('Error fetching shop:', error)
      } finally {
        setLoadingShop(false)
      }
    }

    fetchShopId()
  }, [user])

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      if (!shopId) {
        setLoadingOrders(false)
        return
      }

      setLoadingOrders(true)
      try {
        await withMinimumLoadingTime(async () => {
          const statusParam = activeTab === 'all' ? 'all' : activeTab
          const response = await fetch(`/api/orders/seller?shopId=${shopId}&status=${statusParam}`)
          const data = await response.json()

          if (data.success) {
            setOrders(data.orders)
          } else {
            toast({
              title: "เกิดข้อผิดพลาด",
              description: "ไม่สามารถโหลดคำสั่งซื้อได้",
              variant: "destructive",
            })
          }
        })
      } catch (error) {
        console.error('Error fetching orders:', error)
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
          variant: "destructive",
        })
      } finally {
        setLoadingOrders(false)
      }
    }

    fetchOrders()
  }, [shopId, activeTab])

  const handleOpenDialog = (order: Order) => {
    setSelectedOrder(order)
    setEmail(order.email || "")
    setUsername(order.username || "")
    setPassword(order.password || "")
    setAdditionalInfo(order.additionalInfo || "")
    setNotes(order.sellerNotes || "")
    setIsDialogOpen(true)
  }

  const handleUpdateOrder = async (newStatus?: string) => {
    if (!selectedOrder) return

    setUpdating(true)
    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus || selectedOrder.status,
          email: email.trim() || undefined,
          username: username.trim() || undefined,
          password: password.trim() || undefined,
          additionalInfo: additionalInfo.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "อัพเดตสำเร็จ",
          description: "อัพเดตคำสั่งซื้อเรียบร้อยแล้ว",
        })

        // Refresh orders list
        const statusParam = activeTab === 'all' ? 'all' : activeTab
        const ordersResponse = await fetch(`/api/orders/seller?shopId=${shopId}&status=${statusParam}`)
        const ordersData = await ordersResponse.json()
        if (ordersData.success) {
          setOrders(ordersData.orders)
        }

        setIsDialogOpen(false)
        setSelectedOrder(null)
        setEmail("")
        setUsername("")
        setPassword("")
        setAdditionalInfo("")
        setNotes("")
      } else {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: data.error || "ไม่สามารถอัพเดตคำสั่งซื้อได้",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error updating order:', error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-700 bg-yellow-50">
            <AlertCircle className="w-3 h-3 mr-1" />
            รอดำเนินการ
          </Badge>
        )
      case 'processing':
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-700 bg-blue-50">
            <Clock className="w-3 h-3 mr-1" />
            กำลังดำเนินการ
          </Badge>
        )
      case 'completed':
        return (
          <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">
            <CheckCircle className="w-3 h-3 mr-1" />
            เสร็จสมบูรณ์
          </Badge>
        )
      case 'cancelled':
        return (
          <Badge variant="outline" className="border-red-500 text-red-700 bg-red-50">
            <XCircle className="w-3 h-3 mr-1" />
            ยกเลิก
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Pagination
  const totalPages = Math.ceil(orders.length / itemsPerPage)
  const paginatedOrders = orders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-center text-gray-500">กรุณาเข้าสู่ระบบ</p>
      </div>
    )
  }

  // Show loading while checking for shop
  if (loadingShop) {
    return <LoadingScreen text="กำลังโหลดข้อมูลร้านค้า..." />
  }

  // Show "no shop" message only after loading is complete
  if (!shopId) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center py-12">
          <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">ยังไม่มีร้านค้า</h3>
          <p className="text-gray-600 mb-6">คุณต้องสร้างร้านค้าก่อนจึงจะสามารถจัดการคำสั่งซื้อได้</p>
          <Button
            onClick={() => window.location.href = '/seller'}
            className="bg-[#ff9800] hover:bg-[#ff9800]/90"
          >
            สร้างร้านค้า
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-4 md:p-6 border-b border-[#d9d9d9]">
          <h2 className="text-xl md:text-2xl font-bold text-[#292d32] mb-4 md:mb-6">อัพเดทสถานะสินค้า</h2>
          <div className="grid grid-cols-2 md:flex gap-2 md:gap-3">
            <Button
              onClick={() => {
                setActiveTab("all")
                setCurrentPage(1)
              }}
              className={`text-sm md:text-base ${
                activeTab === "all"
                  ? "bg-[#ff9800] hover:bg-[#ff9800]/90 text-white"
                  : "bg-white border-2 border-[#ff9800] text-[#ff9800] hover:bg-[#fff3e0]"
              }`}
            >
              ทั้งหมด
            </Button>
            <Button
              onClick={() => {
                setActiveTab("pending")
                setCurrentPage(1)
              }}
              className={`text-sm md:text-base ${
                activeTab === "pending"
                  ? "bg-[#ff9800] hover:bg-[#ff9800]/90 text-white"
                  : "bg-white border-2 border-[#ff9800] text-[#ff9800] hover:bg-[#fff3e0]"
              }`}
            >
              รอดำเนินการ
            </Button>
            <Button
              onClick={() => {
                setActiveTab("processing")
                setCurrentPage(1)
              }}
              className={`text-sm md:text-base ${
                activeTab === "processing"
                  ? "bg-[#ff9800] hover:bg-[#ff9800]/90 text-white"
                  : "bg-white border-2 border-[#ff9800] text-[#ff9800] hover:bg-[#fff3e0]"
              }`}
            >
              กำลังดำเนินการ
            </Button>
            <Button
              onClick={() => {
                setActiveTab("completed")
                setCurrentPage(1)
              }}
              className={`text-sm md:text-base ${
                activeTab === "completed"
                  ? "bg-[#ff9800] hover:bg-[#ff9800]/90 text-white"
                  : "bg-white border-2 border-[#ff9800] text-[#ff9800] hover:bg-[#fff3e0]"
              }`}
            >
              เสร็จสมบูรณ์
            </Button>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-4">
          {loadingOrders ? (
            <div className="py-12">
              <Loading text="กำลังโหลดคำสั่งซื้อ..." />
            </div>
          ) : paginatedOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-sm md:text-base text-gray-500">ไม่มีคำสั่งซื้อ</p>
            </div>
          ) : (
            paginatedOrders.map((order) => (
              <div key={order.id} className="border border-[#d9d9d9] rounded-lg p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 md:gap-3 mb-2">
                      <h3 className="font-bold text-[#292d32] text-lg">
                        คำสั่งซื้อ #{order.id.slice(-8).toUpperCase()}
                      </h3>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="space-y-1 text-sm text-[#292d32]">
                      <p>วันที่สั่งซื้อ: {formatDate(order.createdAt)}</p>
                      <p>ยอดรวม: ฿{(Number(order.totalAmount) || 0).toLocaleString()}</p>
                      <p>ยอดที่ได้รับ: ฿{(Number(order.sellerAmount) || 0).toLocaleString()}</p>
                      {(order.email || order.password) && (
                        <p className="text-green-600 font-medium">
                          ✓ ส่งข้อมูลบัญชีแล้ว
                        </p>
                      )}
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleOpenDialog(order)}
                    className="bg-[#ff9800] hover:bg-[#ff9800]/90 text-white"
                  >
                    จัดการ
                  </Button>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">รายการสินค้า:</p>
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm text-gray-600 py-1">
                      <span>{item.name} x{item.quantity || 1}</span>
                      <span>฿{((Number(item.price) || 0) * (Number(item.quantity) || 1)).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {!loadingOrders && orders.length > 0 && (
          <div className="p-6 flex items-center justify-between border-t border-[#d9d9d9]">
            <div className="text-sm text-[#292d32]">
              หน้า {currentPage} จาก {totalPages} (ทั้งหมด {orders.length} รายการ)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                ←
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="icon"
                    onClick={() => setCurrentPage(pageNum)}
                    className={currentPage === pageNum ? "bg-[#ff9800] hover:bg-[#ff9800]/90" : ""}
                  >
                    {pageNum}
                  </Button>
                )
              })}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                →
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Update Order Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>จัดการคำสั่งซื้อ #{selectedOrder?.id.slice(-8).toUpperCase()}</DialogTitle>
            <DialogDescription>
              กรอกข้อมูลบัญชีเกมเพื่อส่งให้ลูกค้า
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6 py-4">
              {/* Order Info */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">วันที่สั่งซื้อ:</span>
                  <span className="font-medium">{formatDate(selectedOrder.createdAt)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">ยอดรวม:</span>
                  <span className="font-medium">฿{(Number(selectedOrder.totalAmount) || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">ยอดที่ได้รับ:</span>
                  <span className="font-medium text-green-600">฿{(Number(selectedOrder.sellerAmount) || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">สถานะปัจจุบัน:</span>
                  <span>{getStatusBadge(selectedOrder.status)}</span>
                </div>
              </div>

              {/* Items List */}
              <div>
                <Label className="text-base font-semibold mb-2 block">รายการสินค้า</Label>
                <div className="border rounded-lg divide-y">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="p-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-500">จำนวน: {item.quantity || 1}</p>
                      </div>
                      <p className="font-semibold">฿{((Number(item.price) || 0) * (Number(item.quantity) || 1)).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Email Input - Primary for mobile games */}
              <div>
                <Label htmlFor="email" className="text-base font-semibold mb-2 flex items-center gap-2">
                  Email ที่ใช้เข้าเกม
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  className="font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">
                  📧 Email หรือ Username ที่ใช้ Login เข้าเกม
                </p>
              </div>

              {/* Username Input */}
              <div>
                <Label htmlFor="username" className="text-base font-semibold mb-2 block">
                  Username / ID เกม <span className="text-gray-400 font-normal">(ถ้ามี)</span>
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="เช่น Player ID, Garena ID, หรือชื่อในเกม"
                />
                <p className="text-xs text-gray-500 mt-1">
                  🎮 ID หรือชื่อที่แสดงในเกม (ถ้ามีแยกจาก Email)
                </p>
              </div>

              {/* Password Input */}              {/* Password Input */}
              <div>
                <Label htmlFor="password" className="text-base font-semibold mb-2 flex items-center gap-2">
                  Password
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="password"
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="รหัสผ่านสำหรับเข้าเกม"
                  className="font-mono"
                />
                <p className="text-xs text-orange-600 mt-1">
                  ⚠️ สำคัญ! แนะนำให้ลูกค้าเปลี่ยนรหัสผ่านทันทีหลังได้รับบัญชี
                </p>
              </div>

              {/* Additional Info Input */}
              {selectedOrder.gameCodeDeliveredAt && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-700">
                    ✓ ส่งข้อมูลบัญชีเมื่อ: {formatDate(selectedOrder.gameCodeDeliveredAt)}
                  </p>
                </div>
              )}

              {/* Notes */}
              <div>
                <Label htmlFor="notes" className="text-base font-semibold mb-2 block">
                  หมายเหตุสำหรับลูกค้า
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ข้อความเพิ่มเติมหรือคำแนะนำพิเศษ"
                  rows={3}
                />
              </div>

              {/* Status Actions */}
              <div>
                <Label className="text-base font-semibold mb-2 block">อัพเดตสถานะ</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateOrder('processing')}
                    disabled={updating || selectedOrder.status === 'processing'}
                    className="border-blue-500 text-blue-700 hover:bg-blue-50"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    กำลังดำเนินการ
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateOrder('completed')}
                    disabled={updating || selectedOrder?.status === 'completed' || (!email.trim() && !password.trim())}
                    className="border-green-500 text-green-700 hover:bg-green-50"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    เสร็จสมบูรณ์
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  * กรุณากรอก Email และ Password ก่อนเปลี่ยนสถานะเป็น "เสร็จสมบูรณ์"
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={updating}
            >
              ยกเลิก
            </Button>
            <Button type="submit" onClick={() => handleUpdateOrder(selectedOrder?.status || 'pending')} disabled={updating}>
              {updating ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
