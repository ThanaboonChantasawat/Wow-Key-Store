"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useAuth } from "@/components/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loading } from "@/components/ui/loading"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { 
  Package, 
  ShoppingBag, 
  Clock, 
  CheckCircle, 
  XCircle,
  Store,
  Calendar,
  DollarSign,
  Key,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  ChevronsLeft,
  ChevronsRight,
  Star,
  MessageCircle,
  Flag
} from "lucide-react"
import { ReviewFormComponent } from "@/components/review/ReviewFormComponent"
import { getShopById } from "@/lib/shop-client"
import { ReportProblemDialog } from "@/components/order/report-problem-dialog"
import { OrderChatDialog } from "@/components/order/order-chat-dialog"

type StatusFilter = 'all' | 'processing' | 'completed' | 'cancelled'

interface OrderItem {
  productId: string
  name: string
  price: number
  gameId?: string
  gameName?: string
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
  paymentIntentId: string
  transferId?: string
  paymentStatus: 'pending' | 'completed' | 'failed'
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
  email?: string
  username?: string
  password?: string
  additionalInfo?: string
  sellerNotes?: string
  gameCodeDeliveredAt?: string
  buyerConfirmed?: boolean
  buyerConfirmedAt?: string
  createdAt: string
  updatedAt: string
}

// Simple in-memory cache for shop details
const shopCache = new Map<string, any>();

export function MyOrdersContent() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedOrderToCancel, setSelectedOrderToCancel] = useState<Order | null>(null)
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false)
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null)
  const [selectedShop, setSelectedShop] = useState<any>(null) // Add state for shop details
  const [selectedOrderReviews, setSelectedOrderReviews] = useState<{
    shopReview: { id: string; rating: number; comment: string } | null
    productReview: { id: string; rating: number; comment: string } | null
  } | null>(null)
  
  // New states for filtering & pagination
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  
  // Bulk cancel states
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set())
  const [showBulkCancelModal, setShowBulkCancelModal] = useState(false)
  const [bulkCancelling, setBulkCancelling] = useState(false)
  
  // Confirm receipt states
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [selectedOrderToConfirm, setSelectedOrderToConfirm] = useState<Order | null>(null)
  const [hasCheckedCode, setHasCheckedCode] = useState(false)
  
  // Dispute & Chat states
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [selectedOrderToReport, setSelectedOrderToReport] = useState<Order | null>(null)
  const [showChatDialog, setShowChatDialog] = useState(false)
  const [selectedOrderToChat, setSelectedOrderToChat] = useState<Order | null>(null)


  const fetchOrders = async (showLoading = true) => {
    if (!user) return

    try {
      if (showLoading) setLoading(true)
      console.log('Fetching orders for user:', user.uid)
      
      const response = await fetch(`/api/orders/user?userId=${user.uid}`)
      
      console.log('Orders API response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Orders API error:', errorText)
        throw new Error(`Failed to fetch orders: ${response.status}`)
      }

      const data = await response.json()
      // console.log('Orders data:', data)
      
      // Check for duplicates
      const orderIds = data.orders?.map((o: Order) => o.id) || []
      const uniqueIds = new Set(orderIds)
      if (orderIds.length !== uniqueIds.size) {
        console.warn('⚠️ Duplicate orders detected!', {
          total: orderIds.length,
          unique: uniqueIds.size,
          duplicates: orderIds.filter((id: string, index: number) => orderIds.indexOf(id) !== index)
        })
      }
      
      setOrders(data.orders || [])
      
      // Debug: Log first order details
      if (data.orders && data.orders.length > 0 && showLoading) {
        console.log('🔍 First order details:', {
          id: data.orders[0].id?.substring(0, 12),
          status: data.orders[0].status,
          paymentStatus: data.orders[0].paymentStatus,
          shopName: data.orders[0].shopName,
        })
      }
      
      // Check if there are orders waiting for confirmation (only show toast on initial load)
      if (showLoading) {
        const pendingConfirmation = (data.orders || []).filter(
          (order: Order) => order.gameCodeDeliveredAt && !order.buyerConfirmed && order.status !== 'cancelled'
        )
        
        if (pendingConfirmation.length > 0) {
          toast({
            title: "🔔 มีคำสั่งซื้อรอการยืนยัน",
            description: `คุณมี ${pendingConfirmation.length} คำสั่งซื้อที่ได้รับข้อมูลบัญชีแล้ว กรุณายืนยันรับสินค้า`,
            variant: "default",
            duration: 5000,
          })
        }
      }
    } catch (err) {
      console.error('Error fetching orders:', err)
      if (showLoading) setError('ไม่สามารถโหลดข้อมูลคำสั่งซื้อได้')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchOrders(true)

      // Auto-refresh every 10 seconds to check for status updates
      const interval = setInterval(() => {
        fetchOrders(false)
      }, 10000)

      return () => clearInterval(interval)
    }
  }, [user])

  // Cleaned orders (remove duplicates)
  const cleanedOrders = useMemo(() => {
    try {
      const successfulOrders = orders.filter((o: Order) => 
        o.status === 'processing' || o.status === 'completed'
      )

      return orders.filter((order: Order) => {
        if (order.status !== 'cancelled') return true

        // Check if this cancelled order is a duplicate of a successful one
        const isDuplicate = successfulOrders.some((successOrder: Order) => {
          // Check time difference (within 30 mins)
          const orderTime = new Date(order.createdAt).getTime()
          const successTime = new Date(successOrder.createdAt).getTime()
          const timeDiff = Math.abs(orderTime - successTime)
          const isCloseTime = timeDiff < 30 * 60 * 1000

          // Check items
          const orderItems = order.items?.map(i => i.productId).sort().join(',') || ''
          const successItems = successOrder.items?.map(i => i.productId).sort().join(',') || ''
          const isSameItems = orderItems === successItems && orderItems !== ''

          return isCloseTime && isSameItems
        })

        return !isDuplicate
      })
    } catch (filterError) {
      console.error('Error filtering duplicate orders:', filterError)
      return orders
    }
  }, [orders])

  // Filter and search logic
  const filteredOrders = useMemo(() => {
    let filtered = cleanedOrders

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter)
    }

    // Debug: Log order statuses
    console.log('📊 Orders Status Summary:', {
      total: filtered.length,
      processing: filtered.filter(o => o.status === 'processing').length,
      completed: filtered.filter(o => o.status === 'completed').length,
      cancelled: filtered.filter(o => o.status === 'cancelled').length,
      cancellable: filtered.filter(o => o.status === 'processing').length,
    })

    // Search by order ID, shop name, or product name
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(order => 
        order.id.toLowerCase().includes(query) ||
        order.shopName.toLowerCase().includes(query) ||
        order.items.some(item => item.name.toLowerCase().includes(query))
      )
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [cleanedOrders, statusFilter, searchQuery])

  // Pagination logic
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredOrders.slice(startIndex, endIndex)
  }, [filteredOrders, currentPage, itemsPerPage])

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, searchQuery, itemsPerPage])

  // Status counts for badges
  const statusCounts = useMemo(() => {
    return {
      all: cleanedOrders.length,
      processing: cleanedOrders.filter(o => o.status === 'processing').length,
      completed: cleanedOrders.filter(o => o.status === 'completed').length,
      cancelled: cleanedOrders.filter(o => o.status === 'cancelled').length,
      waitingConfirmation: cleanedOrders.filter(o => o.gameCodeDeliveredAt && !o.buyerConfirmed && o.status !== 'cancelled').length,
    }
  }, [cleanedOrders])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Clock className="w-3 h-3 mr-1" />
            กำลังจัดส่ง
          </Badge>
        )
      case 'processing':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Package className="w-3 h-3 mr-1" />
            กำลังดำเนินการ
          </Badge>
        )
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            สำเร็จ
          </Badge>
        )
      case 'cancelled':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="w-3 h-3 mr-1" />
            ยกเลิก
          </Badge>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">
            ✓ ชำระเงินแล้ว
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="outline" className="border-yellow-200 text-yellow-700 bg-yellow-50">
            ⏳ รอชำระเงิน
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50">
            ✕ ชำระเงินไม่สำเร็จ
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const copyToClipboard = async (text: string, orderId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(orderId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Bulk selection handlers
  const toggleSelectOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrderIds)
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId)
    } else {
      newSelected.add(orderId)
    }
    setSelectedOrderIds(newSelected)
  }

  const toggleSelectAll = () => {
    // Bulk cancel: Get list of orders that can be cancelled (only processing status now)
  const cancellableOrders = paginatedOrders.filter(o => o.status === 'processing')
    if (selectedOrderIds.size === cancellableOrders.length && cancellableOrders.length > 0) {
      // Unselect all
      setSelectedOrderIds(new Set())
    } else {
      // Select all cancellable orders on current page
      setSelectedOrderIds(new Set(cancellableOrders.map(o => o.id)))
    }
  }

  const openBulkCancelModal = () => {
    if (selectedOrderIds.size === 0) {
      toast({
        title: "กรุณาเลือกคำสั่งซื้อ",
        description: "กรุณาเลือกคำสั่งซื้อที่ต้องการยกเลิกอย่างน้อย 1 รายการ",
        variant: "destructive",
        duration: 3000,
      })
      return
    }
    setShowBulkCancelModal(true)
  }

  const closeBulkCancelModal = () => {
    if (bulkCancelling) return
    setShowBulkCancelModal(false)
  }

  const confirmBulkCancel = async () => {
    if (selectedOrderIds.size === 0) return

    try {
      setBulkCancelling(true)
      
      const selectedOrders = orders.filter(o => selectedOrderIds.has(o.id))
      let successCount = 0
      let failCount = 0
      const errors: string[] = []

      // Cancel each order
      for (const order of selectedOrders) {
        try {
          const response = await fetch(`/api/orders/${order.id}/cancel`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user?.uid,
              reason: 'ยกเลิกโดยลูกค้า (Bulk)'
            }),
          })

          const data = await response.json()

          if (response.ok && data.success) {
            successCount++
          } else {
            failCount++
            errors.push(`${order.id.slice(0, 8)}: ${data.error || 'Unknown error'}`)
          }
        } catch (err: any) {
          failCount++
          errors.push(`${order.id.slice(0, 8)}: ${err.message}`)
        }
      }

      // Close modal and clear selection
      setShowBulkCancelModal(false)
      setSelectedOrderIds(new Set())

      // Show result toast
      if (successCount > 0 && failCount === 0) {
        toast({
          title: `✅ ยกเลิกสำเร็จ ${successCount} รายการ`,
          description: "คำสั่งซื้อทั้งหมดถูกยกเลิกเรียบร้อยแล้ว",
          variant: "default",
          duration: 3000,
        })
      } else if (successCount > 0 && failCount > 0) {
        toast({
          title: `⚠️ ยกเลิกสำเร็จบางส่วน`,
          description: `สำเร็จ: ${successCount} รายการ, ล้มเหลว: ${failCount} รายการ`,
          variant: "default",
          duration: 4000,
        })
      } else {
        toast({
          title: "❌ ยกเลิกล้มเหลว",
          description: `ไม่สามารถยกเลิกคำสั่งซื้อได้ ${errors.length > 0 ? errors[0] : ''}`,
          variant: "destructive",
          duration: 4000,
        })
      }

      // Refresh orders
      await fetchOrders()
    } catch (err: any) {
      console.error('Error bulk cancelling orders:', err)
      toast({
        title: "❌ เกิดข้อผิดพลาด",
        description: err.message || 'ไม่สามารถยกเลิกคำสั่งซื้อได้',
        variant: "destructive",
        duration: 4000,
      })
    } finally {
      setBulkCancelling(false)
    }
  }

  const openCancelModal = (order: Order) => {
    // Allow cancelling pending and processing orders
    if (order.status !== 'pending' && order.status !== 'processing') {
      toast({
        title: "ไม่สามารถยกเลิกได้",
        description: "ไม่สามารถยกเลิกคำสั่งซื้อนี้ได้ เนื่องจากเสร็จสิ้นแล้วหรือถูกยกเลิกไปแล้ว",
        variant: "destructive",
        duration: 3000, // 3 วินาที
      })
      return
    }
    
    setSelectedOrderToCancel(order)
    setShowCancelModal(true)
  }

  const closeCancelModal = () => {
    if (cancellingOrderId) return // Prevent closing while processing
    setShowCancelModal(false)
    setSelectedOrderToCancel(null)
  }

  const confirmCancelOrder = async () => {
    if (!selectedOrderToCancel) return

    try {
      setCancellingOrderId(selectedOrderToCancel.id)

      const response = await fetch(`/api/orders/${selectedOrderToCancel.id}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.uid,
          reason: 'ยกเลิกโดยลูกค้า'
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Close modal
        setShowCancelModal(false)
        setSelectedOrderToCancel(null)
        
        // Determine toast message based on refund status
        let description = "คำสั่งซื้อของคุณถูกยกเลิกเรียบร้อยแล้ว"
        
        if (data.paymentWasCompleted && data.refund) {
          if (data.refund.error) {
            description = "คำสั่งซื้อถูกยกเลิกแล้ว แต่เกิดปัญหาในการคืนเงิน กรุณาติดต่อฝ่ายสนับสนุน"
          } else {
            description = `คำสั่งซื้อถูกยกเลิกและเงิน ฿${data.refund.amount?.toLocaleString() || '0'} จะถูกคืนภายใน 5-10 วันทำการ`
          }
        }
        
        // Show success toast
        toast({
          title: "✅ ยกเลิกคำสั่งซื้อสำเร็จ",
          description,
          variant: "default",
          duration: 3000, // 3 วินาที
        })
        
        // Refresh orders
        await fetchOrders()
      } else {
        throw new Error(data.error || 'ไม่สามารถยกเลิกคำสั่งซื้อได้')
      }
    } catch (err: any) {
      console.error('Error cancelling order:', err)
      toast({
        title: "❌ เกิดข้อผิดพลาด",
        description: err.message || 'ไม่สามารถยกเลิกคำสั่งซื้อได้ กรุณาลองใหม่อีกครั้ง',
        variant: "destructive",
        duration: 4000, // 4 วินาที (error ให้อ่านได้นานหน่อย)
      })
    } finally {
      setCancellingOrderId(null)
    }
  }

  const openOrderDetail = async (order: Order) => {
    setSelectedOrderDetail(order)
    setShowOrderDetailModal(true)

    // โหลดข้อมูลรีวิวของคำสั่งซื้อนี้สำหรับผู้ใช้ปัจจุบัน
    if (user) {
      try {
        const token = await user.getIdToken()
        const res = await fetch(`/api/reviews?orderId=${order.id}&forUser=true`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (res.ok) {
          const data = await res.json()
          setSelectedOrderReviews({
            shopReview: data.shopReview
              ? {
                  id: data.shopReview.id,
                  rating: data.shopReview.rating,
                  comment: data.shopReview.text || data.shopReview.comment || '',
                }
              : null,
            productReview: data.productReview
              ? {
                  id: data.productReview.id,
                  rating: data.productReview.rating,
                  comment: data.productReview.text || data.productReview.comment || '',
                }
              : null,
          })
        } else {
          setSelectedOrderReviews(null)
        }
      } catch {
        setSelectedOrderReviews(null)
      }
    }
  }

  const closeOrderDetail = () => {
    setShowOrderDetailModal(false)
    setSelectedOrderDetail(null)
    setSelectedOrderReviews(null)
  }

  const openConfirmDialog = (order: Order) => {
    setSelectedOrderToConfirm(order)
    setHasCheckedCode(false)
    setShowConfirmDialog(true)
  }

  const confirmReceipt = async () => {
    if (!user || !selectedOrderToConfirm) return

    try {
      setConfirmingOrderId(selectedOrderToConfirm.id)

      const response = await fetch(`/api/orders/${selectedOrderToConfirm.id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "✅ ยืนยันรับสินค้าสำเร็จ",
          description: "ขอบคุณที่ยืนยันการรับสินค้า ผู้ขายสามารถถอนเงินได้แล้ว",
          variant: "default",
          duration: 3000,
        })
        
        // Close dialog
        setShowConfirmDialog(false)
        setSelectedOrderToConfirm(null)
        setHasCheckedCode(false)
        
        // Refresh orders
        await fetchOrders()
        
        // Close modal if it's the selected order
        if (selectedOrderDetail?.id === selectedOrderToConfirm.id) {
          closeOrderDetail()
        }
      } else {
        throw new Error(data.error || 'ไม่สามารถยืนยันรับสินค้าได้')
      }
    } catch (err: any) {
      console.error('Error confirming receipt:', err)
      toast({
        title: "❌ เกิดข้อผิดพลาด",
        description: err.message || 'ไม่สามารถยืนยันรับสินค้าได้ กรุณาลองใหม่อีกครั้ง',
        variant: "destructive",
        duration: 4000,
      })
    } finally {
      setConfirmingOrderId(null)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    
    try {
      const date = new Date(dateString)
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return '-'
      }
      
      return new Intl.DateTimeFormat('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)
    } catch (error) {
      console.error('Error formatting date:', error)
      return '-'
    }
  }

  // Helper to get items from order (supports both direct and cart orders)
  const getOrderItems = (order: Order) => {
    // Direct order with items
    if (order.items && order.items.length > 0) {
      return order.items
    }
    
    // Cart order with shops array
    if ((order as any).shops && Array.isArray((order as any).shops)) {
      const allItems: OrderItem[] = []
      for (const shop of (order as any).shops) {
        if (shop.items && Array.isArray(shop.items)) {
          allItems.push(...shop.items)
        }
      }
      return allItems
    }
    
    return []
  }

  // Helper to get shop name (supports both direct and cart orders)
  const getShopName = (order: Order) => {
    // Direct order
    if (order.shopName) {
      return order.shopName
    }
    
    // Cart order with multiple shops
    if ((order as any).shops && Array.isArray((order as any).shops)) {
      const shops = (order as any).shops
      if (shops.length === 1) {
        return shops[0].shopName
      } else if (shops.length > 1) {
        return `${shops[0].shopName} +${shops.length - 1} ร้านอื่น`
      }
    }
    
    return 'ไม่ระบุร้าน'
  }

  // Prefetch shop details in background when orders are loaded
  useEffect(() => {
    const prefetchShops = async () => {
      if (orders.length === 0) return
      
      const uniqueShopIds = Array.from(new Set(orders.map(o => o.shopId).filter(Boolean)))
      
      // Filter out IDs that are already cached
      const idsToFetch = uniqueShopIds.filter(id => !shopCache.has(id))
      
      if (idsToFetch.length === 0) return
      
      console.log(`Prefetching details for ${idsToFetch.length} shops...`)
      
      // Fetch in parallel (limit concurrency if needed, but for now simple Promise.all)
      await Promise.all(idsToFetch.map(async (shopId) => {
        try {
          const shop = await getShopById(shopId)
          if (shop) {
            shopCache.set(shopId, shop)
          }
        } catch (error) {
          console.error(`Error prefetching shop ${shopId}:`, error)
        }
      }))
    }
    
    prefetchShops()
  }, [orders])

  // Fetch shop details when opening order detail modal
  useEffect(() => {
    const fetchShopDetails = async () => {
      if (selectedOrderDetail?.shopId) {
        // Check cache first
        if (shopCache.has(selectedOrderDetail.shopId)) {
          setSelectedShop(shopCache.get(selectedOrderDetail.shopId))
          return
        }

        // Reset to null while fetching (if not in cache) to avoid showing wrong data
        setSelectedShop(null)

        try {
          const shop = await getShopById(selectedOrderDetail.shopId)
          if (shop) {
            shopCache.set(selectedOrderDetail.shopId, shop)
            setSelectedShop(shop)
          }
        } catch (error) {
          console.error("Error fetching shop details:", error)
        }
      } else {
        setSelectedShop(null)
      }
    }

    if (showOrderDetailModal && selectedOrderDetail) {
      fetchShopDetails()
    }
  }, [showOrderDetailModal, selectedOrderDetail])

  if (!user) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">กรุณาเข้าสู่ระบบ</h3>
          <p className="text-gray-600">คุณต้องเข้าสู่ระบบเพื่อดูคำสั่งซื้อ</p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 md:p-12">
          <Loading text="กำลังโหลดคำสั่งซื้อ..." />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 md:p-12 text-center">
          <XCircle className="w-12 h-12 md:w-16 md:h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">เกิดข้อผิดพลาด</h3>
          <p className="text-sm md:text-base text-gray-600 mb-4">{error}</p>
          <Button onClick={() => fetchOrders()} className="bg-[#ff9800] hover:bg-[#ff9800]/90">
            ลองอีกครั้ง
          </Button>
        </CardContent>
      </Card>
    )
  }

  // if (orders.length === 0) {
  //   return (
  //     <Card>
  //       <CardContent className="p-6 md:p-12 text-center">
  //         <ShoppingBag className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
  //         <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">ยังไม่มีคำสั่งซื้อ</h3>
  //         <p className="text-sm md:text-base text-gray-600 mb-6">คุณยังไม่มีประวัติการสั่งซื้อ เริ่มช้อปปิ้งกันเลย!</p>
  //         <Button 
  //           onClick={() => window.location.href = '/products'}
  //           className="bg-[#ff9800] hover:bg-[#ff9800]/90"
  //         >
  //           เลือกซื้อสินค้า
  //         </Button>
  //       </CardContent>
  //     </Card>
  //   )
  // }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold text-blue-900">{statusCounts.all}</div>
            <div className="text-xs text-blue-700">ทั้งหมด</div>
          </CardContent>
        </Card>
        {/* Removed "รอดำเนินการ" card - orders now only show after payment is completed */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold text-purple-900">{statusCounts.processing}</div>
            <div className="text-xs text-purple-700">กำลังดำเนินการ</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold text-green-900">{statusCounts.completed}</div>
            <div className="text-xs text-green-700">สำเร็จ</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold text-red-900">{statusCounts.cancelled}</div>
            <div className="text-xs text-red-700">ยกเลิก</div>
          </CardContent>
        </Card>
        {/* New: Waiting Confirmation Count */}
        {statusCounts.waitingConfirmation > 0 && (
          <Card className="bg-gradient-to-br from-orange-50 to-amber-100 border-orange-300 ring-2 ring-orange-400 animate-pulse">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-2xl font-bold text-orange-900">{statusCounts.waitingConfirmation}</div>
              <div className="text-xs text-orange-700 font-semibold">🔔 รอยืนยัน</div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selectedOrderIds.size > 0 && (
        <Card className="border-2 border-orange-300 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-orange-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                  {selectedOrderIds.size}
                </div>
                <span className="font-semibold text-gray-900">เลือกแล้ว {selectedOrderIds.size} รายการ</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedOrderIds(new Set())}
                >
                  ยกเลิกการเลือก
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={openBulkCancelModal}
                  disabled={bulkCancelling}
                >
                  {bulkCancelling ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      กำลังยกเลิก...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      ยกเลิกทั้งหมด
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters & Search */}
      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
              className={statusFilter === 'all' ? 'bg-[#ff9800] hover:bg-[#ff9800]/90' : ''}
            >
              <Filter className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">ทั้งหมด</span>
              <span className="sm:hidden">All</span>
              <Badge className="ml-1 sm:ml-2 bg-white text-gray-900 text-xs">{statusCounts.all}</Badge>
            </Button>
            {/* Removed "รอดำเนินการ" (pending) tab - orders now only show after payment is completed */}
            <Button
              variant={statusFilter === 'processing' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('processing')}
              className={statusFilter === 'processing' ? 'bg-blue-600 hover:bg-blue-700' : ''}
            >
              <Package className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">กำลังดำเนินการ</span>
              <span className="sm:hidden">ทำ</span>
              {statusCounts.processing > 0 && (
                <Badge className="ml-1 sm:ml-2 bg-white text-gray-900 text-xs">{statusCounts.processing}</Badge>
              )}
            </Button>
            <Button
              variant={statusFilter === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('completed')}
              className={statusFilter === 'completed' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              <CheckCircle className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">สำเร็จ</span>
              <span className="sm:hidden">✓</span>
              {statusCounts.completed > 0 && (
                <Badge className="ml-1 sm:ml-2 bg-white text-gray-900 text-xs">{statusCounts.completed}</Badge>
              )}
            </Button>
            <Button
              variant={statusFilter === 'cancelled' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('cancelled')}
              className={statusFilter === 'cancelled' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              <XCircle className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">ยกเลิก</span>
              <span className="sm:hidden">✕</span>
              {statusCounts.cancelled > 0 && (
                <Badge className="ml-1 sm:ml-2 bg-white text-gray-900 text-xs">{statusCounts.cancelled}</Badge>
              )}
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="ค้นหา (รหัสคำสั่งซื้อ, ร้าน, สินค้า)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 sm:pl-10 pr-10 text-sm sm:text-base"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery || statusFilter !== 'all' ? 'ไม่พบคำสั่งซื้อ' : 'ยังไม่มีคำสั่งซื้อ'}
            </h3>
            <p className="text-gray-600">
              {searchQuery || statusFilter !== 'all' 
                ? 'ลองเปลี่ยนตัวกรองหรือคำค้นหา' 
                : 'เมื่อคุณซื้อสินค้า รายการจะแสดงที่นี่'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Select All Checkbox (for processing orders only) */}
          {paginatedOrders.some(o => o.status === 'processing') && (
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border">
              <input
                type="checkbox"
                checked={paginatedOrders.filter(o => o.status === 'processing').length > 0 && 
                         paginatedOrders.filter(o => o.status === 'processing').every(o => selectedOrderIds.has(o.id))}
                onChange={toggleSelectAll}
                className="w-5 h-5 text-[#ff9800] rounded border-gray-300 focus:ring-[#ff9800] cursor-pointer"
              />
              <span className="text-sm font-medium text-gray-700">
                เลือกทั้งหมดในหน้านี้ ({paginatedOrders.filter(o => o.status === 'processing').length} รายการที่ยกเลิกได้)
              </span>
            </div>
          )}

          <div className="space-y-4">
            {paginatedOrders.map((order) => {
              const items = getOrderItems(order)
              const shopName = getShopName(order)
              
              // Debug: Log to check items
              console.log('Order:', order.id, 'Items count:', items.length, 'Shop:', shopName)
              
              return (
        <Card 
          key={order.id} 
          className={`hover:shadow-lg transition-all duration-200 ${
            selectedOrderIds.has(order.id) ? 'ring-2 ring-orange-500 bg-orange-50/30' : ''
          }`}
        >
          <CardContent className="p-4 md:p-6">
            <div className="flex gap-3">
              {/* Checkbox - for processing orders only */}
              {order.status === 'processing' && (
                <div 
                  className="flex items-start pt-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedOrderIds.has(order.id)}
                    onChange={() => toggleSelectOrder(order.id)}
                    className="w-5 h-5 text-[#ff9800] rounded border-gray-300 focus:ring-[#ff9800] cursor-pointer mt-1"
                  />
                </div>
              )}
              
              {/* Order Content */}
              <div 
                className="flex-1 cursor-pointer"
                onClick={() => openOrderDetail(order)}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  {/* Left Section - Order Info */}
                  <div className="flex-1 space-y-3">
                {/* Shop Name */}
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span className="font-semibold text-base text-gray-900 truncate">{shopName}</span>
                </div>
                
                {/* Game Name & Items - Enhanced Display - Always show */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-2.5">
                  <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-br from-[#ff9800] to-orange-600 p-1.5 rounded-md">
                      <Package className="w-3.5 h-3.5 text-white flex-shrink-0" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {items[0]?.gameName && (
                        <p className="text-sm font-bold text-[#ff9800] truncate">
                          🎮 {items[0].gameName}
                        </p>
                      )}
                      <p className={`text-xs ${items[0]?.gameName ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                        {items[0]?.name || 'สินค้า'}
                        {items.length > 1 && (
                          <span className="ml-1 text-[#ff9800] font-medium">
                            +{items.length - 1} รายการอื่น
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Date */}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{formatDate(order.createdAt)}</span>
                </div>
                
                {/* Summary */}
                <div className="text-xs text-gray-400">
                  {items.length} รายการ • ฿{order.totalAmount.toLocaleString()}
                </div>
              </div>

              {/* Right Section - Status & Actions */}
              <div className="flex flex-row sm:flex-col items-center gap-2">
                <div className="flex flex-col gap-2">
                  {getStatusBadge(order.status)}
                  {/* Show payment status for pending orders too */}
                  {order.status !== 'cancelled' && getPaymentStatusBadge(order.paymentStatus)}
                  
                  {/* Buyer Confirmation Badge */}
                  {order.gameCodeDeliveredAt && !order.buyerConfirmed && order.status !== 'cancelled' && (
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border border-blue-300">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      รอยืนยัน
                    </Badge>
                  )}
                  {order.buyerConfirmed && (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border border-green-300">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      ยืนยันแล้ว
                    </Badge>
                  )}
                  
                  {/* Cancel Button - Show for processing orders only */}
                  {order.status === 'processing' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        openCancelModal(order)
                      }}
                      className="mt-2"
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      ยกเลิก
                    </Button>
                  )}
                </div>
              </div>
                </div>
              </div>
              
              {/* Confirm Receipt Button - Show if delivered but not confirmed */}
              {order.gameCodeDeliveredAt && !order.buyerConfirmed && order.status !== 'cancelled' && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-blue-900">
                          ผู้ขายส่งรหัสให้คุณแล้ว
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          กรุณายืนยันหลังตรวจสอบว่าได้รับรหัสแล้ว
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedOrderToChat(order)
                        setShowChatDialog(true)
                      }}
                      variant="outline"
                      className="w-full border-blue-300 hover:bg-blue-50"
                      size="sm"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      แชท
                    </Button>
                    
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedOrderToReport(order)
                        setShowReportDialog(true)
                      }}
                      variant="outline"
                      className="w-full border-red-300 hover:bg-red-50 text-red-600"
                      size="sm"
                    >
                      <Flag className="w-4 h-4 mr-2" />
                      รายงาน
                    </Button>
                  </div>
                  
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      openConfirmDialog(order)
                    }}
                    disabled={confirmingOrderId === order.id}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                    size="sm"
                  >
                    {confirmingOrderId === order.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        กำลังยืนยัน...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        ✅ ยืนยันรับสินค้าเรียบร้อย
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Items per page selector */}
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <span className="text-gray-600">แสดง</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      className="border rounded px-2 py-1 bg-white text-sm"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                    <span className="text-gray-600">รายการ</span>
                  </div>

                  {/* Page info */}
                  <div className="text-xs sm:text-sm text-gray-600">
                    หน้า {currentPage} / {totalPages} ({filteredOrders.length} รายการ)
                  </div>

                  {/* Pagination buttons */}
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    
                    {/* Page numbers (desktop only) */}
                    <div className="hidden sm:flex gap-1">
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
                            variant={currentPage === pageNum ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`h-8 w-8 p-0 ${currentPage === pageNum ? 'bg-[#ff9800] hover:bg-[#ff9800]/90' : ''}`}
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>

                    {/* Mobile: show current page number */}
                    <div className="sm:hidden">
                      <span className="text-sm font-semibold text-gray-700 px-2">{currentPage}</span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Bulk Cancel Modal */}
      {showBulkCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/60" onClick={closeBulkCancelModal}>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div 
                className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl transform transition-all"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                  <div className="flex items-center gap-3">
                    <div className="bg-red-100 p-3 rounded-full">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">
                      ยืนยันยกเลิกหลายรายการ
                    </h3>
                  </div>
                  <button
                    onClick={closeBulkCancelModal}
                    disabled={bulkCancelling}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                    type="button"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  <p className="text-gray-700">
                    คุณกำลังจะยกเลิกคำสั่งซื้อ <strong>{selectedOrderIds.size} รายการ</strong>
                  </p>

                  {/* Selected Orders List */}
                  <div className="max-h-60 overflow-y-auto bg-gray-50 rounded-lg p-4 space-y-2">
                    {orders
                      .filter(o => selectedOrderIds.has(o.id))
                      .map(order => (
                        <div key={order.id} className="flex justify-between items-center text-sm bg-white p-3 rounded border">
                          <div className="flex-1">
                            <p className="font-medium">{order.shopName}</p>
                            {order.items[0]?.gameName && (
                              <p className="text-xs text-[#ff9800] font-medium">{order.items[0].gameName}</p>
                            )}
                            <p className="text-xs text-gray-500">{order.id.slice(0, 12)}...</p>
                          </div>
                          <p className="font-bold text-[#ff9800]">฿{order.totalAmount.toLocaleString()}</p>
                        </div>
                      ))}
                  </div>

                  {/* Warning Message */}
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                    <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      คำเตือน
                    </h4>
                    <ul className="space-y-2 text-sm text-amber-800">
                      <li className="flex items-start gap-2">
                        <span className="text-amber-600 mt-0.5">•</span>
                        <span>คำสั่งซื้อทั้งหมดจะถูก<strong>ยกเลิกถาวร</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-0.5">•</span>
                        <span>เงินที่ชำระแล้วจะถูกคืนภายใน <strong>5-10 วันทำการ</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-600 mt-0.5">•</span>
                        <span>การดำเนินการนี้ไม่สามารถย้อนกลับได้</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeBulkCancelModal}
                    disabled={bulkCancelling}
                    className="flex-1"
                  >
                    ย้อนกลับ
                  </Button>
                  <Button
                    type="button"
                    onClick={confirmBulkCancel}
                    disabled={bulkCancelling}
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
                  >
                    {bulkCancelling ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        กำลังยกเลิก {selectedOrderIds.size} รายการ...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        ยืนยันยกเลิกทั้งหมด
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {showCancelModal && selectedOrderToCancel && (
        <div className="fixed inset-0 z-50 bg-black/60" onClick={closeCancelModal}>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div 
                className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl transform transition-all"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                  <div className="flex items-center gap-3">
                    <div className="bg-red-100 p-3 rounded-full">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">
                      ยืนยันการยกเลิก
                    </h3>
                  </div>
                  <button
                    onClick={closeCancelModal}
                    disabled={cancellingOrderId !== null}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                    type="button"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  {/* Order Info */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">ร้านค้า:</span>
                      <span className="font-semibold text-gray-900">{selectedOrderToCancel.shopName}</span>
                    </div>
                    {selectedOrderToCancel.items[0]?.gameName && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">เกม:</span>
                        <span className="font-medium text-[#ff9800]">🎮 {selectedOrderToCancel.items[0].gameName}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">ยอดรวม:</span>
                      <span className="font-bold text-[#ff9800]">
                        ฿{selectedOrderToCancel.totalAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">สินค้า:</span>
                      <span className="font-medium text-gray-900">
                        {selectedOrderToCancel.items.length} รายการ
                      </span>
                    </div>
                  </div>

                  {/* Warning Message */}
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                    <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      คำเตือน
                    </h4>
                    <ul className="space-y-2 text-sm text-amber-800">
                      <li className="flex items-start gap-2">
                        <span className="text-amber-600 mt-0.5">•</span>
                        <span>คำสั่งซื้อนี้จะถูก<strong>ยกเลิกถาวร</strong></span>
                      </li>
                      {selectedOrderToCancel.paymentStatus === 'completed' && (
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">•</span>
                          <span>เงินจำนวน <strong>฿{selectedOrderToCancel.totalAmount.toLocaleString()}</strong> จะถูกคืนภายใน <strong>5-10 วันทำการ</strong></span>
                        </li>
                      )}
                      <li className="flex items-start gap-2">
                        <span className="text-amber-600 mt-0.5">•</span>
                        <span>ไม่สามารถยกเลิกการยกเลิกได้</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeCancelModal}
                    disabled={cancellingOrderId !== null}
                    className="flex-1"
                  >
                    ย้อนกลับ
                  </Button>
                  <Button
                    type="button"
                    onClick={confirmCancelOrder}
                    disabled={cancellingOrderId !== null}
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
                  >
                    {cancellingOrderId === selectedOrderToCancel.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        กำลังยกเลิก...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        ยืนยันยกเลิก
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {showOrderDetailModal && selectedOrderDetail && (
        <div className="fixed inset-0 z-50 bg-black/60" onClick={closeOrderDetail}>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div 
                className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl transform transition-all max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b rounded-t-2xl">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-[#ff9800] to-orange-600 p-3 rounded-full">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">รายละเอียดคำสั่งซื้อ</h3>
                      <p className="text-sm text-gray-500">#{selectedOrderDetail.id.substring(0, 12)}...</p>
                    </div>
                  </div>
                  <button
                    onClick={closeOrderDetail}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    type="button"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Shop & Date Info */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      {selectedOrderDetail.shopId ? (
                        <Link 
                          href={`/sellerprofile/${selectedOrderDetail.shopId}`}
                          className="flex items-center gap-3 hover:bg-white p-2 -ml-2 rounded-xl transition-all group border border-transparent hover:border-gray-200 hover:shadow-sm"
                        >
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-white shadow-sm border border-gray-100 group-hover:border-[#ff9800]/30 transition-colors flex-shrink-0">
                            {selectedShop?.logoUrl ? (
                              <img 
                                src={selectedShop.logoUrl} 
                                alt={selectedShop.shopName || selectedOrderDetail.shopName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-50">
                                <Store className="w-5 h-5 text-gray-400 group-hover:text-[#ff9800] transition-colors" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500 font-medium">ร้านค้า</span>
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-gray-900 group-hover:text-[#ff9800] transition-colors">
                                {selectedShop?.shopName || selectedOrderDetail.shopName || 'ไม่ระบุชื่อร้าน'}
                              </span>
                              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#ff9800] transition-transform group-hover:translate-x-0.5" />
                            </div>
                          </div>
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 p-2 -ml-2 rounded-xl border border-transparent">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-white shadow-sm border border-gray-100 flex-shrink-0 flex items-center justify-center">
                            <Store className="w-5 h-5 text-gray-400" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500 font-medium">ร้านค้า</span>
                            <span className="font-bold text-gray-900">
                              {selectedOrderDetail.shopName || 'ไม่ระบุชื่อร้าน'}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        {getStatusBadge(selectedOrderDetail.status)}
                        {selectedOrderDetail.status !== 'pending' && selectedOrderDetail.status !== 'cancelled' && 
                          getPaymentStatusBadge(selectedOrderDetail.paymentStatus)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(selectedOrderDetail.createdAt)}</span>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5" />
                      รายการสินค้า
                    </h4>
                    <div className="space-y-2">
                      {selectedOrderDetail.items.map((item, index) => (
                        <div key={index} className="bg-white border rounded-lg p-3">
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{item.name}</p>
                              {item.gameName && (
                                <p className="text-sm text-[#ff9800] font-medium mt-1">🎮 {item.gameName}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">รหัส: {item.productId.substring(0, 12)}...</p>
                            </div>
                            <p className="font-semibold text-[#ff9800] ml-2">฿{item.price.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Game Account Info */}
                  {(selectedOrderDetail.email || selectedOrderDetail.username || selectedOrderDetail.password || selectedOrderDetail.additionalInfo) && (
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-5">
                      <div className="flex items-start gap-3">
                        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-xl shadow-md">
                          <Key className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 space-y-4">
                          <div>
                            <h4 className="text-lg font-bold text-green-900 mb-1">🎮 ข้อมูลบัญชีเกม</h4>
                            <p className="text-xs text-green-700">กรุณาเปลี่ยนรหัสผ่านทันทีหลังได้รับบัญชี</p>
                          </div>
                          
                          {selectedOrderDetail.email && (
                            <div className="bg-white border-2 border-green-200 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-bold text-green-800 bg-green-100 px-2 py-1 rounded">อีเมล</span>
                              </div>
                              <code className="text-base font-mono font-bold text-gray-900 break-all block">
                                {selectedOrderDetail.email}
                              </code>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2 w-full"
                                onClick={() => copyToClipboard(selectedOrderDetail.email!, selectedOrderDetail.id)}
                              >
                                {copiedId === selectedOrderDetail.id ? (
                                  <><Check className="w-3 h-3 mr-1" /> คัดลอกแล้ว</>
                                ) : (
                                  <><Copy className="w-3 h-3 mr-1" /> คัดลอก</>
                                )}
                              </Button>
                            </div>
                          )}

                          {selectedOrderDetail.username && (
                            <div className="bg-white border-2 border-blue-200 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-bold text-blue-800 bg-blue-100 px-2 py-1 rounded">ชื่อผู้ใช้</span>
                              </div>
                              <code className="text-base font-mono font-bold text-gray-900 break-all block">
                                {selectedOrderDetail.username}
                              </code>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2 w-full"
                                onClick={() => copyToClipboard(selectedOrderDetail.username!, selectedOrderDetail.id)}
                              >
                                {copiedId === selectedOrderDetail.id ? (
                                  <><Check className="w-3 h-3 mr-1" /> คัดลอกแล้ว</>
                                ) : (
                                  <><Copy className="w-3 h-3 mr-1" /> คัดลอก</>
                                )}
                              </Button>
                            </div>
                          )}

                          {selectedOrderDetail.password && (
                            <div className="bg-white border-2 border-orange-300 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-bold text-orange-800 bg-orange-100 px-2 py-1 rounded">รหัสผ่าน</span>
                                <span className="text-xs font-semibold text-orange-600">⚠️ เปลี่ยนทันที!</span>
                              </div>
                              <code className="text-base font-mono font-bold text-gray-900 break-all block mb-2">
                                {selectedOrderDetail.password}
                              </code>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2 w-full"
                                onClick={() => copyToClipboard(selectedOrderDetail.password!, selectedOrderDetail.id)}
                              >
                                {copiedId === selectedOrderDetail.id ? (
                                  <><Check className="w-3 h-3 mr-1" /> คัดลอกแล้ว</>
                                ) : (
                                  <><Copy className="w-3 h-3 mr-1" /> คัดลอก</>
                                )}
                              </Button>
                            </div>
                          )}

                          {selectedOrderDetail.additionalInfo && (
                            <div className="bg-white border-2 border-blue-200 rounded-lg p-4">
                              <h5 className="font-semibold text-blue-900 mb-2">ข้อมูลเพิ่มเติม</h5>
                              <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedOrderDetail.additionalInfo}</p>
                            </div>
                          )}

                          {selectedOrderDetail.sellerNotes && (
                            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                              <h5 className="font-semibold text-amber-900 mb-2">หมายเหตุจากผู้ขาย</h5>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedOrderDetail.sellerNotes}</p>
                            </div>
                          )}

                          {/* Buyer Confirmation Status & Button */}
                          {selectedOrderDetail.gameCodeDeliveredAt && (
                            <div className={`rounded-lg p-4 border-2 ${
                              selectedOrderDetail.buyerConfirmed 
                                ? 'bg-green-50 border-green-300' 
                                : 'bg-blue-50 border-blue-300'
                            }`}>
                              {selectedOrderDetail.buyerConfirmed ? (
                                <div className="flex items-center gap-3">
                                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                                  <div>
                                    <p className="font-semibold text-green-900">คุณยืนยันรับสินค้าแล้ว</p>
                                    <p className="text-xs text-green-700 mt-1">
                                      ยืนยันเมื่อ: {formatDate(selectedOrderDetail.buyerConfirmedAt!)}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <p className="font-semibold text-blue-900">กรุณายืนยันรับสินค้า</p>
                                      <p className="text-xs text-blue-700 mt-1">
                                        หากคุณได้รับข้อมูลบัญชีเรียบร้อยแล้ว กรุณากดปุ่มยืนยันด้านล่าง
                                      </p>
                                      <p className="text-xs text-blue-600 mt-1">
                                        ⚠️ ผู้ขายจะสามารถถอนเงินได้หลังจากคุณยืนยันแล้วเท่านั้น
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    onClick={() => openConfirmDialog(selectedOrderDetail)}
                                    disabled={confirmingOrderId === selectedOrderDetail.id}
                                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                                  >
                                    {confirmingOrderId === selectedOrderDetail.id ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        กำลังยืนยัน...
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        ✅ ยืนยันรับสินค้าเรียบร้อย
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Review Section in Order Detail */}
                  {selectedOrderDetail.buyerConfirmed && selectedOrderDetail.status !== 'cancelled' && (
                    <div className="bg-white rounded-xl p-4 border border-yellow-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                          <div>
                            <h4 className="font-semibold text-gray-900 text-sm sm:text-base">รีวิวคำสั่งซื้อนี้</h4>
                            <p className="text-xs text-gray-600">ให้คะแนนร้านค้าและสินค้า หลังจากได้รับสินค้าแล้ว</p>
                          </div>
                        </div>
                      </div>

                      {/* ฟอร์มรีวิวเดียว: รวมรีวิวร้านค้า และรีวิวสินค้า (ถ้ามี productId และสินค้าเดียว) */}
                      <ReviewFormComponent
                        orderId={selectedOrderDetail.id}
                        shopId={selectedOrderDetail.shopId}
                        shopName={selectedOrderDetail.shopName || getShopName(selectedOrderDetail)}
                        productId={selectedOrderDetail.items.length === 1 ? selectedOrderDetail.items[0].productId : undefined}
                        productName={selectedOrderDetail.items.length === 1 ? selectedOrderDetail.items[0].name : undefined}
                        existingShopReview={selectedOrderReviews?.shopReview || undefined}
                        existingProductReview={selectedOrderReviews?.productReview || undefined}
                        onSuccess={() => {
                          // สามารถเพิ่ม toast หรือ refresh ได้ภายหลัง
                        }}
                      />
                    </div>
                  )}

                  {/* Order Summary */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                                           <span className="text-gray-600">ยอดรวม</span>
                      <span className="font-medium">฿{selectedOrderDetail.totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
                      <span>ยอดชำระทั้งหมด</span>
                      <span className="text-[#ff9800]">฿{selectedOrderDetail.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Refund Information - Show if order is cancelled and payment was completed */}
                  {selectedOrderDetail.status === 'cancelled' && (selectedOrderDetail as any).refundStatus && (
                    <div className={`rounded-xl p-4 border-2 ${
                      (selectedOrderDetail as any).refundStatus === 'succeeded' 
                        ? 'bg-green-50 border-green-300' 
                        : (selectedOrderDetail as any).refundStatus === 'pending'
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-red-50 border-red-300'
                    }`}>
                      <h4 className={`font-semibold mb-2 flex items-center gap-2 ${
                        (selectedOrderDetail as any).refundStatus === 'succeeded' 
                          ? 'text-green-900' 
                          : (selectedOrderDetail as any).refundStatus === 'pending'
                          ? 'text-blue-900'
                          : 'text-red-900'
                      }`}>
                        <DollarSign className="w-5 h-5" />
                        ข้อมูลการคืนเงิน
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700">สถานะ:</span>
                          <Badge variant={(selectedOrderDetail as any).refundStatus === 'succeeded' ? 'default' : 'secondary'}>
                            {(selectedOrderDetail as any).refundStatus === 'succeeded' && '✅ คืนเงินสำเร็จ'}
                            {(selectedOrderDetail as any).refundStatus === 'pending' && '⏳ กำลังดำเนินการ'}
                            {(selectedOrderDetail as any).refundStatus === 'failed' && '❌ คืนเงินล้มเหลว'}
                          </Badge>
                        </div>
                        {(selectedOrderDetail as any).refundAmount && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-700">จำนวนเงินคืน:</span>
                            <span className="font-bold text-green-600">
                              ฿{(selectedOrderDetail as any).refundAmount.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {(selectedOrderDetail as any).refundId && (
                          <div className="text-xs text-gray-600 pt-2 border-t">
                            รหัสการคืนเงิน: {(selectedOrderDetail as any).refundId}
                          </div>
                        )}
                        {(selectedOrderDetail as any).refundStatus === 'pending' && (
                          <div className="bg-blue-100 rounded-lg p-3 mt-2">
                            <p className="text-xs text-blue-800">
                              💡 เงินจะถูกโอนกลับเข้าบัญชีของคุณภายใน 5-10 วันทำการ
                            </p>
                          </div>
                        )}
                        {(selectedOrderDetail as any).refundStatus === 'failed' && (
                          <div className="bg-red-100 rounded-lg p-3 mt-2">
                            <p className="text-xs text-red-800">
                              ⚠️ เกิดปัญหาในการคืนเงิน กรุณาติดต่อฝ่ายสนับสนุน
                            </p>
                            {(selectedOrderDetail as any).refundError && (
                              <p className="text-xs text-red-700 mt-1">
                                สาเหตุ: {(selectedOrderDetail as any).refundError}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col gap-3">
                    {/* Sync Payment Status - Removed (orders only show after payment completed) */}
                    
                    <div className="flex gap-3">
                      {selectedOrderDetail.paymentStatus === 'completed' && selectedOrderDetail.status !== 'processing' && selectedOrderDetail.status !== 'cancelled' && (
                        <Button
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.location.href = `/receipt?orderId=${selectedOrderDetail.id}`
                          }}
                        >
                          ดูใบเสร็จ
                        </Button>
                      )}
                      {selectedOrderDetail.status === 'processing' && (
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            closeOrderDetail()
                            openCancelModal(selectedOrderDetail)
                          }}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          ยกเลิกคำสั่งซื้อ
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Receipt Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              ยืนยันการรับสินค้า
            </DialogTitle>
            <DialogDescription>
              กรุณาตรวจสอบรหัสเกมก่อนยืนยัน
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Warning */}
            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">ข้อควรระวัง</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>ตรวจสอบว่าได้รับรหัสเกมครบถ้วนแล้ว</li>
                  <li>ทดสอบล็อกอินเข้าเกมเพื่อยืนยันว่ารหัสใช้งานได้</li>
                  <li>เมื่อยืนยันแล้ว <strong>ไม่สามารถยกเลิกได้</strong></li>
                  <li>ผู้ขายจะสามารถถอนเงินได้ทันที</li>
                </ul>
              </div>
            </div>

            {/* Checkbox */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Checkbox
                id="checked-code"
                checked={hasCheckedCode}
                onCheckedChange={(checked) => setHasCheckedCode(checked === true)}
                className="mt-1"
              />
              <div>
                <Label
                  htmlFor="checked-code"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  ✅ ฉันได้ตรวจสอบรหัสเกมเรียบร้อยแล้ว
                </Label>
                <p className="text-xs text-blue-700 mt-1">
                  กรุณาทดสอบล็อกอินเข้าเกมก่อนกดยืนยัน
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false)
                setHasCheckedCode(false)
              }}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={confirmReceipt}
              disabled={!hasCheckedCode || confirmingOrderId !== null}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {confirmingOrderId ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  กำลังยืนยัน...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  ยืนยันรับสินค้า
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Problem Dialog */}
      {showReportDialog && selectedOrderToReport && (
        <ReportProblemDialog
          orderId={selectedOrderToReport.id}
          orderNumber={`#${selectedOrderToReport.id.slice(-8).toUpperCase()}`}
          isOpen={showReportDialog}
          onClose={() => {
            setShowReportDialog(false)
            setSelectedOrderToReport(null)
          }}
          onSuccess={() => {
            fetchOrders(false) // Refresh orders
          }}
        />
      )}

      {/* Order Chat Dialog */}
      {showChatDialog && selectedOrderToChat && (
        <OrderChatDialog
          orderId={selectedOrderToChat.id}
          orderNumber={`#${selectedOrderToChat.id.slice(-8).toUpperCase()}`}
          isOpen={showChatDialog}
          onClose={() => {
            setShowChatDialog(false)
            setSelectedOrderToChat(null)
          }}
          userRole="buyer"
        />
      )}
    </div>
  )
}

