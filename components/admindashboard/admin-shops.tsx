"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Store, CheckCircle2, XCircle, Clock, AlertCircle, Search, Facebook, MessageCircle, Phone, Mail, User, Ban, PlayCircle, TrendingUp, DollarSign, Calendar } from "lucide-react"
import { getAllShops, approveShop, rejectShop, suspendShop, unsuspendShop, type Shop } from "@/lib/shop-client"
import { getUserProfile, type UserProfile } from "@/lib/user-client"
import { useAuth } from "@/components/auth-context"

interface AdminShopsProps {
  adminId: string
}

interface ShopWithOwner extends Shop {
  ownerProfile?: UserProfile
}

export function AdminShops({ adminId }: AdminShopsProps) {
  const { user } = useAuth()
  const [shops, setShops] = useState<ShopWithOwner[]>([])
  const [filteredShops, setFilteredShops] = useState<ShopWithOwner[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'rejected' | 'suspended'>('all')
  const [selectedShop, setSelectedShop] = useState<ShopWithOwner | null>(null)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showSuspendDialog, setShowSuspendDialog] = useState(false)
  const [showUnsuspendDialog, setShowUnsuspendDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [suspensionReason, setSuspensionReason] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [verifierProfile, setVerifierProfile] = useState<UserProfile | null>(null)
  const [suspenderProfile, setSuspenderProfile] = useState<UserProfile | null>(null)
  const [adminProfile, setAdminProfile] = useState<UserProfile | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    loadShops()
    loadAdminProfile()
  }, [])

  useEffect(() => {
    filterShops()
  }, [shops, searchQuery, statusFilter])

  const loadAdminProfile = async () => {
    if (user) {
      try {
        const profile = await getUserProfile(user.uid)
        setAdminProfile(profile)
      } catch (error) {
        console.error("Error loading admin profile:", error)
      }
    }
  }

  const loadShops = async () => {
    try {
      setLoading(true)
      const allShops = await getAllShops()
      
      // Convert date strings to Date objects
      const shopsWithDates = allShops.map(shop => ({
        ...shop,
        createdAt: new Date(shop.createdAt),
        updatedAt: new Date(shop.updatedAt),
        verifiedAt: shop.verifiedAt ? new Date(shop.verifiedAt) : undefined,
        suspendedAt: shop.suspendedAt ? new Date(shop.suspendedAt) : undefined,
      }));
      
      // Load owner profiles for each shop
      const shopsWithOwners = await Promise.all(
        shopsWithDates.map(async (shop) => {
          const ownerProfile = await getUserProfile(shop.ownerId)
          return {
            ...shop,
            ownerProfile: ownerProfile || undefined
          }
        })
      )
      
      setShops(shopsWithOwners)
    } catch (error) {
      console.error("Error loading shops:", error)
      setMessage({ type: "error", text: "ไม่สามารถโหลดข้อมูลร้านค้าได้" })
    } finally {
      setLoading(false)
    }
  }

  const filterShops = () => {
    let filtered = shops

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(shop => shop.status === statusFilter)
    }

    // Reset to first page when filters change
    setCurrentPage(1)
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(shop =>
        shop.shopName.toLowerCase().includes(query) ||
        shop.contactEmail?.toLowerCase().includes(query) ||
        shop.contactPhone?.includes(query) ||
        shop.ownerId.toLowerCase().includes(query)
      )
    }

    setFilteredShops(filtered)
  }

  const handleApprove = async () => {
    if (!selectedShop) return

    try {
      setActionLoading(true)
      await approveShop(selectedShop.shopId, adminId)
      
      // Admin activity logging will be handled by the API route
      
      setMessage({ type: "success", text: `อนุมัติร้าน "${selectedShop.shopName}" สำเร็จ` })
      setShowReviewDialog(false)
      setSelectedShop(null)
      await loadShops()
    } catch (error) {
      console.error("Error approving shop:", error)
      setMessage({ type: "error", text: "ไม่สามารถอนุมัติร้านค้าได้" })
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedShop || !rejectionReason.trim()) {
      setMessage({ type: "error", text: "กรุณาระบุเหตุผลในการปฏิเสธ" })
      return
    }

    try {
      setActionLoading(true)
      await rejectShop(selectedShop.shopId, adminId, rejectionReason.trim())
      
      // Admin activity logging will be handled by the API route
      
      setMessage({ type: "success", text: `ปฏิเสธร้าน "${selectedShop.shopName}" สำเร็จ` })
      setShowRejectDialog(false)
      setShowReviewDialog(false)
      setSelectedShop(null)
      setRejectionReason("")
      await loadShops()
    } catch (error) {
      console.error("Error rejecting shop:", error)
      setMessage({ type: "error", text: "ไม่สามารถปฏิเสธร้านค้าได้" })
    } finally {
      setActionLoading(false)
    }
  }

  const handleSuspend = async () => {
    if (!selectedShop || !suspensionReason.trim()) {
      setMessage({ type: "error", text: "กรุณาระบุเหตุผลในการระงับ" })
      return
    }

    try {
      setActionLoading(true)
      await suspendShop(selectedShop.shopId, adminId, suspensionReason.trim())
      
      // Admin activity logging will be handled by the API route
      
      setMessage({ type: "success", text: `ระงับร้าน "${selectedShop.shopName}" สำเร็จ` })
      setShowSuspendDialog(false)
      setShowReviewDialog(false)
      setSelectedShop(null)
      setSuspensionReason("")
      await loadShops()
    } catch (error) {
      console.error("Error suspending shop:", error)
      setMessage({ type: "error", text: "ไม่สามารถระงับร้านค้าได้" })
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnsuspend = async (shop: Shop) => {
    setSelectedShop(shop)
    setShowUnsuspendDialog(true)
  }

  const confirmUnsuspend = async () => {
    if (!selectedShop) return

    try {
      setActionLoading(true)
      await unsuspendShop(selectedShop.shopId)
      
      // Admin activity logging will be handled by the API route
      
      // ลบคำขอเปิดร้านใหม่ทั้งหมดของร้านนี้ (ถ้ามี) - เรียกผ่าน API
      try {
        await fetch(`/api/shops/${selectedShop.shopId}/reopen-requests`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.warn('Error deleting reopen requests:', error)
        // ไม่ throw error เพราะการยกเลิกระงับสำเร็จแล้ว
      }
      
      setMessage({ type: "success", text: `ยกเลิกการระงับร้าน "${selectedShop.shopName}" สำเร็จ` })
      setShowUnsuspendDialog(false)
      setShowReviewDialog(false) // ปิด Review Dialog ด้วย
      setSelectedShop(null)
      await loadShops()
    } catch (error) {
      console.error("Error unsuspending shop:", error)
      setMessage({ type: "error", text: "ไม่สามารถยกเลิกการระงับร้านค้าได้" })
    } finally {
      setActionLoading(false)
    }
  }


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2 py-1 sm:px-3 sm:py-1.5 bg-yellow-100 text-yellow-800 rounded-full text-xs sm:text-sm font-bold border-2 border-yellow-300 flex items-center gap-1 w-fit whitespace-nowrap">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">รอตรวจสอบ</span>
            <span className="sm:hidden">รอ</span>
          </span>
        )
      case 'active':
        return (
          <span className="px-2 py-1 sm:px-3 sm:py-1.5 bg-green-100 text-green-800 rounded-full text-xs sm:text-sm font-bold border-2 border-green-300 flex items-center gap-1 w-fit whitespace-nowrap">
            <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">เปิดใช้งาน</span>
            <span className="sm:hidden">เปิด</span>
          </span>
        )
      case 'rejected':
        return (
          <span className="px-2 py-1 sm:px-3 sm:py-1.5 bg-red-100 text-red-800 rounded-full text-xs sm:text-sm font-bold border-2 border-red-300 flex items-center gap-1 w-fit whitespace-nowrap">
            <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
            ปฏิเสธ
          </span>
        )
      case 'suspended':
        return (
          <span className="px-2 py-1 sm:px-3 sm:py-1.5 bg-orange-100 text-orange-800 rounded-full text-xs sm:text-sm font-bold border-2 border-orange-300 flex items-center gap-1 w-fit whitespace-nowrap">
            <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
            ระงับ
          </span>
        )
      case 'closed':
        return (
          <span className="px-2 py-1 sm:px-3 sm:py-1.5 bg-gray-100 text-gray-800 rounded-full text-xs sm:text-sm font-bold border-2 border-gray-300 flex items-center gap-1 w-fit whitespace-nowrap">
            ปิดแล้ว
          </span>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  const openReviewDialog = async (shop: Shop) => {
    setSelectedShop(shop)
    setShowReviewDialog(true)
    setMessage(null)
    
    // Load verifier and suspender profiles
    if (shop.verifiedBy) {
      const profile = await getUserProfile(shop.verifiedBy)
      setVerifierProfile(profile)
    }
    if (shop.suspendedBy) {
      const profile = await getUserProfile(shop.suspendedBy)
      setSuspenderProfile(profile)
    }
  }

  const pendingCount = shops.filter(s => s.status === 'pending').length
  const activeCount = shops.filter(s => s.status === 'active').length
  const rejectedCount = shops.filter(s => s.status === 'rejected').length
  const suspendedCount = shops.filter(s => s.status === 'suspended').length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff9800]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Orange Gradient */}
      <div className="bg-gradient-to-r from-orange-500 via-[#ff9800] to-red-500 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 sm:w-64 sm:h-64 bg-white/10 rounded-full -mr-16 sm:-mr-32 -mt-16 sm:-mt-32"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-48 sm:h-48 bg-white/10 rounded-full -ml-12 sm:-ml-24 -mb-12 sm:-mb-24"></div>
        <div className="relative z-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2 drop-shadow-lg flex items-center gap-2 sm:gap-3">
            <Store className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10" />
            จัดการร้านค้า
          </h2>
          <p className="text-white/90 text-sm sm:text-base lg:text-lg">จัดการจัดการร้านค้าค้าและอนุมัติร้านค้าในระบบ</p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-3 sm:p-4 rounded-lg sm:rounded-xl flex items-start gap-2 sm:gap-3 animate-in fade-in duration-200 ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border-2 border-green-200"
              : "bg-red-50 text-red-800 border-2 border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0" />
          )}
          <span className="font-medium text-sm sm:text-base">{message.text}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total */}
        <Card className="p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
              <Store className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-900">{shops.length}</div>
              <div className="text-xs sm:text-sm text-blue-700 font-medium truncate">ร้านค้าทั้งหมด</div>
            </div>
          </div>
        </Card>

        {/* Pending */}
        <Card className="p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg animate-pulse flex-shrink-0">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-yellow-900">{pendingCount}</div>
              <div className="text-xs sm:text-sm text-yellow-700 font-medium truncate">รออนุมัติ</div>
            </div>
          </div>
        </Card>

        {/* Active */}
        <Card className="p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-900">{activeCount}</div>
              <div className="text-xs sm:text-sm text-green-700 font-medium truncate">เปิดแล้ว</div>
            </div>
          </div>
        </Card>

        {/* Rejected/Suspended */}
        <Card className="p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
              <XCircle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-red-900">{rejectedCount + suspendedCount}</div>
              <div className="text-xs sm:text-sm text-red-700 font-medium truncate">ปิด/ระงับ</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 border border-gray-200">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
            <Input
              type="text"
              placeholder="ค้นหาร้านค้า, อีเมล, เบอร์โทร..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 sm:pl-10 border-2 focus:border-[#ff9800] text-sm sm:text-base"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('all')}
              className={`whitespace-nowrap text-xs sm:text-sm ${statusFilter === 'all' ? 'bg-[#ff9800] hover:bg-[#e08800]' : ''}`}
            >
              ทั้งหมด ({shops.length})
            </Button>
            <Button
              variant={statusFilter === 'pending' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('pending')}
              className={`whitespace-nowrap text-xs sm:text-sm ${statusFilter === 'pending' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}`}
            >
              รอตรวจสอบ ({pendingCount})
            </Button>
            <Button
              variant={statusFilter === 'active' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('active')}
              className={`whitespace-nowrap text-xs sm:text-sm ${statusFilter === 'active' ? 'bg-green-600 hover:bg-green-700' : ''}`}
            >
              เปิดใช้งาน ({activeCount})
            </Button>
            <Button
              variant={statusFilter === 'rejected' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('rejected')}
              className={`whitespace-nowrap text-xs sm:text-sm ${statusFilter === 'rejected' ? 'bg-red-600 hover:bg-red-700' : ''}`}
            >
              ปฏิเสธ ({rejectedCount})
            </Button>
            <Button
              variant={statusFilter === 'suspended' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('suspended')}
              className={`whitespace-nowrap text-xs sm:text-sm ${statusFilter === 'suspended' ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
            >
              ระงับ ({suspendedCount})
            </Button>
          </div>
        </div>
      </div>

      {/* Shops Cards */}
      <div className="space-y-3 sm:space-y-4">
        {filteredShops.length === 0 ? (
          <Card className="p-8 sm:p-12 text-center bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200">
            <div className="text-4xl sm:text-6xl mb-3 sm:mb-4 animate-bounce">🏪</div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1 sm:mb-2">ไม่พบร้านค้า</h3>
            <p className="text-gray-600 text-sm sm:text-base lg:text-lg">ลองปรับเปลี่ยนตัวกรองหรือค้นหาใหม่อีกครั้ง</p>
          </Card>
        ) : (
          <>
            {(() => {
              // Pagination calculations
              const totalPages = Math.ceil(filteredShops.length / itemsPerPage)
              const startIndex = (currentPage - 1) * itemsPerPage
              const endIndex = startIndex + itemsPerPage
              const paginatedShops = filteredShops.slice(startIndex, endIndex)
              
              return (
                <>
                  {paginatedShops.map((shop) => (
            <Card 
              key={shop.shopId}
              onClick={() => openReviewDialog(shop)}
              className="p-3 sm:p-4 lg:p-5 hover:shadow-xl transition-all duration-300 border-2 hover:border-[#ff9800] group cursor-pointer"
            >
              <div className="flex items-start gap-3 sm:gap-4">
                {/* Shop Logo */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-lg sm:rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-gray-200 group-hover:border-[#ff9800] transition-all">
                  {shop.logoUrl ? (
                    <img src={shop.logoUrl} alt={shop.shopName} className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-gray-400" />
                  )}
                </div>

                {/* Shop Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 sm:gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mb-1 flex items-center gap-1.5 sm:gap-2">
                        <Store className="w-4 h-4 sm:w-5 sm:h-5 text-[#ff9800] flex-shrink-0" />
                        <span className="truncate">{shop.shopName}</span>
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-1 sm:line-clamp-2">{shop.description}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {getStatusBadge(shop.status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5 sm:gap-2 text-xs sm:text-sm">
                    {/* Owner */}
                    <div className="flex items-center gap-1.5 sm:gap-2 text-gray-700 min-w-0">
                      <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                      <span className="font-medium flex-shrink-0">เจ้าของร้าน:</span>
                      <span className="text-[#ff9800] font-semibold truncate">
                        {shop.ownerProfile?.displayName || shop.ownerProfile?.email || 'ไม่ระบุ'}
                      </span>
                    </div>

                    {/* Created Date */}
                    <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 min-w-0">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                      <span className="flex-shrink-0">สร้างเมื่อ:</span>
                      <span className="truncate">{shop.createdAt.toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}</span>
                    </div>

                    {/* Email */}
                    {shop.contactEmail && (
                      <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 min-w-0">
                        <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{shop.contactEmail}</span>
                      </div>
                    )}

                    {/* Phone */}
                    {shop.contactPhone && (
                      <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600">
                        <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                        <span>{shop.contactPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
          </>
          );
          })()}
          
          {/* Pagination */}
          {(() => {
            const totalPages = Math.ceil(filteredShops.length / itemsPerPage);
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const paginatedCount = Math.min(endIndex, filteredShops.length) - startIndex;
            
            return filteredShops.length > 0 ? (
            <Card className="p-4 border-2">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Page Info */}
                <div className="text-sm text-gray-600">
                  หน้า {currentPage} จาก {totalPages} (แสดง {paginatedCount} จาก {filteredShops.length} ร้านค้า)
                </div>

                {/* Pagination Buttons */}
                {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  {/* Previous Button */}
                  <Button
                    onClick={() => {
                      setCurrentPage(prev => Math.max(1, prev - 1))
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                    className="px-3"
                  >
                    ← ก่อนหน้า
                  </Button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <Button
                            key={page}
                            onClick={() => {
                              setCurrentPage(page)
                              window.scrollTo({ top: 0, behavior: 'smooth' })
                            }}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            className={`w-9 h-9 p-0 ${
                              currentPage === page
                                ? "bg-[#ff9800] hover:bg-[#e08800] text-white"
                                : ""
                            }`}
                          >
                            {page}
                          </Button>
                        )
                      } else if (
                        page === currentPage - 2 ||
                        page === currentPage + 2
                      ) {
                        return (
                          <span key={page} className="px-2 text-gray-400">
                            ...
                          </span>
                        )
                      }
                      return null
                    })}
                  </div>

                  {/* Next Button */}
                  <Button
                    onClick={() => {
                      setCurrentPage(prev => Math.min(totalPages, prev + 1))
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="sm"
                    className="px-3"
                  >
                    ถัดไป →
                  </Button>
                </div>
                )}
              </div>
            </Card>
          ) : null;
            })()}
        </>
        )}
      </div>

      {/* Review Dialog */}
      {showReviewDialog && selectedShop && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => setShowReviewDialog(false)}
        >
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-hidden bg-white relative animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              onClick={() => setShowReviewDialog(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700 z-10"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 pr-8">รายละเอียดร้านค้า</h2>
              <p className="text-sm text-gray-600 mt-1">ตรวจสอบข้อมูลร้านค้าก่อนอนุมัติ</p>
            </div>
          
            <div className="p-6 overflow-y-auto" style={{maxHeight: 'calc(90vh - 180px)'}}>
            <div className="space-y-6">
              {/* Shop Info */}
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {selectedShop.logoUrl ? (
                    <img src={selectedShop.logoUrl} alt={selectedShop.shopName} className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-[#292d32] mb-1">{selectedShop.shopName}</h3>
                  <p className="text-gray-600 mb-2">{selectedShop.description}</p>
                  {getStatusBadge(selectedShop.status)}
                </div>
              </div>

              {/* Owner Information */}
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                <h4 className="font-semibold text-[#292d32] mb-3 flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-600" />
                  ข้อมูลเจ้าของร้าน
                </h4>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-500">ชื่อ</p>
                    <p className="font-medium text-[#292d32]">
                      {selectedShop.ownerProfile?.displayName || 'ไม่ระบุ'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">อีเมล</p>
                    <p className="font-medium text-[#292d32]">
                      {selectedShop.ownerProfile?.email || 'ไม่ระบุ'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">User ID</p>
                    <p className="font-medium text-[#292d32] font-mono text-sm">{selectedShop.ownerId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">สถานะบัญชี</p>
                    <p className="font-medium text-[#292d32]">
                      {selectedShop.ownerProfile?.accountStatus === 'active' ? '✅ Active' : '❌ Inactive'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h4 className="font-semibold text-[#292d32] mb-3">ข้อมูลติดต่อร้านค้า</h4>
                {selectedShop.contactEmail && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">อีเมล</p>
                      <p className="font-medium text-[#292d32]">{selectedShop.contactEmail}</p>
                    </div>
                  </div>
                )}
                {selectedShop.contactPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">เบอร์โทร</p>
                      <p className="font-medium text-[#292d32]">{selectedShop.contactPhone}</p>
                    </div>
                  </div>
                )}
                {selectedShop.facebookUrl && (
                  <div className="flex items-center gap-3">
                    <Facebook className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Facebook</p>
                      <a href={selectedShop.facebookUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline break-all">
                        {selectedShop.facebookUrl}
                      </a>
                    </div>
                  </div>
                )}
                {selectedShop.lineId && (
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Line ID</p>
                      <p className="font-medium text-[#292d32]">{selectedShop.lineId}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Suspension Status */}
              {selectedShop.status === 'suspended' && selectedShop.suspensionReason && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Ban className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-orange-800 mb-1">เหตุผลในการระงับ:</p>
                      <p className="text-orange-700">{selectedShop.suspensionReason}</p>
                      {selectedShop.suspendedAt && (
                        <p className="text-sm text-orange-600 mt-1">
                          ระงับเมื่อ {selectedShop.suspendedAt.toLocaleDateString('th-TH')} {selectedShop.suspendedAt.toLocaleTimeString('th-TH')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Verification Status */}
              {selectedShop.status === 'rejected' && selectedShop.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-800 mb-1">เหตุผลในการปฏิเสธ:</p>
                      <p className="text-red-700">{selectedShop.rejectionReason}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedShop.verifiedBy && selectedShop.verifiedAt && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-blue-800 mb-1">ตรวจสอบโดย:</p>
                      <p className="text-blue-700">
                        {verifierProfile?.displayName || verifierProfile?.email || selectedShop.verifiedBy}
                      </p>
                      <p className="text-sm text-blue-600 mt-1">
                        เมื่อ {selectedShop.verifiedAt.toLocaleDateString('th-TH')} {selectedShop.verifiedAt.toLocaleTimeString('th-TH')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedShop.suspendedBy && selectedShop.suspendedAt && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Ban className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-orange-800 mb-1">ระงับโดย:</p>
                      <p className="text-orange-700">
                        {suspenderProfile?.displayName || suspenderProfile?.email || selectedShop.suspendedBy}
                      </p>
                      <p className="text-sm text-orange-600 mt-1">
                        เมื่อ {selectedShop.suspendedAt.toLocaleDateString('th-TH')} {selectedShop.suspendedAt.toLocaleTimeString('th-TH')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Shop Details */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <p className="text-sm text-gray-500">ยอดขาย</p>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <p className="font-medium text-[#292d32]">{selectedShop.totalSales.toLocaleString()} รายการ</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">รายได้</p>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    <p className="font-medium text-[#292d32]">฿{selectedShop.totalRevenue.toLocaleString()}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Owner ID</p>
                  <p className="font-medium text-[#292d32] font-mono text-sm">{selectedShop.ownerId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Shop ID</p>
                  <p className="font-medium text-[#292d32] font-mono text-sm">{selectedShop.shopId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">วันที่สร้าง</p>
                  <p className="font-medium text-[#292d32]">
                    {selectedShop.createdAt.toLocaleDateString('th-TH')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">อัปเดตล่าสุด</p>
                  <p className="font-medium text-[#292d32]">
                    {selectedShop.updatedAt.toLocaleDateString('th-TH')}
                  </p>
                </div>
              </div>

              {/* Actions */}
              {selectedShop.status === 'pending' && (
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {actionLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        กำลังดำเนินการ...
                      </div>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        อนุมัติร้านค้า
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setShowRejectDialog(true)}
                    disabled={actionLoading}
                    variant="outline"
                    className="flex-1 border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    ปฏิเสธร้านค้า
                  </Button>
                </div>
              )}

              {selectedShop.status === 'active' && (
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => setShowSuspendDialog(true)}
                    disabled={actionLoading}
                    variant="outline"
                    className="flex-1 border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white"
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    ระงับร้านค้า
                  </Button>
                </div>
              )}

              {selectedShop.status === 'suspended' && (
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => handleUnsuspend(selectedShop)}
                    disabled={actionLoading}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {actionLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        กำลังดำเนินการ...
                      </div>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4 mr-2" />
                        ยกเลิกการระงับ
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
            </div>
          </Card>
        </div>
      )}

      {/* Reject Dialog */}
      {showRejectDialog && selectedShop && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => setShowRejectDialog(false)}
        >
          <Card className="max-w-md w-full bg-white relative animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              onClick={() => setShowRejectDialog(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700 z-10"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 pr-8">ปฏิเสธร้านค้า</h2>
              <p className="text-sm text-gray-600 mt-1">กรุณาระบุเหตุผลในการปฏิเสธร้านค้า</p>
            </div>
          
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">เหตุผล <span className="text-red-500">*</span></label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="เช่น: ข้อมูลไม่ครบถ้วน, Facebook URL ไม่ถูกต้อง, ไม่สามารถติดต่อได้..."
                  className="min-h-[100px]"
                  disabled={actionLoading}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowRejectDialog(false)
                    setRejectionReason("")
                  }}
                  disabled={actionLoading}
                  variant="outline"
                  className="flex-1"
                >
                  ยกเลิก
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {actionLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      กำลังดำเนินการ...
                    </div>
                  ) : (
                    "ยืนยันปฏิเสธ"
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Suspend Dialog */}
      {showSuspendDialog && selectedShop && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => setShowSuspendDialog(false)}
        >
          <Card className="max-w-md w-full bg-white relative animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              onClick={() => setShowSuspendDialog(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700 z-10"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 pr-8">ระงับร้านค้า</h2>
              <p className="text-sm text-gray-600 mt-1">กรุณาระบุเหตุผลในการระงับร้านค้า</p>
            </div>
          
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">เหตุผล <span className="text-red-500">*</span></label>
                <Textarea
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  placeholder="เช่น: พบการฉ้อโกง, สินค้าไม่ตรงตามที่โฆษณา, ร้องเรียนจากลูกค้า..."
                  className="min-h-[100px]"
                  disabled={actionLoading}
                />
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />
                  <p className="text-sm text-orange-800">
                    การระงับร้านค้าจะทำให้ร้านไม่สามารถขายสินค้าได้ชั่วคราว และจะไม่แสดงในหน้าแรก
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowSuspendDialog(false)
                    setSuspensionReason("")
                  }}
                  disabled={actionLoading}
                  variant="outline"
                  className="flex-1"
                >
                  ยกเลิก
                </Button>
                <Button
                  onClick={handleSuspend}
                  disabled={actionLoading || !suspensionReason.trim()}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {actionLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      กำลังดำเนินการ...
                    </div>
                  ) : (
                    "ยืนยันระงับ"
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Unsuspend Dialog */}
      {showUnsuspendDialog && selectedShop && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => setShowUnsuspendDialog(false)}
        >
          <Card className="max-w-md w-full bg-white relative animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              onClick={() => setShowUnsuspendDialog(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700 z-10"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-green-600 flex items-center gap-2 pr-8">
                <PlayCircle className="w-6 h-6" />
                ยกเลิกการระงับร้านค้า
              </h2>
              <p className="text-sm text-gray-600 mt-1">ยืนยันการเปิดร้านค้าให้กลับมาใช้งานได้อีกครั้ง</p>
            </div>
          
            <div className="p-6">
            <div className="space-y-4">
              {/* Shop Info */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Store className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-green-600 font-medium mb-1">ร้านค้า</p>
                    <p className="text-lg font-bold text-green-900 mb-2">{selectedShop.shopName}</p>
                    {selectedShop.suspensionReason && (
                      <div className="bg-white rounded-lg p-3 mt-2">
                        <p className="text-xs text-orange-600 font-medium mb-1">เหตุผลที่ถูกระงับ:</p>
                        <p className="text-sm text-gray-700">{selectedShop.suspensionReason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-blue-900 mb-2">การยกเลิกการระงับจะทำให้:</p>
                      <ul className="space-y-1 text-sm text-blue-800">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span>ร้านค้ากลับมาใช้งานได้ปกติ</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span>ผู้ขายสามารถเข้าถึง Dashboard ได้</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span>ร้านค้าจะแสดงในหน้าแรกอีกครั้ง</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span>สามารถขายสินค้าได้อีกครั้ง</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning Box */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-900 mb-1">⚠️ โปรดตรวจสอบ</p>
                    <p className="text-sm text-amber-800">
                      กรุณาแน่ใจว่าปัญหาที่ทำให้ร้านค้าถูกระงับได้รับการแก้ไขแล้ว
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => {
                    setShowUnsuspendDialog(false)
                  setSelectedShop(null)
                }}
                disabled={actionLoading}
                variant="outline"
                className="flex-1"
              >
                ยกเลิก
              </Button>
              <Button
                onClick={confirmUnsuspend}
                disabled={actionLoading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {actionLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    กำลังดำเนินการ...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <PlayCircle className="w-5 h-5" />
                    ยืนยันเปิดร้านค้า
                  </div>
                )}
              </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
