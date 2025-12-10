"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
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
  quantity?: number
  productImage?: string | null
}

interface DeliveredItem {
  index: number;
  itemName: string;
  email?: string;
  username?: string;
  password?: string;
  emailPassword?: string;
  additionalInfo?: string;
}

interface Order {
  id: string
  userId: string
  shopId: string
  shopName: string
  shopAvatar?: string
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
  deliveredItems?: DeliveredItem[];
  hasDispute?: boolean;
  disputeStatus?: 'pending' | 'investigating' | 'resolved' | 'rejected';
  disputeResolution?: 'refund' | 'new_code' | 'dismiss';
  disputeResolved?: boolean;
  refundStatus?: string;
}

// Simple in-memory cache for shop details
const shopCache = new Map<string, any>();

export function MyOrdersContent() {
  const { user } = useAuth()
  const { toast } = useToast()
  const searchParams = useSearchParams()
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
    productReview: { id: string; productId: string; rating: number; comment: string } | null
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
  
  // Review states
  const [selectedProductToReview, setSelectedProductToReview] = useState<{
    productId: string
    productName: string
  } | null>(null)
  
  // Store product-specific reviews
  const [productReviews, setProductReviews] = useState<Map<string, { id: string; rating: number; comment: string }>>(new Map())

  useEffect(() => {
    const chatOrderId = searchParams.get('chatOrderId')
    if (chatOrderId && orders.length > 0) {
      const order = orders.find(o => o.id === chatOrderId)
      if (order) {
        setSelectedOrderToChat(order)
        setShowChatDialog(true)
      }
    }
  }, [orders, searchParams])

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
      
      // Enrich orders with shop avatar and product images
      const enrichedOrders = await Promise.all((data.orders || []).map(async (order: Order) => {
        // Fetch shop details if shopId exists
        let shopAvatar = null
        if (order.shopId) {
          if (!shopCache.has(order.shopId)) {
            try {
              console.log('Fetching shop data for:', order.shopId)
              const shopData = await getShopById(order.shopId)
              if (shopData) {
                shopCache.set(order.shopId, shopData)
                shopAvatar = shopData.logoUrl || null
                console.log('Shop data loaded:', { shopId: order.shopId, hasAvatar: !!shopAvatar })
              } else {
                console.warn('Shop data not found for:', order.shopId)
              }
            } catch (err) {
              console.error('Failed to fetch shop:', order.shopId, err)
            }
          } else {
            const shopData = shopCache.get(order.shopId)
            shopAvatar = shopData?.logoUrl || null
          }
        }
        
        // Fetch product images for each item
        const itemsWithImages = await Promise.all((order.items || []).map(async (item) => {
          let productImage = null
          const productId = item.gameId || item.productId
          
          if (productId) {
            try {
              const productRes = await fetch(`/api/products/${productId}`)
              if (productRes.ok) {
                const productData = await productRes.json()
                productImage = productData.images?.[0] || productData.imageUrl || null
                console.log('Product image loaded:', { productId, hasImage: !!productImage })
              }
            } catch (err) {
              console.error('Failed to fetch product image:', productId, err)
            }
          }
          
          return {
            ...item,
            productImage
          }
        }))
        
        // Add shopAvatar and enriched items to order
        return {
          ...order,
          shopAvatar,
          items: itemsWithImages
        }
      }))
      
      // Check for duplicates
      const orderIds = enrichedOrders?.map((o: Order) => o.id) || []
      const uniqueIds = new Set(orderIds)
      if (orderIds.length !== uniqueIds.size) {
        console.warn('⚠️ Duplicate orders detected!', {
          total: orderIds.length,
          unique: uniqueIds.size,
          duplicates: orderIds.filter((id: string, index: number) => orderIds.indexOf(id) !== index)
        })
      }
      
      setOrders(enrichedOrders || [])
      
      // Debug: Log all orders summary
      if (enrichedOrders && enrichedOrders.length > 0 && showLoading) {
        console.log('📋 Total orders received:', enrichedOrders.length)
        console.log('📊 Orders by status:', {
          pending: enrichedOrders.filter((o: Order) => o.status === 'pending').length,
          processing: enrichedOrders.filter((o: Order) => o.status === 'processing').length,
          completed: enrichedOrders.filter((o: Order) => o.status === 'completed').length,
          cancelled: enrichedOrders.filter((o: Order) => o.status === 'cancelled').length,
        })
        
        // Log cancelled orders details
        const cancelledOrders = enrichedOrders.filter((o: Order) => o.status === 'cancelled')
        if (cancelledOrders.length > 0) {
          console.log('❌ Cancelled orders:', cancelledOrders.map((o: any) => ({
            id: o.id.substring(0, 12),
            shopName: o.shopName,
            totalAmount: o.totalAmount,
            cancelledAt: o.cancelledAt,
            cancelReason: o.cancelReason,
          })))
        }
        
        console.log('🔍 First order details:', {
          id: enrichedOrders[0].id?.substring(0, 12),
          status: enrichedOrders[0].status,
          paymentStatus: enrichedOrders[0].paymentStatus,
          shopName: enrichedOrders[0].shopName,
          shopAvatar: enrichedOrders[0].shopAvatar,
        })
      }
      
      // Check if there are orders waiting for confirmation (only show toast on initial load)
      if (showLoading) {
        const pendingConfirmation = (enrichedOrders || []).filter(
          (order: Order) => 
            order.status === 'processing' && 
            order.gameCodeDeliveredAt && 
            !order.buyerConfirmed
        )
        
        if (pendingConfirmation.length > 0) {
          toast({
            title: "🔔 มีคำสั่งซื้อรอการยืนยัน",
            description: `คุณมี ${pendingConfirmation.length} คำสั่งซื้อที่ได้รับข้อมูลบัญชีแล้ว กรุณายืนยันรับสินค้า`,
            variant: "default",
            duration: 10000,
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

  // Memoize cleaned orders to avoid recalculating on every render
  // Note: Currently unused as we decided to show all orders in 'All' tab
  // but keeping logic in case we want to implement a 'Hide Duplicates' toggle later
  const cleanedOrders = useMemo(() => {
    try {
      const successfulOrders = orders.filter((o: Order) => 
        o.status === 'processing' || o.status === 'completed'
      )
      
      const cleaned = orders.filter((order: Order) => {
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
      
      return cleaned
    } catch (filterError) {
      console.error('Error filtering duplicate orders:', filterError)
      return orders
    }
  }, [orders])

  // Filter and search logic
  const filteredOrders = useMemo(() => {
    let filtered = orders

    // Filter by status
    if (statusFilter !== 'all') {
      if (statusFilter === 'processing') {
        // Include legacy orders (without status) that have completed payment
        // Also include new orders with pending status (waiting for payment/being processed)
        filtered = filtered.filter(order => 
          order.status === 'processing' || 
          order.status === 'pending' ||
          (!order.status && order.paymentStatus === 'completed')
        )
      } else {
        filtered = filtered.filter(order => order.status === statusFilter)
      }
    }

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
      all: orders.length,
      // Include legacy orders (without status) that have completed payment as processing
      // Also include new orders with pending status (waiting for payment)
      processing: orders.filter(o => 
        o.status === 'processing' || 
        o.status === 'pending' ||
        (!o.status && o.paymentStatus === 'completed')
      ).length,
      completed: orders.filter(o => o.status === 'completed').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      waitingConfirmation: orders.filter(o => o.gameCodeDeliveredAt && !o.buyerConfirmed && o.status !== 'cancelled').length,
    }
  }, [orders])

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

  const getPaymentStatusBadge = (status: string, order?: Order) => {
    // Show refund status if order was refunded
    if (order?.disputeResolution === 'refund') {
      return (
        <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">
          ✓ คืนเงินแล้ว
        </Badge>
      )
    }
    
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
    // Bulk cancel: Get list of orders that can be cancelled (processing/pending status + legacy orders with completed payment)
    const cancellableOrders = paginatedOrders.filter(o => 
      o.status === 'processing' || 
      o.status === 'pending' ||
      (!o.status && o.paymentStatus === 'completed')
    )
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
    // Allow cancelling pending and processing orders (both new and legacy formats)
    // Legacy orders might not have status field, so check paymentStatus instead
    const isCancellable = 
      (order.status === 'pending' || order.status === 'processing' || !order.status) && 
      order.paymentStatus !== 'completed'
      
    if (!isCancellable) {
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
        throw new Error('ไม่สามารถยกเลิกคำสั่งซื้อได้')
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
    setSelectedShop(null) // Reset shop data to prevent showing old avatar

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
                  productId: data.productReview.productId,
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
    setProductReviews(new Map())
    setSelectedProductToReview(null)
  }
  
  const fetchProductReview = async (orderId: string, productId: string) => {
    if (!user) return
    
    try {
      const token = await user.getIdToken()
      const res = await fetch(`/api/reviews?orderId=${orderId}&productId=${productId}&forUser=true`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (res.ok) {
        const data = await res.json()
        if (data.productReview) {
          setProductReviews(prev => {
            const newMap = new Map(prev)
            newMap.set(productId, {
              id: data.productReview.id,
              rating: data.productReview.rating,
              comment: data.productReview.text || data.productReview.comment || '',
            })
            return newMap
          })
        }
      }
    } catch (error) {
      console.error('Error fetching product review:', error)
    }
  }
  
  const handleProductReviewSelect = async (productId: string, productName: string, orderId: string) => {
    const isCurrentlySelected = selectedProductToReview?.productId === productId
    
    if (isCurrentlySelected) {
      setSelectedProductToReview(null)
    } else {
      setSelectedProductToReview({ productId, productName })
      // Fetch review for this specific product if not already loaded
      if (!productReviews.has(productId)) {
        await fetchProductReview(orderId, productId)
      }
    }
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
        throw new Error('ไม่สามารถยืนยันรับสินค้าได้')
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        <Card 
          className={`p-2 sm:p-3 md:p-4 lg:p-5 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${statusFilter === 'all' ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-500 ring-offset-2' : 'bg-white border-transparent hover:border-orange-200'}`}
          onClick={() => setStatusFilter('all')}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-lg md:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${statusFilter === 'all' ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold ${statusFilter === 'all' ? 'text-orange-900' : 'text-gray-900'}`}>{statusCounts.all}</div>
              <div className={`text-[10px] sm:text-xs md:text-sm font-medium truncate ${statusFilter === 'all' ? 'text-orange-700' : 'text-gray-500'}`}>ทั้งหมด</div>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-2 sm:p-3 md:p-4 lg:p-5 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${statusFilter === 'processing' ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500 ring-offset-2' : 'bg-white border-transparent hover:border-blue-200'}`}
          onClick={() => setStatusFilter('processing')}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-lg md:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${statusFilter === 'processing' ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <Package className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold ${statusFilter === 'processing' ? 'text-blue-900' : 'text-gray-900'}`}>{statusCounts.processing}</div>
              <div className={`text-[10px] sm:text-xs md:text-sm font-medium truncate ${statusFilter === 'processing' ? 'text-blue-700' : 'text-gray-500'}`}>กำลังดำเนินการ</div>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-2 sm:p-3 md:p-4 lg:p-5 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${statusFilter === 'completed' ? 'bg-green-50 border-green-500 ring-2 ring-green-500 ring-offset-2' : 'bg-white border-transparent hover:border-green-200'}`}
          onClick={() => setStatusFilter('completed')}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-lg md:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${statusFilter === 'completed' ? 'bg-gradient-to-br from-green-500 to-green-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold ${statusFilter === 'completed' ? 'text-green-900' : 'text-gray-900'}`}>{statusCounts.completed}</div>
              <div className={`text-[10px] sm:text-xs md:text-sm font-medium truncate ${statusFilter === 'completed' ? 'text-green-700' : 'text-gray-500'}`}>สำเร็จ</div>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-2 sm:p-3 md:p-4 lg:p-5 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${statusFilter === 'cancelled' ? 'bg-red-50 border-red-500 ring-2 ring-red-500 ring-offset-2' : 'bg-white border-transparent hover:border-red-200'}`}
          onClick={() => setStatusFilter('cancelled')}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-lg md:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${statusFilter === 'cancelled' ? 'bg-gradient-to-br from-red-500 to-red-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold ${statusFilter === 'cancelled' ? 'text-red-900' : 'text-gray-900'}`}>{statusCounts.cancelled}</div>
              <div className={`text-[10px] sm:text-xs md:text-sm font-medium truncate ${statusFilter === 'cancelled' ? 'text-red-700' : 'text-gray-500'}`}>ยกเลิก</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Bulk Actions Bar */}
      {selectedOrderIds.size > 0 && (
        <Card className="border-2 border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Info Message */}
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-gray-700 flex-1">
                  <span className="font-semibold">วิธียกเลิกสินค้า:</span> เลือกสินค้าที่ต้องการยกเลิกโดยกดที่ช่องทำเครื่องหมาย จากนั้นกดปุ่ม "ยกเลิกคำสั่งซื้อที่เลือก"
                </p>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="bg-orange-600 text-white rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0">
                    {selectedOrderIds.size}
                  </div>
                  <span className="font-semibold text-gray-900 text-xs sm:text-sm">เลือกแล้ว {selectedOrderIds.size} รายการ</span>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedOrderIds(new Set())}
                    className="flex-1 sm:flex-none text-xs sm:text-sm h-8 sm:h-9"
                  >
                    ยกเลิกการเลือก
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={openBulkCancelModal}
                    disabled={bulkCancelling}
                    className="flex-1 sm:flex-none text-xs sm:text-sm h-8 sm:h-9"
                  >
                    {bulkCancelling ? (
                      <>
                        <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                        <span className="hidden xs:inline">กำลังยกเลิก...</span>
                        <span className="xs:hidden">กำลัง...</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                        <span className="hidden xs:inline">ยกเลิกทั้งหมด</span>
                        <span className="xs:hidden">ยกเลิก</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Bar */}
      <div className="relative mb-4 sm:mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
        <Input
          type="text"
          placeholder="ค้นหา (รหัสคำสั่งซื้อ, ร้าน, สินค้า)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 sm:pl-10 pr-9 sm:pr-10 text-sm sm:text-base h-10 sm:h-12 bg-white shadow-sm border-gray-200 focus:border-orange-500 focus:ring-orange-500 rounded-lg sm:rounded-xl"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
            onClick={() => setSearchQuery('')}
          >
            <X className="w-4 h-4 text-gray-500" />
          </Button>
        )}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="p-8 sm:p-12 text-center">
            <ShoppingBag className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
              {searchQuery || statusFilter !== 'all' ? 'ไม่พบคำสั่งซื้อ' : 'ยังไม่มีคำสั่งซื้อ'}
            </h3>
            <p className="text-sm sm:text-base text-gray-600">
              {searchQuery || statusFilter !== 'all' 
                ? 'ลองเปลี่ยนตัวกรองหรือคำค้นหา' 
                : 'เมื่อคุณซื้อสินค้า รายการจะแสดงที่นี่'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Select All Checkbox (for cancellable orders: pending and processing) */}
          {paginatedOrders.some(o => o.status === 'processing' || o.status === 'pending' || (!o.status && o.paymentStatus === 'completed')) && (
            <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg border">
              <input
                type="checkbox"
                checked={paginatedOrders.filter(o => 
                  o.status === 'processing' || 
                  o.status === 'pending' || 
                  (!o.status && o.paymentStatus === 'completed')
                ).length > 0 && 
                         paginatedOrders.filter(o => 
                           o.status === 'processing' || 
                           o.status === 'pending' || 
                           (!o.status && o.paymentStatus === 'completed')
                         ).every(o => selectedOrderIds.has(o.id))}
                onChange={toggleSelectAll}
                className="w-4 h-4 sm:w-5 sm:h-5 text-[#ff9800] rounded border-gray-300 focus:ring-[#ff9800] cursor-pointer"
              />
              <span className="text-xs sm:text-sm font-medium text-gray-700">
                เลือกทั้งหมดในหน้านี้ ({paginatedOrders.filter(o => 
                  o.status === 'processing' || 
                  o.status === 'pending' || 
                  (!o.status && o.paymentStatus === 'completed')
                ).length} รายการที่ยกเลิกได้)
              </span>
            </div>
          )}

          <div className="space-y-3 sm:space-y-4">
            {paginatedOrders.map((order) => {
              const items = getOrderItems(order)
              const shopName = getShopName(order)
              
              return (
        <Card 
          key={order.id} 
          className={`hover:shadow-xl transition-all duration-300 border-l-4 ${
            selectedOrderIds.has(order.id) 
              ? 'ring-2 ring-orange-500 bg-orange-50/30 border-l-orange-500' 
              : order.status === 'completed' 
                ? 'border-l-green-500' 
                : order.status === 'cancelled' 
                  ? 'border-l-red-500' 
                  : 'border-l-blue-500'
          }`}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex gap-3 sm:gap-4">
              {/* Checkbox - for processing/pending orders */}
              {(order.status === 'processing' || order.status === 'pending' || (!order.status && order.paymentStatus === 'completed')) && (
                <div 
                  className="flex items-start pt-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedOrderIds.has(order.id)}
                    onChange={() => toggleSelectOrder(order.id)}
                    className="w-5 h-5 text-[#ff9800] rounded border-gray-300 focus:ring-[#ff9800] cursor-pointer"
                  />
                </div>
              )}
              
              {/* Product Image - Larger */}
              <div 
                className="flex-shrink-0 cursor-pointer"
                onClick={() => openOrderDetail(order)}
              >
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-white border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow">
                  {items[0]?.productImage ? (
                    <Image
                      src={items[0].productImage}
                      alt={items[0]?.name || 'สินค้า'}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/landscape-placeholder-svgrepo-com.svg'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                      <Package className="w-10 h-10 text-gray-400" />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Order Content - More spacious */}
              <div 
                className="flex-1 cursor-pointer min-w-0"
                onClick={() => openOrderDetail(order)}
              >
                <div className="space-y-3">
                  {/* Shop Name with Avatar - Bigger */}
                  <div className="flex items-center gap-2.5">
                    <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 ring-2 ring-white shadow-sm">
                      <Image
                        src={order.shopAvatar || '/landscape-placeholder-svgrepo-com.svg'}
                        alt={shopName}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <span className="font-bold text-base sm:text-lg text-gray-900 truncate">{shopName}</span>
                  </div>
                  
                  {/* Product Info - Bigger text */}
                  <div className="space-y-1.5">
                    {items[0]?.gameName && (
                      <p className="text-sm sm:text-base font-bold text-[#ff9800] truncate flex items-center gap-1.5">
                        🎮 {items[0].gameName}
                      </p>
                    )}
                    <p className={`text-sm sm:text-base line-clamp-2 ${items[0]?.gameName ? 'text-gray-700' : 'text-gray-900 font-semibold'}`}>
                      {items[0]?.name || 'สินค้า'}
                      {items.length > 1 && (
                        <span className="ml-1.5 text-[#ff9800] font-bold">
                          +{items.length - 1} รายการ
                        </span>
                      )}
                    </p>
                  </div>
                  
                  {/* Date & Price Row */}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{formatDate(order.createdAt)}</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-[#ff9800] whitespace-nowrap">
                      ฿{order.totalAmount.toLocaleString()}
                    </div>
                  </div>
                  
                  {/* Status Badges - More prominent */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {order.status !== 'cancelled' && getPaymentStatusBadge(order.paymentStatus, order)}
                    
                    {/* Buyer Confirmation Badge */}
                    {order.gameCodeDeliveredAt && !order.buyerConfirmed && order.status !== 'cancelled' && order.disputeResolution !== 'refund' && (
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border border-blue-300 text-sm px-3 py-1">
                        <AlertTriangle className="w-4 h-4 mr-1.5" />
                        รอยืนยัน
                      </Badge>
                    )}
                    {order.buyerConfirmed && order.disputeResolution !== 'refund' && (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border border-green-300 text-sm px-3 py-1">
                        <CheckCircle className="w-4 h-4 mr-1.5" />
                        ยืนยันแล้ว
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Cancel Button - Show for pending and processing orders only */}
              {/* Support both new format (with status) and legacy format (without status, only paymentStatus) */}
              {(
                (order.status === 'pending' || order.status === 'processing' || !order.status) && 
                order.paymentStatus !== 'completed'
              ) && (
                <div className="mt-3">
                  <Button
                    variant="destructive"
                    size="default"
                    onClick={(e) => {
                      e.stopPropagation()
                      openCancelModal(order)
                    }}
                    className="w-full h-10 text-sm font-semibold"
                    disabled={cancellingOrderId === order.id}
                  >
                    {cancellingOrderId === order.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        กำลังยกเลิก...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        ยกเลิกคำสั่งซื้อ
                      </>
                    )}
                  </Button>
                </div>
              )}
              
              {/* Chat Button - Show after payment completed */}
              {order.paymentStatus === 'completed' && order.status !== 'cancelled' && (
                <div className="mt-4 pt-4 border-t-2 border-gray-200">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedOrderToChat(order)
                      setShowChatDialog(true)
                    }}
                    variant="outline"
                    className="w-full border-blue-300 hover:bg-blue-50 h-10 text-sm font-semibold"
                    size="default"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    แชทกับผู้ขาย
                  </Button>
                </div>
              )}
              
              {/* Confirm Receipt Button - Show if delivered but not confirmed and not refunded */}
              {order.gameCodeDeliveredAt && !order.buyerConfirmed && order.status !== 'cancelled' && order.disputeResolution !== 'refund' && (
                <div className="mt-4 pt-4 border-t-2 border-gray-200 space-y-3">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 shadow-sm">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-blue-900">
                          ผู้ขายส่งรหัสให้คุณแล้ว กรุณายืนยันหลังตรวจสอบ
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Dispute Status Badge */}
                  {order.hasDispute && order.disputeStatus !== 'resolved' && (
                    <div>
                      <Badge variant="outline" className={`w-full justify-center text-sm py-2 ${
                        order.disputeStatus === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-yellow-50 text-yellow-700 border-yellow-200'
                      }`}>
                        {order.disputeStatus === 'rejected' ? '❌ คำร้องถูกปฏิเสธ' :
                         '⏳ กำลังตรวจสอบปัญหา'}
                      </Badge>
                    </div>
                  )}
                  
                  {/* Resolved Dispute Status */}
                  {order.disputeStatus === 'resolved' && order.disputeResolution && (
                    <div>
                      <Badge variant="outline" className={`w-full justify-center text-sm py-2 ${
                        (order.disputeResolution as string) === 'refund' ? 'bg-green-50 text-green-700 border-green-200' :
                        (order.disputeResolution as string) === 'new_code' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-gray-50 text-gray-700 border-gray-200'
                      }`}>
                        {(order.disputeResolution as string) === 'refund' ? '✅ ได้รับการคืนเงินแล้ว' :
                         (order.disputeResolution as string) === 'new_code' ? '✅ ร้านค้าส่งรหัสใหม่แล้ว' :
                         '✅ ปัญหาได้รับการแก้ไข'}
                      </Badge>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  {/* Hide report button if refunded */}
                  {(order.disputeResolution as string) !== 'refund' && (
                  <div className="grid grid-cols-1 gap-2 sm:gap-3">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedOrderToReport(order)
                        setShowReportDialog(true)
                      }}
                      variant="outline"
                      className={`w-full border-red-300 hover:bg-red-50 text-red-600 h-10 text-sm font-semibold ${
                        (order.hasDispute && order.disputeStatus && order.disputeStatus !== 'resolved') ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      size="default"
                      disabled={!!(order.hasDispute && order.disputeStatus && order.disputeStatus !== 'resolved')}
                    >
                      <Flag className="w-4 h-4 mr-2" />
                      <span className="truncate">{(order.hasDispute && order.disputeStatus && order.disputeStatus !== 'resolved') ? 'กำลังตรวจสอบ' : 'รายงานปัญหา'}</span>
                    </Button>
                  </div>
                  )}
                  
                  {/* Show only chat button if refunded */}
                  {(order.disputeResolution as string) === 'refund' && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedOrderToChat(order)
                        setShowChatDialog(true)
                      }}
                      variant="outline"
                      className="w-full border-blue-300 hover:bg-blue-50 h-10 text-sm font-semibold"
                      size="default"
                    >
                      <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                      แชท
                    </Button>
                  )}
                  
                  {/* Hide confirm button if refunded */}
                  {(order.disputeResolution as string) !== 'refund' && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      openConfirmDialog(order)
                    }}
                    disabled={confirmingOrderId === order.id}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white h-9"
                    size="sm"
                  >
                    {confirmingOrderId === order.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 animate-spin" />
                        <span className="text-xs sm:text-sm">กำลังยืนยัน...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
                        <span className="text-xs sm:text-sm">✅ ยืนยันรับสินค้า</span>
                      </>
                    )}
                  </Button>
                  )}
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
                      {selectedOrderDetail.items.map((item, index) => {
                        const isSelected = selectedProductToReview?.productId === item.productId
                        return (
                        <div 
                          key={index} 
                          className={`bg-white border rounded-lg p-3 transition-all ${
                            isSelected 
                              ? 'ring-2 ring-yellow-400 border-yellow-400 shadow-lg bg-yellow-50' 
                              : 'border-gray-200'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-3">
                            {/* Product Image */}
                            {item.productImage && (
                              <div className="flex-shrink-0 relative">
                                <img
                                  src={item.productImage}
                                  alt={item.name}
                                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover border-2 border-gray-200"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                                {isSelected && (
                                  <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1 shadow-md">
                                    <Star className="w-3 h-3 text-white fill-white" />
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2">
                                <p className="font-medium text-gray-900 mb-1 line-clamp-2 flex-1">{item.name}</p>
                                {isSelected && (
                                  <span className="bg-yellow-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                                    กำลังรีวิว
                                  </span>
                                )}
                              </div>
                              {item.gameName && (
                                <p className="text-sm text-[#ff9800] font-medium mt-1">🎮 {item.gameName}</p>
                              )}
                              <div className="flex flex-wrap gap-2 mt-2">
                                <Link 
                                  href={`/products/${item.gameId || item.productId}`}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#ff9800] to-[#f57c00] hover:from-[#f57c00] hover:to-[#ff9800] text-white text-xs font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 active:scale-95"
                                >
                                  <ShoppingBag className="w-3.5 h-3.5" />
                                  ดูหน้าสินค้า
                                </Link>
                                {selectedOrderDetail.buyerConfirmed && selectedOrderDetail.status !== 'cancelled' && item.productId && (
                                  <button
                                    onClick={() => handleProductReviewSelect(
                                      item.productId!,
                                      item.name,
                                      selectedOrderDetail.id
                                    )}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 ${
                                      isSelected
                                        ? 'bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white'
                                        : 'bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white'
                                    }`}
                                  >
                                    <Star className="w-3.5 h-3.5" />
                                    {isSelected ? 'ยกเลิกรีวิว' : 'รีวิวสินค้านี้'}
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-[#ff9800] ml-2">
                                ฿{(item.price * (item.quantity || 1)).toLocaleString()}
                              </p>
                              {(item.quantity && item.quantity > 1) && (
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {item.quantity} x ฿{item.price.toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Review Form for This Product */}
                          {isSelected && selectedOrderDetail.buyerConfirmed && selectedOrderDetail.status !== 'cancelled' && (
                            <div className="mt-3 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                <h5 className="font-semibold text-gray-900">รีวิวสินค้า: {item.name}</h5>
                              </div>
                              <ReviewFormComponent
                                key={`product-${item.productId}`}
                                orderId={selectedOrderDetail.id}
                                shopId={selectedOrderDetail.shopId}
                                shopName={selectedOrderDetail.shopName || getShopName(selectedOrderDetail)}
                                productId={item.productId}
                                productName={item.name}
                                existingShopReview={selectedOrderReviews?.shopReview || undefined}
                                existingProductReview={productReviews.get(item.productId!)}
                                onSuccess={() => {
                                  // แค่ refresh ข้อมูลรีวิว ไม่ต้องปิดฟอร์ม
                                  if (item.productId) {
                                    fetchProductReview(selectedOrderDetail.id, item.productId)
                                  }
                                }}
                              />
                            </div>
                          )}
                        </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Game Account Info */}
                  {(selectedOrderDetail.deliveredItems && selectedOrderDetail.deliveredItems.length > 0) ? (
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-5">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-xl shadow-md">
                          <Key className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-green-900 mb-1">🎮 ข้อมูลบัญชีเกม ({selectedOrderDetail.deliveredItems.length} รายการ)</h4>
                          <p className="text-xs text-green-700">กรุณาเปลี่ยนรหัสผ่านทันทีหลังได้รับบัญชี</p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {selectedOrderDetail.deliveredItems.map((item, idx) => (
                          <div key={idx} className="bg-white/50 rounded-xl p-4 border border-green-200">
                            <h5 className="font-bold text-gray-800 mb-3 pb-2 border-b border-green-100 flex items-center justify-between">
                              <span>{item.itemName}</span>
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">รายการที่ {idx + 1}</span>
                            </h5>
                            
                            <div className="space-y-3">
                              {(item.email || item.username) && (
                                <div className="bg-white border border-green-200 rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-green-800 bg-green-100 px-2 py-0.5 rounded">ID / Email</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                      onClick={() => copyToClipboard(item.email || item.username || "", `${selectedOrderDetail.id}-${idx}-id`)}
                                    >
                                      {copiedId === `${selectedOrderDetail.id}-${idx}-id` ? (
                                        <><Check className="w-3 h-3 mr-1" /> คัดลอกแล้ว</>
                                      ) : (
                                        <><Copy className="w-3 h-3 mr-1" /> คัดลอก</>
                                      )}
                                    </Button>
                                  </div>
                                  <code className="text-sm font-mono font-bold text-gray-900 break-all block">
                                    {item.email || item.username}
                                  </code>
                                </div>
                              )}

                              {item.emailPassword && (
                                <div className="bg-white border border-blue-200 rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">Email Password</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                      onClick={() => copyToClipboard(item.emailPassword || "", `${selectedOrderDetail.id}-${idx}-emailpass`)}
                                    >
                                      {copiedId === `${selectedOrderDetail.id}-${idx}-emailpass` ? (
                                        <><Check className="w-3 h-3 mr-1" /> คัดลอกแล้ว</>
                                      ) : (
                                        <><Copy className="w-3 h-3 mr-1" /> คัดลอก</>
                                      )}
                                    </Button>
                                  </div>
                                  <code className="text-sm font-mono font-bold text-gray-900 break-all block">
                                    {item.emailPassword}
                                  </code>
                                </div>
                              )}

                              {item.password && (
                                <div className="bg-white border border-orange-200 rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-orange-800 bg-orange-100 px-2 py-0.5 rounded">Password</span>
                                      <span className="text-[10px] text-orange-600 font-medium">⚠️ เปลี่ยนทันที!</span>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                      onClick={() => copyToClipboard(item.password || "", `${selectedOrderDetail.id}-${idx}-pass`)}
                                    >
                                      {copiedId === `${selectedOrderDetail.id}-${idx}-pass` ? (
                                        <><Check className="w-3 h-3 mr-1" /> คัดลอกแล้ว</>
                                      ) : (
                                        <><Copy className="w-3 h-3 mr-1" /> คัดลอก</>
                                      )}
                                    </Button>
                                  </div>
                                  <code className="text-sm font-mono font-bold text-gray-900 break-all block">
                                    {item.password}
                                  </code>
                                </div>
                              )}

                              {item.additionalInfo && (
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                  <span className="text-xs font-bold text-gray-600 block mb-1">ข้อมูลเพิ่มเติม</span>
                                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{item.additionalInfo}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (selectedOrderDetail.email || selectedOrderDetail.username || selectedOrderDetail.password || selectedOrderDetail.additionalInfo) && (
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

