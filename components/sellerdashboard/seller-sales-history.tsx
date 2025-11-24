"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  ShoppingCart, 
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  Receipt,
  User as UserIcon,
  Mail,
  Shield,
  Search,
  Package,
  ChevronRight,
  Edit,
  AlertCircle,
  Filter
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-context"
import { Loading } from "@/components/ui/loading"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface OrderItem {
  productId: string
  productName: string
  name?: string // Added fallback
  price: number
  gameName?: string
  image?: string
}

interface Order {
  id: string
  orderId: string
  userId: string
  username?: string
  email?: string
  items: OrderItem[]
  totalAmount: number
  status: string
  paymentStatus: string
  createdAt: { seconds: number; nanoseconds: number } | string
  updatedAt?: any
  buyerConfirmed?: boolean
  gameCodeDeliveredAt?: any
  shopName?: string
  sellerAmount?: number
  paymentMethod?: string
  password?: string
  additionalInfo?: string
  sellerNotes?: string
}

export default function SellerSalesHistory() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showUpdateForm, setShowUpdateForm] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showSendConfirm, setShowSendConfirm] = useState(false)
  
  // Update form states
  const [formEmail, setFormEmail] = useState("")
  const [formUsername, setFormUsername] = useState("")
  const [formPassword, setFormPassword] = useState("")
  const [formAdditionalInfo, setFormAdditionalInfo] = useState("")
  const [formNotes, setFormNotes] = useState("")
  const [loginType, setLoginType] = useState<"email" | "username">("email")
  const [has2FADisabled, setHas2FADisabled] = useState(false)
  const [updating, setUpdating] = useState(false)
  
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      fetchOrders()
      
      // Auto-refresh every 10 seconds
      const intervalId = setInterval(() => {
        if (!document.hidden) { // Only refresh if tab is active
          fetchOrders(true) // Pass true to indicate background refresh (no loading spinner)
        }
      }, 10000)

      return () => clearInterval(intervalId)
    }
  }, [user])

  const fetchOrders = async (isBackground = false) => {
    if (!user) return
    
    try {
      if (!isBackground) setRefreshing(true)
      const response = await fetch(`/api/orders/seller?userId=${user.uid}`)
      
      if (response.ok) {
        const data = await response.json()
        // Debug log
        console.log('Fetched orders:', data.orders)
        
        // Sort by date desc
        const sortedOrders = (data.orders || []).sort((a: Order, b: Order) => {
          const dateA = new Date(typeof a.createdAt === 'string' ? a.createdAt : (a.createdAt?.seconds * 1000) || 0).getTime()
          const dateB = new Date(typeof b.createdAt === 'string' ? b.createdAt : (b.createdAt?.seconds * 1000) || 0).getTime()
          return dateB - dateA
        })
        setOrders(sortedOrders)
        // Note: filteredOrders will update via the other useEffect
      } else {
        if (!isBackground) {
          toast({
            title: "เกิดข้อผิดพลาด",
            description: "ไม่สามารถโหลดประวัติการขายได้",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
      if (!isBackground) {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถโหลดประวัติการขายได้",
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
      if (!isBackground) setRefreshing(false)
    }
  }

  useEffect(() => {
    let result = orders

    // Filter by status
    if (statusFilter !== "all") {
      result = result.filter(order => {
        if (statusFilter === "completed") return order.status === "completed"
        if (statusFilter === "cancelled") return order.status === "cancelled"
        if (statusFilter === "pending") return order.status === "pending" || order.status === "processing"
        return true
      })
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(order => 
        order.id.toLowerCase().includes(query) ||
        order.username?.toLowerCase().includes(query) ||
        order.email?.toLowerCase().includes(query) ||
        order.items.some(item => item.productName.toLowerCase().includes(query))
      )
    }

    console.log('Filter applied:', { statusFilter, ordersCount: orders.length, filteredCount: result.length })
    setFilteredOrders(result)
  }, [orders, statusFilter, searchQuery])

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "-"
    const date = new Date(typeof timestamp === 'string' ? timestamp : (timestamp.seconds * 1000))
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleOpenUpdateForm = () => {
    setFormEmail("")
    setFormUsername("")
    setFormPassword("")
    setFormAdditionalInfo("")
    setFormNotes("")
    setLoginType("email")
    setHas2FADisabled(false)
    setShowUpdateForm(true)
  }

  const handleSendCode = () => {
    // Validate required fields based on login type
    if (!formPassword.trim()) {
      toast({
        title: "กรุณากรอกข้อมูล",
        description: "กรุณากรอก Password",
        variant: "destructive",
      })
      return
    }

    if (loginType === "email" && !formEmail.trim()) {
      toast({
        title: "กรุณากรอกข้อมูล",
        description: "กรุณากรอก Email สำหรับการเข้าสู่ระบบแบบ Email",
        variant: "destructive",
      })
      return
    }

    if (loginType === "username" && !formUsername.trim()) {
      toast({
        title: "กรุณากรอกข้อมูล",
        description: "กรุณากรอก Username สำหรับการเข้าสู่ระบบแบบ Username",
        variant: "destructive",
      })
      return
    }

    // Check 2FA confirmation for email login
    if (loginType === "email" && !has2FADisabled) {
      toast({
        title: "กรุณายืนยัน",
        description: "กรุณายืนยันว่าได้ปิด 2FA แล้วก่อนส่งรหัส",
        variant: "destructive",
      })
      return
    }

    setShowSendConfirm(true)
  }

  const handleCancelOrder = () => {
    setShowCancelConfirm(true)
  }

  const handleUpdateOrder = async (newStatus?: string) => {
    if (!selectedOrder) return

    setUpdating(true)
    try {
      const hasCodes = formPassword.trim()
      const finalStatus = hasCodes ? "completed" : (newStatus || selectedOrder.status)

      const response = await fetch(`/api/orders/${selectedOrder.id}/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: finalStatus,
          email: formEmail.trim() || undefined,
          username: formUsername.trim() || undefined,
          password: formPassword.trim() || undefined,
          additionalInfo: formAdditionalInfo.trim() || undefined,
          notes: formNotes.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "อัพเดตสำเร็จ",
          description: "อัพเดตคำสั่งซื้อเรียบร้อยแล้ว",
        })

        // Refresh orders
        await fetchOrders(true)
        setShowUpdateForm(false)
        setShowSendConfirm(false)
        setShowCancelConfirm(false)
        
        // Only close details modal if status is completed or cancelled
        if (finalStatus === 'completed' || finalStatus === 'cancelled') {
          setShowDetails(false)
          setSelectedOrder(null)
        }
      } else {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: data.error || "ไม่สามารถอัพเดตคำสั่งซื้อได้",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating order:", error)
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
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">สำเร็จ</Badge>
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">ยกเลิก</Badge>
      case 'processing':
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">กำลังดำเนินการ</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading text="กำลังโหลดประวัติการขาย..." />
      </div>
    )
  }

  // Calculate stats
  const completedCount = orders.filter(o => o.status === 'completed').length
  const cancelledCount = orders.filter(o => o.status === 'cancelled').length

  return (
    <div className="space-y-6">
      {/* Header - Orange Gradient */}
      <div className="bg-gradient-to-r from-orange-500 via-[#ff9800] to-red-500 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
        <div className="relative z-10">
          <h2 className="text-4xl font-bold mb-2 drop-shadow-lg flex items-center gap-3">
            <ShoppingCart className="w-10 h-10" />
            จัดการคำสั่งซื้อ
          </h2>
          <p className="text-white/90 text-lg">
            ดูและอัพเดตสถานะคำสั่งซื้อทั้งหมดของคุณ (อัพเดตอัตโนมัติ)
          </p>
        </div>
      </div>

      {/* Stats Cards / Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card 
          className={`p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${statusFilter === 'all' ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-500 ring-offset-2' : 'bg-white border-transparent hover:border-orange-200'}`}
          onClick={() => setStatusFilter('all')}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${statusFilter === 'all' ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${statusFilter === 'all' ? 'text-orange-900' : 'text-gray-900'}`}>{orders.length}</div>
              <div className={`text-xs sm:text-sm font-medium truncate ${statusFilter === 'all' ? 'text-orange-700' : 'text-gray-500'}`}>ทั้งหมด</div>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${statusFilter === 'completed' ? 'bg-green-50 border-green-500 ring-2 ring-green-500 ring-offset-2' : 'bg-white border-transparent hover:border-green-200'}`}
          onClick={() => setStatusFilter('completed')}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${statusFilter === 'completed' ? 'bg-gradient-to-br from-green-500 to-green-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${statusFilter === 'completed' ? 'text-green-900' : 'text-gray-900'}`}>{completedCount}</div>
              <div className={`text-xs sm:text-sm font-medium truncate ${statusFilter === 'completed' ? 'text-green-700' : 'text-gray-500'}`}>สำเร็จ</div>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${statusFilter === 'pending' ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500 ring-offset-2' : 'bg-white border-transparent hover:border-blue-200'}`}
          onClick={() => setStatusFilter('pending')}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${statusFilter === 'pending' ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${statusFilter === 'pending' ? 'text-blue-900' : 'text-gray-900'}`}>
                {orders.filter(o => o.status === 'pending' || o.status === 'processing').length}
              </div>
              <div className={`text-xs sm:text-sm font-medium truncate ${statusFilter === 'pending' ? 'text-blue-700' : 'text-gray-500'}`}>รอดำเนินการ</div>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${statusFilter === 'cancelled' ? 'bg-red-50 border-red-500 ring-2 ring-red-500 ring-offset-2' : 'bg-white border-transparent hover:border-red-200'}`}
          onClick={() => setStatusFilter('cancelled')}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${statusFilter === 'cancelled' ? 'bg-gradient-to-br from-red-500 to-red-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <XCircle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${statusFilter === 'cancelled' ? 'text-red-900' : 'text-gray-900'}`}>{cancelledCount}</div>
              <div className={`text-xs sm:text-sm font-medium truncate ${statusFilter === 'cancelled' ? 'text-red-700' : 'text-gray-500'}`}>ยกเลิก</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาเลขคำสั่งซื้อ, ชื่อลูกค้า, หรือสินค้า..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {/* Mobile Filter Dropdown (Optional, but cards are better) */}
        <div className="md:hidden">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <SelectValue placeholder="สถานะ" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              <SelectItem value="completed">สำเร็จ</SelectItem>
              <SelectItem value="pending">รอดำเนินการ</SelectItem>
              <SelectItem value="cancelled">ยกเลิก</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>รายการคำสั่งซื้อ ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-muted-foreground">ไม่พบรายการคำสั่งซื้อ</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div 
                  key={order.id} 
                  className="group flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-all cursor-pointer"
                  onClick={() => {
                    setSelectedOrder(order)
                    setShowDetails(true)
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-white transition-colors">
                      <Package className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">
                          {order.items[0]?.productName || order.items[0]?.name || order.items[0]?.gameName || 'สินค้าไม่ระบุชื่อ'}
                        </span>
                        {order.items.length > 1 && (
                          <Badge variant="secondary" className="text-xs">
                            +{order.items.length - 1} รายการ
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <UserIcon className="w-3 h-3" />
                          {order.username || order.email || 'ไม่ระบุตัวตน'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(order.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 mt-4 md:mt-0 pl-14 md:pl-0">
                    <div className="text-right">
                      <div className="font-bold text-lg">฿{order.totalAmount.toLocaleString()}</div>
                      <div className="flex justify-end">
                        {getStatusBadge(order.status)}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>รายละเอียดคำสั่งซื้อ</DialogTitle>
            <DialogDescription>
              รหัสคำสั่งซื้อ: #{selectedOrder?.id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Status & Date */}
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">สถานะคำสั่งซื้อ</p>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm text-muted-foreground">วันที่สั่งซื้อ</p>
                  <p className="font-medium">{formatDate(selectedOrder.createdAt)}</p>
                </div>
              </div>

              {/* Customer Info */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <UserIcon className="w-4 h-4" /> ข้อมูลลูกค้า
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm border p-4 rounded-lg">
                  <div>
                    <p className="text-muted-foreground">ชื่อผู้ใช้</p>
                    <p className="font-medium">{selectedOrder.username || 'ลูกค้าทั่วไป'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">อีเมล</p>
                    <p className="font-medium">{selectedOrder.email || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> ข้อมูลการชำระเงิน
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm border p-4 rounded-lg">
                  <div>
                    <p className="text-muted-foreground">วิธีการชำระเงิน</p>
                    <p className="font-medium uppercase">{selectedOrder.paymentMethod || 'PromptPay'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">ยอดขายรวม</p>
                    <p className="font-medium">฿{selectedOrder.totalAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">รายรับสุทธิ (หลังหักค่าธรรมเนียม)</p>
                    <p className="font-medium text-green-600">฿{(selectedOrder.sellerAmount || selectedOrder.totalAmount).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" /> รายการสินค้า
                </h3>
                <div className="border rounded-lg divide-y">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="p-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        {item.gameName && (
                          <p className="text-xs text-muted-foreground">เกม: {item.gameName}</p>
                        )}
                      </div>
                      <p className="font-medium">฿{item.price.toLocaleString()}</p>
                    </div>
                  ))}
                  <div className="p-3 bg-gray-50 flex justify-between items-center font-bold">
                    <span>ยอดรวมทั้งสิ้น</span>
                    <span className="text-lg text-[#ff9800]">฿{selectedOrder.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDetails(false)}>
                  ปิด
                </Button>
                {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'completed' && (
                  <Button 
                    variant="default"
                    onClick={() => handleOpenUpdateForm(selectedOrder)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    อัพเดตสถานะ
                  </Button>
                )}
                <Button 
                  onClick={() => {
                    router.push(`/receipt?orderId=${selectedOrder.orderId || selectedOrder.id}&from=seller`)
                  }}
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  ดูใบเสร็จ
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Order Form Dialog */}
      <Dialog open={showUpdateForm} onOpenChange={setShowUpdateForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>อัพเดตสถานะคำสั่งซื้อ</DialogTitle>
            <DialogDescription>
              รหัสคำสั่งซื้อ: #{selectedOrder?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Current Status */}
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">สถานะปัจจุบัน</p>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">ยอดรวม</p>
                  <p className="font-bold text-lg">฿{selectedOrder.totalAmount.toLocaleString()}</p>
                  {selectedOrder.sellerAmount && (
                    <p className="text-sm text-green-600 font-semibold mt-1">
                      คุณได้รับ: ฿{selectedOrder.sellerAmount.toLocaleString()}
                    </p>
                  )}
                  <p className="text-xs text-orange-600 mt-0.5">
                    (หักค่าธรรมเนียม 10%)
                  </p>
                </div>
              </div>

              {/* Account Information Form */}
              <div className="space-y-4 border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold">ข้อมูลบัญชีเกม</h3>
                  <Badge variant="outline" className="text-xs">Password บังคับกรอก</Badge>
                </div>

                {/* Login Type Selection */}
                <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <Label className="text-sm font-semibold">ประเภทการเข้าสู่ระบบ</Label>
                  <RadioGroup value={loginType} onValueChange={(value: "email" | "username") => setLoginType(value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="email" id="login-email" />
                      <Label htmlFor="login-email" className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <span>ใช้ Email เข้าสู่ระบบ</span>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="username" id="login-username" />
                      <Label htmlFor="login-username" className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4" />
                          <span>ใช้ Username เข้าสู่ระบบ</span>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Email Login Fields */}
                {loginType === "email" && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email" className="flex items-center gap-1">
                        Email <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="อีเมลบัญชีเกม"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                      />
                    </div>

                    {/* 2FA Warning for Email */}
                    <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-2">
                        <p className="text-sm font-semibold text-orange-900">⚠️ สำคัญมาก: ปิด 2FA ก่อนส่งรหัส</p>
                        <p className="text-xs text-orange-800">
                          กรุณาปิด Two-Factor Authentication (2FA) ในบัญชีเกมก่อนส่งข้อมูลให้ลูกค้า
                          เพราะลูกค้าจะไม่สามารถเข้าสู่ระบบได้หากยังเปิด 2FA อยู่
                        </p>
                        <div className="flex items-start space-x-3 pt-2 p-3 bg-white border-2 border-orange-300 rounded-md">
                          <Checkbox
                            id="2fa-disabled"
                            checked={has2FADisabled}
                            onCheckedChange={(checked) => setHas2FADisabled(checked === true)}
                            className="mt-1 h-5 w-5 border-2 border-orange-500 data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600"
                          />
                          <Label
                            htmlFor="2fa-disabled"
                            className="text-sm font-semibold cursor-pointer text-orange-900 leading-relaxed"
                          >
                            ✅ ฉันได้ปิด 2FA ในบัญชีนี้แล้ว
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Username Login Fields */}
                {loginType === "username" && (
                  <div>
                    <Label htmlFor="username" className="flex items-center gap-1">
                      Username <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="username"
                      placeholder="ชื่อผู้ใช้"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="password" className="flex items-center gap-1">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="รหัสผ่านบัญชีเกม"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="additionalInfo">ข้อมูลเพิ่มเติม</Label>
                  <Textarea
                    id="additionalInfo"
                    placeholder="ข้อมูลเพิ่มเติมสำหรับลูกค้า (เช่น โค้ดเกม, ลิงก์ดาวน์โหลด)"
                    value={formAdditionalInfo}
                    onChange={(e) => setFormAdditionalInfo(e.target.value)}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">หมายเหตุภายใน</Label>
                  <Textarea
                    id="notes"
                    placeholder="หมายเหตุสำหรับผู้ขาย (ลูกค้าไม่เห็น)"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              {/* Warning */}
              {formPassword.trim() && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold">ข้อควรระวัง</p>
                    <p>เมื่อกรอก Password สถานะจะเปลี่ยนเป็น &quot;เสร็จสมบูรณ์&quot; ทันที</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between gap-2 pt-4 border-t">
                {selectedOrder.status !== 'cancelled' && (
                  <Button
                    variant="outline"
                    onClick={handleCancelOrder}
                    disabled={updating}
                    className="border-red-500 text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    ยกเลิก
                  </Button>
                )}
                <div className="flex gap-2 ml-auto">
                  {selectedOrder.status === 'pending' && (
                    <Button
                      variant="outline"
                      onClick={() => handleUpdateOrder('processing')}
                      disabled={updating}
                      className="border-blue-500 text-blue-700 hover:bg-blue-50"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      เริ่มดำเนินการ
                    </Button>
                  )}
                  <Button
                    onClick={handleSendCode}
                    disabled={updating}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    ส่งรหัสเกม
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Send Code Confirmation Dialog */}
      <Dialog open={showSendConfirm} onOpenChange={setShowSendConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการส่งรหัสเกม</DialogTitle>
            <DialogDescription>
              คุณต้องการส่งรหัสเกมให้ลูกค้าใช่หรือไม่?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>หมายเหตุ:</strong> เมื่อกดยืนยัน สถานะจะเปลี่ยนเป็น &quot;เสร็จสมบูรณ์&quot; และ<strong>ไม่สามารถยกเลิกได้</strong>
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSendConfirm(false)}>
                ยกเลิก
              </Button>
              <Button onClick={() => handleUpdateOrder()} disabled={updating}>
                {updating ? "กำลังส่ง..." : "ยืนยันการส่ง"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Confirmation Dialog */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการยกเลิกคำสั่งซื้อ</DialogTitle>
            <DialogDescription>
              คุณต้องการยกเลิกคำสั่งซื้อนี้ใช่หรือไม่?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                <strong>คำเตือน:</strong> การยกเลิกคำสั่งซื้อจะ<strong>ไม่สามารถกู้คืนได้</strong>
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>
                ไม่ยกเลิก
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => handleUpdateOrder('cancelled')} 
                disabled={updating}
              >
                {updating ? "กำลังยกเลิก..." : "ยืนยันการยกเลิก"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}