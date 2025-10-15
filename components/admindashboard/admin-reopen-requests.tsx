'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { 
  getAllReopenRequests, 
  approveReopenRequest, 
  rejectReopenRequest,
  type ReopenRequest 
} from '@/lib/reopen-request-service';
import { getUserProfile } from '@/lib/user-service';
import { getShopById, type Shop } from '@/lib/shop-service';
import { Input } from '@/components/ui/input';
import { Search, Filter } from 'lucide-react';

export default function AdminReopenRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ReopenRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<ReopenRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  
  // Dialog states
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ReopenRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  // Detail view
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  
  // Owner profile and shop data
  const [ownerProfiles, setOwnerProfiles] = useState<Record<string, { displayName?: string; email?: string | null; photoURL?: string | null }>>({});
  const [shopData, setShopData] = useState<Record<string, Shop>>({});
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, searchQuery, statusFilter]);

  const filterRequests = () => {
    let filtered = [...requests];

    // Reset to first page when filters change
    setCurrentPage(1);

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(req => req.status === statusFilter);
    }

    // Filter by search query (shop name, owner email, owner name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(req => {
        const shopName = req.shopName?.toLowerCase() || '';
        const ownerEmail = req.ownerEmail?.toLowerCase() || '';
        const ownerName = getOwnerName(req.ownerId).toLowerCase();
        
        return shopName.includes(query) || 
               ownerEmail.includes(query) || 
               ownerName.includes(query);
      });
    }

    setFilteredRequests(filtered);
  };

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await getAllReopenRequests();
      setRequests(data);
      
      // โหลดโปรไฟล์ของ owner และข้อมูลร้านค้า
      const profiles: Record<string, { displayName?: string; email?: string | null; photoURL?: string | null }> = {};
      const shops: Record<string, Shop> = {};
      for (const request of data) {
        // โหลดโปรไฟล์ owner
        if (!profiles[request.ownerId]) {
          try {
            const profile = await getUserProfile(request.ownerId);
            if (profile) {
              profiles[request.ownerId] = profile;
            }
          } catch {
            console.warn(`Could not load profile for ${request.ownerId}`);
          }
        }
        
        // โหลดข้อมูลร้านค้า
        if (request.shopId && !shops[request.shopId]) {
          try {
            const shop = await getShopById(request.shopId);
            if (shop) {
              shops[request.shopId] = shop;
            }
          } catch {
            console.warn(`Could not load shop for ${request.shopId}`);
          }
        }
        
        // โหลดโปรไฟล์ของ reviewer (ถ้ามี)
        if (request.reviewedBy && !profiles[request.reviewedBy]) {
          try {
            const profile = await getUserProfile(request.reviewedBy);
            if (profile) {
              profiles[request.reviewedBy] = profile;
            }
          } catch {
            console.warn(`Could not load profile for ${request.reviewedBy}`);
          }
        }
      }
      setOwnerProfiles(profiles);
      setShopData(shops);
      
    } catch (error) {
      console.error('Error loading reopen requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const openReviewDialog = (request: ReopenRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setReviewAction(action);
    setReviewNote('');
    setShowReviewDialog(true);
  };

  const closeReviewDialog = () => {
    setShowReviewDialog(false);
    setSelectedRequest(null);
    setReviewAction(null);
    setReviewNote('');
  };

  const handleReview = async () => {
    if (!selectedRequest || !reviewAction || !user) return;
    
    setProcessing(selectedRequest.id!);
    
    try {
      if (reviewAction === 'approve') {
        await approveReopenRequest(selectedRequest.id!, user.uid, reviewNote);
      } else {
        if (!reviewNote.trim()) {
          alert('กรุณาระบุเหตุผลในการปฏิเสธ');
          return;
        }
        await rejectReopenRequest(selectedRequest.id!, user.uid, reviewNote);
      }
      
      await loadRequests();
      closeReviewDialog();
      
    } catch (error) {
      console.error('Error reviewing request:', error);
      alert('เกิดข้อผิดพลาดในการดำเนินการ');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 sm:px-3 bg-yellow-100 text-yellow-800 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap">🕐 รอตรวจสอบ</span>;
      case 'approved':
        return <span className="px-2 py-1 sm:px-3 bg-green-100 text-green-800 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap">✅ อนุมัติ</span>;
      case 'rejected':
        return <span className="px-2 py-1 sm:px-3 bg-red-100 text-red-800 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap">❌ ปฏิเสธ</span>;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'รอตรวจสอบ';
      case 'approved': return 'อนุมัติแล้ว';
      case 'rejected': return 'ปฏิเสธแล้ว';
      default: return 'ทั้งหมด';
    }
  };

  const getOwnerName = (ownerId: string) => {
    const profile = ownerProfiles[ownerId];
    if (!profile) return 'Loading...';
    return profile.displayName || profile.email || ownerId;
  };

  const getOwnerEmail = (ownerId: string) => {
    const profile = ownerProfiles[ownerId];
    if (!profile) return '';
    return profile.email || '';
  };

  const getReviewerName = (reviewerId: string) => {
    const profile = ownerProfiles[reviewerId];
    if (!profile) return reviewerId;
    return profile.displayName || profile.email || reviewerId;
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff9800] mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดคำขอ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header & Stats */}
      <div>
        <div className="bg-gradient-to-r from-orange-500 via-[#ff9800] to-red-500 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 text-white relative overflow-hidden mb-4 sm:mb-6">
          <div className="absolute top-0 right-0 w-32 h-32 sm:w-64 sm:h-64 bg-white/10 rounded-full -mr-16 sm:-mr-32 -mt-16 sm:-mt-32"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-48 sm:h-48 bg-white/10 rounded-full -ml-12 sm:-ml-24 -mb-12 sm:-mb-24"></div>
          <div className="relative z-10">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2 drop-shadow-lg">📧 คำขอเปิดร้านใหม่</h2>
            <p className="text-white/90 text-sm sm:text-base lg:text-lg">จัดการคำขอเปิดร้านค้าใหม่จากผู้ใช้ที่ถูกระงับ</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Card className="p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-lg sm:text-xl lg:text-2xl">📊</span>
              </div>
              <div className="min-w-0">
                <div className="text-2xl sm:text-3xl font-bold text-gray-800">{requests.length}</div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium truncate">คำขอทั้งหมด</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-pulse flex-shrink-0">
                <span className="text-lg sm:text-xl lg:text-2xl">⏳</span>
              </div>
              <div className="min-w-0">
                <div className="text-2xl sm:text-3xl font-bold text-yellow-800">{pendingCount}</div>
                <div className="text-xs sm:text-sm text-yellow-700 font-medium truncate">รอตรวจสอบ</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-lg sm:text-xl lg:text-2xl">✅</span>
              </div>
              <div className="min-w-0">
                <div className="text-2xl sm:text-3xl font-bold text-green-800">{approvedCount}</div>
                <div className="text-xs sm:text-sm text-green-700 font-medium truncate">อนุมัติแล้ว</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-lg sm:text-xl lg:text-2xl">❌</span>
              </div>
              <div className="min-w-0">
                <div className="text-2xl sm:text-3xl font-bold text-red-800">{rejectedCount}</div>
                <div className="text-xs sm:text-sm text-red-700 font-medium truncate">ปฏิเสธแล้ว</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-3 sm:p-4 lg:p-6 border-2 border-gray-200">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-[#ff9800]" />
          <h3 className="text-base sm:text-lg font-bold text-gray-800">ตัวกรองและค้นหา</h3>
        </div>
        
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="ค้นหา ชื่อร้าน, เจ้าของร้าน, อีเมล..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 sm:pl-10 border-2 focus:border-[#ff9800] h-10 sm:h-11 text-sm sm:text-base"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <Button
              onClick={() => setStatusFilter('all')}
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              className={`whitespace-nowrap font-semibold transition-all text-xs sm:text-sm ${
                statusFilter === 'all' 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md' 
                  : 'hover:bg-blue-50 border-2'
              }`}
            >
              📊 ทั้งหมด ({requests.length})
            </Button>
            <Button
              onClick={() => setStatusFilter('pending')}
              variant={statusFilter === 'pending' ? 'default' : 'outline'}
              className={`whitespace-nowrap font-semibold transition-all text-xs sm:text-sm ${
                statusFilter === 'pending' 
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-md' 
                  : 'hover:bg-yellow-50 border-2'
              }`}
            >
              ⏳ รอตรวจสอบ ({pendingCount})
            </Button>
            <Button
              onClick={() => setStatusFilter('approved')}
              variant={statusFilter === 'approved' ? 'default' : 'outline'}
              className={`whitespace-nowrap font-semibold transition-all text-xs sm:text-sm ${
                statusFilter === 'approved' 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md' 
                  : 'hover:bg-green-50 border-2'
              }`}
            >
              ✅ อนุมัติ ({approvedCount})
            </Button>
            <Button
              onClick={() => setStatusFilter('rejected')}
              variant={statusFilter === 'rejected' ? 'default' : 'outline'}
              className={`whitespace-nowrap font-semibold transition-all text-xs sm:text-sm ${
                statusFilter === 'rejected' 
                  ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-md' 
                  : 'hover:bg-red-50 border-2'
              }`}
            >
              ❌ ปฏิเสธ ({rejectedCount})
            </Button>
          </div>
        </div>
        
        {/* Results Count */}
        {(searchQuery || statusFilter !== 'all') && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              แสดง <span className="font-bold text-[#ff9800]">{filteredRequests.length}</span> รายการ
              {searchQuery && ` จากการค้นหา "${searchQuery}"`}
              {statusFilter !== 'all' && ` (สถานะ: ${getStatusLabel(statusFilter)})`}
            </p>
          </div>
        )}
      </Card>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200">
          <div className="text-4xl sm:text-6xl mb-3 sm:mb-4 animate-bounce">📭</div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1 sm:mb-2">
            {requests.length === 0 ? 'ไม่มีคำขอเปิดร้านใหม่' : 'ไม่พบรายการที่ค้นหา'}
          </h3>
          <p className="text-gray-600 text-sm sm:text-base lg:text-lg">
            {requests.length === 0 
              ? 'เมื่อมีผู้ใช้ส่งคำขอเปิดร้านใหม่ จะแสดงที่นี่' 
              : 'ลองปรับเปลี่ยนตัวกรองหรือคำค้นหา'}
          </p>
        </Card>
      ) : (
        <>
          <div className="space-y-3 sm:space-y-4">
            {(() => {
              // Pagination calculations
              const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
              const startIndex = (currentPage - 1) * itemsPerPage;
              const endIndex = startIndex + itemsPerPage;
              const paginatedRequests = filteredRequests.slice(startIndex, endIndex);
              
              return (
                <>
                  {paginatedRequests.map((request) => (
            <Card 
              key={request.id} 
              className="p-3 sm:p-4 lg:p-5 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-[#ff9800] cursor-pointer"
              onClick={() => { setSelectedRequest(request); setShowDetailDialog(true); }}
            >
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                    <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 flex items-center gap-2">
                      <span>🏪</span>
                      <span className="truncate">{request.shopName}</span>
                    </h3>
                    {getStatusBadge(request.status)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                    <p className="flex items-center gap-2">
                      <span className="font-semibold text-gray-700 flex-shrink-0">👤 เจ้าของร้าน:</span>
                      <span className="font-medium text-[#ff9800] truncate">{getOwnerName(request.ownerId)}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="font-semibold text-gray-700 flex-shrink-0">📧 อีเมล:</span>
                      <span className="truncate">{request.ownerEmail || '-'}</span>
                    </p>
                    <p className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="flex-shrink-0">📅</span>
                      <span className="truncate">{request.createdAt.toDate().toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-col sm:items-end">
                  {request.status === 'pending' && (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        onClick={(e) => { e.stopPropagation(); openReviewDialog(request, 'approve'); }}
                        disabled={processing === request.id}
                        className="flex-1 sm:flex-none bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold shadow-md hover:shadow-lg transition-all text-xs sm:text-sm"
                        size="sm"
                      >
                        ✅ อนุมัติ
                      </Button>
                      <Button
                        onClick={(e) => { e.stopPropagation(); openReviewDialog(request, 'reject'); }}
                        disabled={processing === request.id}
                        className="flex-1 sm:flex-none bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold shadow-md hover:shadow-lg transition-all text-xs sm:text-sm"
                        size="sm"
                      >
                        ❌ ปฏิเสธ
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
          
          {/* Pagination */}
          {totalPages > 0 && (
            <Card className="p-4 border-2">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Page Info */}
                <div className="text-sm text-gray-600">
                  หน้า {currentPage} จาก {totalPages} (แสดง {paginatedRequests.length} จาก {filteredRequests.length} คำขอ)
                </div>

                {/* Pagination Buttons */}
                {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  {/* Previous Button */}
                  <Button
                    onClick={() => {
                      setCurrentPage(prev => Math.max(1, prev - 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
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
                              setCurrentPage(page);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
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
                        );
                      } else if (
                        page === currentPage - 2 ||
                        page === currentPage + 2
                      ) {
                        return (
                          <span key={page} className="px-2 text-gray-400">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>

                  {/* Next Button */}
                  <Button
                    onClick={() => {
                      setCurrentPage(prev => Math.min(totalPages, prev + 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
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
          )}
                </>
              );
            })()}
          </div>
        </>
      )}

      {/* Review Dialog */}
      {showReviewDialog && selectedRequest && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={closeReviewDialog}
        >
          <Card className="max-w-2xl w-full bg-white relative animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              onClick={closeReviewDialog}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
              disabled={processing === selectedRequest.id}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* Review Header */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900">
                {reviewAction === 'approve' ? '✅ อนุมัติคำขอ' : '❌ ปฏิเสธคำขอ'}
              </h3>
            </div>

            {/* Review Content */}
            <div className="p-6">
              {/* Shop Info Card */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  {shopData[selectedRequest.shopId] && shopData[selectedRequest.shopId].logoUrl ? (
                    <img 
                      src={shopData[selectedRequest.shopId].logoUrl} 
                      alt={selectedRequest.shopName}
                      className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center text-xl border border-gray-200">
                      🏪
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">{selectedRequest.shopName}</p>
                    <p className="text-sm text-gray-600">เจ้าของ: {getOwnerName(selectedRequest.ownerId)}</p>
                  </div>
                </div>
              </div>

              {/* Action Info */}
              {reviewAction === 'approve' ? (
                <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm font-semibold text-green-800 mb-3">การอนุมัติคำขอนี้จะทำให้:</p>
                  <ul className="space-y-2 text-sm text-green-700">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">•</span>
                      <span>ร้านค้าจะถูกยกเลิกการระงับและเปิดใช้งานได้ทันที</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">•</span>
                      <span>เจ้าของร้านจะสามารถเข้าใช้งาน Dashboard ได้</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">•</span>
                      <span>ร้านค้าจะแสดงในหน้าหลักอีกครั้ง</span>
                    </li>
                  </ul>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm font-semibold text-red-800 mb-3">การปฏิเสธคำขอนี้จะทำให้:</p>
                  <ul className="space-y-2 text-sm text-red-700">
                    <li className="flex items-start gap-2">
                      <span className="text-red-600">•</span>
                      <span>ร้านค้ายังคงถูกระงับอยู่</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600">•</span>
                      <span>เจ้าของร้านจะได้รับหมายเหตุจากคุณ</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600">•</span>
                      <span>เจ้าของร้านสามารถส่งคำขอใหม่ได้ในภายหลัง</span>
                    </li>
                  </ul>
                </div>
              )}

              {/* Note Input */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  หมายเหตุ {reviewAction === 'reject' && <span className="text-red-500">*</span>}
                </label>
                <Textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder={
                    reviewAction === 'approve'
                      ? 'หมายเหตุเพิ่มเติม (ถ้ามี)'
                      : 'กรุณาระบุเหตุผลในการปฏิเสธ'
                  }
                  className="min-h-[120px]"
                  required={reviewAction === 'reject'}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleReview}
                  disabled={processing === selectedRequest.id}
                  className={`flex-1 ${
                    reviewAction === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  } text-white`}
                >
                  {processing === selectedRequest.id 
                    ? '⏳ กำลังดำเนินการ...'
                    : reviewAction === 'approve' ? '✅ ยืนยันการอนุมัติ' : '❌ ยืนยันการปฏิเสธ'
                  }
                </Button>
                <Button
                  onClick={closeReviewDialog}
                  variant="outline"
                  disabled={processing === selectedRequest.id}
                >
                  ยกเลิก
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
      {/* Detail Dialog */}
      {showDetailDialog && selectedRequest && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => { setShowDetailDialog(false); setSelectedRequest(null); }}
        >
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-hidden bg-white relative animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              onClick={() => { setShowDetailDialog(false); setSelectedRequest(null); }}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700 z-10"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between pr-8">
                <div className="flex items-start gap-4 flex-1">
                  {/* Shop Logo */}
                  {shopData[selectedRequest.shopId] && shopData[selectedRequest.shopId].logoUrl ? (
                    <img 
                      src={shopData[selectedRequest.shopId].logoUrl} 
                      alt={selectedRequest.shopName}
                      className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-2xl border border-gray-200">
                      🏪
                    </div>
                  )}
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{selectedRequest.shopName}</h3>
                    <p className="text-sm text-gray-600 mt-1">เจ้าของ: {getOwnerName(selectedRequest.ownerId)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {getOwnerEmail(selectedRequest.ownerId)}
                    </p>
                  </div>
                </div>
                <div>{getStatusBadge(selectedRequest.status)}</div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto" style={{maxHeight: 'calc(90vh - 240px)'}}>
              <div className="space-y-6">
                {/* Reason Section */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">เหตุผลที่ต้องการเปิดร้านใหม่:</p>
                  <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-200">
                    {selectedRequest.reason}
                  </div>
                </div>

                {/* Explanation Section */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">คำอธิบายการแก้ไขปัญหา:</p>
                  <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-200">
                    {selectedRequest.explanation}
                  </div>
                </div>

                {/* Improvements Section */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">มาตรการป้องกันไม่ให้เกิดปัญหาซ้ำ:</p>
                  <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-200">
                    {selectedRequest.improvements}
                  </div>
                </div>

                {/* Documents Section */}
                {selectedRequest.documentUrls && selectedRequest.documentUrls.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">เอกสารประกอบ:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedRequest.documentUrls.map((url, index) => (
                        <a 
                          key={index} 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="px-4 py-2 bg-[#ff9800] hover:bg-[#f57c00] text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          📄 เอกสาร {index + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Review Info Section */}
                {selectedRequest.status !== 'pending' && selectedRequest.reviewedBy && (
                  <div className={`p-4 rounded-lg border ${
                    selectedRequest.status === 'approved' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <p className="text-sm font-semibold mb-1">
                      {selectedRequest.status === 'approved' ? '✅ อนุมัติโดย' : '❌ ปฏิเสธโดย'}: {getReviewerName(selectedRequest.reviewedBy)}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      เมื่อ: {selectedRequest.reviewedAt?.toDate().toLocaleDateString('th-TH', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                    {selectedRequest.reviewNote && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-sm font-semibold text-gray-700 mb-1">หมายเหตุ:</p>
                        <p className="text-sm text-gray-700">{selectedRequest.reviewNote}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-gray-200 flex gap-3">
              {selectedRequest.status === 'pending' && (
                <>
                  <Button 
                    onClick={() => { 
                      setReviewAction('approve'); 
                      setShowDetailDialog(false);
                      setShowReviewDialog(true); 
                    }} 
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    ✅ อนุมัติคำขอ
                  </Button>
                  <Button 
                    onClick={() => { 
                      setReviewAction('reject'); 
                      setShowDetailDialog(false);
                      setShowReviewDialog(true); 
                    }} 
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    ❌ ปฏิเสธคำขอ
                  </Button>
                </>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

