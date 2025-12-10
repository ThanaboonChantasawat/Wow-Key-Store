"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LoadingScreen, Loading } from "@/components/ui/loading";
import { useAuth } from "@/components/auth-context";
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Store,
  X,
  MessageCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OrderChatDialog } from "@/components/order/order-chat-dialog";

// Helper function to ensure minimum loading time for better UX
const withMinimumLoadingTime = async <T,>(
  promiseOrFunction: Promise<T> | (() => Promise<T>),
  minimumMs: number = 500
): Promise<T> => {
  const start = Date.now();
  const promise =
    typeof promiseOrFunction === "function"
      ? promiseOrFunction()
      : promiseOrFunction;
  const result = await promise;
  const elapsed = Date.now() - start;
  const remaining = minimumMs - elapsed;

  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }

  return result;
};

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface DeliveredItem {
  index: number;
  itemName: string;
  email?: string;
  username?: string;
  password?: string;
  additionalInfo?: string;
}

interface Order {
  id: string;
  userId: string;
  shopId: string;
  shopName: string;
  items: OrderItem[];
  totalAmount: number;
  platformFee: number;
  sellerAmount: number;
  status: "pending" | "processing" | "completed" | "cancelled";
  paymentStatus: string;
  paymentIntentId: string;
  transferId?: string;
  email?: string;
  username?: string;
  password?: string;
  additionalInfo?: string;
  sellerNotes?: string;
  createdAt: string;
  updatedAt: string;
  gameCodeDeliveredAt?: string;
  deliveredItems?: DeliveredItem[];
}

export function SellerUpdateOrders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingShop, setLoadingShop] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatOrder, setChatOrder] = useState<Order | null>(null);

  useEffect(() => {
    const chatOrderId = searchParams.get('chatOrderId');
    if (chatOrderId && orders.length > 0) {
      const order = orders.find(o => o.id === chatOrderId);
      if (order) {
        setChatOrder(order);
        setIsChatOpen(true);
        
        // Clear the query param to prevent reopening on refresh
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('chatOrderId');
        window.history.replaceState({}, '', newUrl.toString());
      }
    }
  }, [orders, searchParams]);

  // Form states for game account info
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [notes, setNotes] = useState("");
  const [deliveredItems, setDeliveredItems] = useState<DeliveredItem[]>([]);

  const [updating, setUpdating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | undefined>(undefined);
  const itemsPerPage = 5;

  // Fetch seller's shop ID first
  const [shopId, setShopId] = useState<string | null>(null);

  // Load active tab from sessionStorage on mount
  useEffect(() => {
    const savedTab = sessionStorage.getItem('sellerOrdersActiveTab')
    if (savedTab) {
      setActiveTab(savedTab)
      sessionStorage.removeItem('sellerOrdersActiveTab') // Clear after using
    }
  }, [])

  useEffect(() => {
    const fetchShopId = async () => {
      if (!user?.uid) {
        setLoadingShop(false);
        return;
      }

      try {
        console.log("Fetching shop for user:", user.uid);
        await withMinimumLoadingTime(async () => {
          const response = await fetch(`/api/shops/user?userId=${user.uid}`);
          const data = await response.json();

          console.log("Shop data response:", data);

          if (data.success && data.shop) {
            setShopId(data.shop.id);
            console.log("Shop ID set:", data.shop.id);
          } else {
            console.log("No shop found for user");
          }
        });
      } catch (error) {
        console.error("Error fetching shop:", error);
      } finally {
        setLoadingShop(false);
      }
    };

    fetchShopId();
  }, [user]);

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      if (!shopId) {
        setLoadingOrders(false);
        return;
      }

      setLoadingOrders(true);
      try {
        await withMinimumLoadingTime(async () => {
          const statusParam = activeTab === "all" ? "all" : activeTab;
          const response = await fetch(
            `/api/orders/seller?shopId=${shopId}&status=${statusParam}`
          );
          const data = await response.json();

          if (data.success) {
            setOrders(data.orders);
          } else {
            toast({
              title: "เกิดข้อผิดพลาด",
              description: "ไม่สามารถโหลดคำสั่งซื้อได้",
              variant: "destructive",
            });
          }
        });
      } catch (error) {
        console.error("Error fetching orders:", error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
          variant: "destructive",
        });
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchOrders();
  }, [shopId, activeTab]);

  const handleOpenChat = (order: Order) => {
    setChatOrder(order);
    setIsChatOpen(true);
  };

  const handleOpenDialog = (order: Order) => {
    setSelectedOrder(order);
    setEmail("");
    setUsername("");
    setPassword(order.password || "");
    setAdditionalInfo(order.additionalInfo || "");
    setNotes(order.sellerNotes || "");

    // Initialize deliveredItems
    if (order.deliveredItems && order.deliveredItems.length > 0) {
      setDeliveredItems(order.deliveredItems);
    } else {
      // Create empty items based on order items and quantity
      const items: DeliveredItem[] = [];
      let currentIndex = 0;
      order.items.forEach(item => {
        const qty = item.quantity || 1;
        for (let i = 0; i < qty; i++) {
          items.push({
            index: currentIndex++,
            itemName: `${item.name} #${i + 1}`,
            email: "",
            username: "",
            password: "",
            additionalInfo: ""
          });
        }
      });
      
      // If legacy data exists, populate the first item
      if (items.length > 0 && (order.email || order.username || order.password)) {
        items[0].email = order.email;
        items[0].username = order.username;
        items[0].password = order.password;
        items[0].additionalInfo = order.additionalInfo;
      }
      
      setDeliveredItems(items);
    }

    setIsDialogOpen(true);
  };

  const handleShowConfirmDialog = (newStatus?: string) => {
    setPendingStatus(newStatus);
    setShowConfirmDialog(true);
  };

  const handleConfirmUpdate = () => {
    setShowConfirmDialog(false);
    handleUpdateOrder(pendingStatus);
  };

  const handleUpdateOrder = async (newStatus?: string) => {
    if (!selectedOrder) return;

    setUpdating(true);
    try {
      // ถ้ามีการส่งรหัส (email หรือ password) ให้เปลี่ยนสถานะเป็น completed ทันที
      // เพื่อป้องกันการยกเลิก แต่ยังรอลูกค้ายืนยัน (buyerConfirmed: false)
      const hasCodes = deliveredItems.some(item => item.email || item.password || item.username) || email.trim() || password.trim();
      const finalStatus = hasCodes ? "completed" : (newStatus || selectedOrder.status);

      const response = await fetch(`/api/orders/${selectedOrder.id}/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: finalStatus,
          // Legacy fields for backward compatibility (use first item or global inputs)
          email: deliveredItems[0]?.email || email.trim() || undefined,
          username: deliveredItems[0]?.username || username.trim() || undefined,
          password: deliveredItems[0]?.password || password.trim() || undefined,
          additionalInfo: deliveredItems[0]?.additionalInfo || additionalInfo.trim() || undefined,
          
          notes: notes.trim() || undefined,
          deliveredItems: deliveredItems // Send the full list
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "อัพเดตสำเร็จ",
          description: "อัพเดตคำสั่งซื้อเรียบร้อยแล้ว",
        });

        // Refresh orders list
        const statusParam = activeTab === "all" ? "all" : activeTab;
        const ordersResponse = await fetch(
          `/api/orders/seller?shopId=${shopId}&status=${statusParam}`
        );
        const ordersData = await ordersResponse.json();
        if (ordersData.success) {
          setOrders(ordersData.orders);
        }

        setIsDialogOpen(false);
        setSelectedOrder(null);
        setEmail("");
        setUsername("");
        setPassword("");
        setAdditionalInfo("");
        setNotes("");
      } else {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: data.error || "ไม่สามารถอัพเดตคำสั่งซื้อได้",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating order:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="border-yellow-500 text-yellow-700 bg-yellow-50"
          >
            <AlertCircle className="w-3 h-3 mr-1" />
            รอดำเนินการ
          </Badge>
        );
      case "processing":
        return (
          <Badge
            variant="outline"
            className="border-blue-500 text-blue-700 bg-blue-50"
          >
            <Clock className="w-3 h-3 mr-1" />
            กำลังดำเนินการ
          </Badge>
        );
      case "completed":
        return (
          <Badge
            variant="outline"
            className="border-green-500 text-green-700 bg-green-50"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            เสร็จสมบูรณ์
          </Badge>
        );
      case "cancelled":
        return (
          <Badge
            variant="outline"
            className="border-red-500 text-red-700 bg-red-50"
          >
            <XCircle className="w-3 h-3 mr-1" />
            ยกเลิก
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Pagination
  const totalPages = Math.ceil(orders.length / itemsPerPage);
  const paginatedOrders = orders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-center text-gray-500">กรุณาเข้าสู่ระบบ</p>
      </div>
    );
  }

  // Show loading while checking for shop
  if (loadingShop) {
    return <LoadingScreen text="กำลังโหลดข้อมูลร้านค้า..." />;
  }

  // Show "no shop" message only after loading is complete
  if (!shopId) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center py-12">
          <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            ยังไม่มีร้านค้า
          </h3>
          <p className="text-gray-600 mb-6">
            คุณต้องสร้างร้านค้าก่อนจึงจะสามารถจัดการคำสั่งซื้อได้
          </p>
          <Button
            onClick={() => (window.location.href = "/seller")}
            className="bg-[#ff9800] hover:bg-[#ff9800]/90"
          >
            สร้างร้านค้า
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-4 md:p-6 border-b border-[#d9d9d9]">
          <h2 className="text-xl md:text-2xl font-bold text-[#292d32] mb-4 md:mb-6">
            อัพเดทสถานะสินค้า
          </h2>
          <div className="grid grid-cols-2 md:flex gap-2 md:gap-3">
            <Button
              onClick={() => {
                setActiveTab("all");
                setCurrentPage(1);
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
                setActiveTab("pending");
                setCurrentPage(1);
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
                setActiveTab("processing");
                setCurrentPage(1);
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
                setActiveTab("completed");
                setCurrentPage(1);
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
              <p className="text-sm md:text-base text-gray-500">
                ไม่มีคำสั่งซื้อ
              </p>
            </div>
          ) : (
            paginatedOrders.map((order) => (
              <div
                key={order.id}
                className="border border-[#d9d9d9] rounded-lg p-4 md:p-6"
              >
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
                      <p>
                        ยอดรวม: ฿
                        {(Number(order.totalAmount) || 0).toLocaleString()}
                      </p>
                      <p>
                        ยอดที่ได้รับ: ฿
                        {(Number(order.sellerAmount) || 0).toLocaleString()}
                      </p>
                      {(order.email || order.password) && (
                        <p className="text-green-600 font-medium">
                          ✓ ส่งข้อมูลบัญชีแล้ว (ไม่สามารถยกเลิกได้)
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleOpenChat(order)}
                      className="border-blue-300 text-blue-600 hover:bg-blue-50"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      แชท
                    </Button>
                    <Button
                      onClick={() => handleOpenDialog(order)}
                      className="bg-[#ff9800] hover:bg-[#ff9800]/90 text-white"
                    >
                      จัดการ
                    </Button>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    รายการสินค้า:
                  </p>
                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between text-sm text-gray-600 py-1"
                    >
                      <span>
                        {item.name} x{item.quantity || 1}
                      </span>
                      <span>
                        ฿
                        {(
                          (Number(item.price) || 0) *
                          (Number(item.quantity) || 1)
                        ).toLocaleString()}
                      </span>
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
              หน้า {currentPage} จาก {totalPages} (ทั้งหมด {orders.length}{" "}
              รายการ)
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
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="icon"
                    onClick={() => setCurrentPage(pageNum)}
                    className={
                      currentPage === pageNum
                        ? "bg-[#ff9800] hover:bg-[#ff9800]/90"
                        : ""
                    }
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
              >
                →
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Update Order Dialog */}
      {isDialogOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60"
          onClick={() => setIsDialogOpen(false)}
        >
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div
                className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl transform transition-all"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10 rounded-t-lg">
                  <div>
                    <h3 className="text-lg font-semibold">
                      จัดการคำสั่งซื้อ #
                      {selectedOrder?.id.slice(-8).toUpperCase()}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      กรอกข้อมูลบัญชีเกมเพื่อส่งให้ลูกค้า
                    </p>
                  </div>
                  <button
                    onClick={() => setIsDialogOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                    type="button"
                    disabled={updating}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="max-h-[70vh] overflow-y-auto">
                  <div className="p-6 space-y-6">
                    {selectedOrder && (
                      <>
                        {/* Order Info */}
                        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                          {(selectedOrder.email || selectedOrder.password) && (
                            <div className="bg-green-50 border border-green-200 p-3 rounded-lg mb-3">
                              <p className="text-green-800 text-sm font-medium">
                                {selectedOrder.buyerConfirmed 
                                  ? "✓ คำสั่งซื้อนี้ส่งรหัสและลูกค้ายืนยันแล้ว (สถานะเสร็จสมบูรณ์)"
                                  : "⏳ ส่งรหัสให้ลูกค้าแล้ว (รอลูกค้ายืนยัน)"}
                              </p>
                            </div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              วันที่สั่งซื้อ:
                            </span>
                            <span className="font-medium">
                              {formatDate(selectedOrder.createdAt)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">ยอดรวม:</span>
                            <span className="font-medium">
                              ฿
                              {(
                                Number(selectedOrder.totalAmount) || 0
                              ).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">ยอดที่ได้รับ:</span>
                            <span className="font-medium text-green-600">
                              ฿
                              {(
                                Number(selectedOrder.sellerAmount) || 0
                              ).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              สถานะปัจจุบัน:
                            </span>
                            <span>{getStatusBadge(selectedOrder.status)}</span>
                          </div>
                        </div>

                        {/* Items List */}
                        <div>
                          <Label className="text-base font-semibold mb-2 block">
                            รายการสินค้า
                          </Label>
                          <div className="border rounded-lg divide-y">
                            {selectedOrder.items.map((item, idx) => (
                              <div
                                key={idx}
                                className="p-3 flex justify-between items-center"
                              >
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  <p className="text-sm text-gray-500">
                                    จำนวน: {item.quantity || 1}
                                  </p>
                                </div>
                                <p className="font-semibold">
                                  ฿
                                  {(
                                    (Number(item.price) || 0) *
                                    (Number(item.quantity) || 1)
                                  ).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Delivered Items Inputs */}
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">
                              ข้อมูลบัญชีที่จัดส่ง ({deliveredItems.length} รายการ)
                            </Label>
                            <p className="text-sm text-orange-600">
                              ⚠️ สำคัญ! โปรดปิด 2FA(การยืนยันตัวตน 2 ชั้น) ด้วยหากมี
                            </p>
                          </div>
                          
                          {deliveredItems.map((item, index) => (
                            <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative">
                              <div className="absolute top-4 right-4 bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full font-medium">
                                รายการที่ {index + 1}
                              </div>
                              <h4 className="font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200 pr-20">
                                {item.itemName}
                              </h4>
                              
                              <div className="space-y-4">
                                {/* Email/Username Input */}
                                <div>
                                  <Label
                                    htmlFor={`email-${index}`}
                                    className="text-sm font-medium mb-1.5 flex items-center gap-2"
                                  >
                                    Email หรือ Username
                                    <span className="text-red-500">*</span>
                                  </Label>
                                  <Input
                                    id={`email-${index}`}
                                    value={item.email || item.username || ""}
                                    onChange={(e) => {
                                      const newItems = [...deliveredItems];
                                      newItems[index] = { ...newItems[index], email: e.target.value, username: e.target.value };
                                      setDeliveredItems(newItems);
                                      
                                      // Sync with legacy state for first item
                                      if (index === 0) {
                                        setEmail(e.target.value);
                                        setUsername(e.target.value);
                                      }
                                    }}
                                    placeholder="example@gmail.com หรือ username"
                                    className="font-mono bg-white"
                                    disabled={updating}
                                  />
                                </div>

                                {/* Password Input */}
                                <div>
                                  <Label
                                    htmlFor={`password-${index}`}
                                    className="text-sm font-medium mb-1.5 flex items-center gap-2"
                                  >
                                    Password
                                    <span className="text-red-500">*</span>
                                  </Label>
                                  <Input
                                    id={`password-${index}`}
                                    type="text"
                                    value={item.password || ""}
                                    onChange={(e) => {
                                      const newItems = [...deliveredItems];
                                      newItems[index] = { ...newItems[index], password: e.target.value };
                                      setDeliveredItems(newItems);
                                      
                                      // Sync with legacy state for first item
                                      if (index === 0) {
                                        setPassword(e.target.value);
                                      }
                                    }}
                                    placeholder="รหัสผ่านสำหรับเข้าเกม"
                                    className="font-mono bg-white"
                                    disabled={updating}
                                  />
                                </div>

                                {/* Additional Info Input */}
                                <div>
                                  <Label
                                    htmlFor={`additionalInfo-${index}`}
                                    className="text-sm font-medium mb-1.5 block"
                                  >
                                    ข้อมูลเพิ่มเติม <span className="text-gray-400 font-normal">(ถ้ามี)</span>
                                  </Label>
                                  <Input
                                    id={`additionalInfo-${index}`}
                                    value={item.additionalInfo || ""}
                                    onChange={(e) => {
                                      const newItems = [...deliveredItems];
                                      newItems[index] = { ...newItems[index], additionalInfo: e.target.value };
                                      setDeliveredItems(newItems);
                                      
                                      // Sync with legacy state for first item
                                      if (index === 0) {
                                        setAdditionalInfo(e.target.value);
                                      }
                                    }}
                                    placeholder="ข้อมูลเพิ่มเติม เช่น Server, Level"
                                    className="bg-white"
                                    disabled={updating}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {selectedOrder.gameCodeDeliveredAt && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <p className="text-sm text-green-700">
                              ✓ ส่งข้อมูลบัญชีเมื่อ:{" "}
                              {formatDate(selectedOrder.gameCodeDeliveredAt)}
                            </p>
                          </div>
                        )}

                        {/* Notes */}
                        <div>
                          <Label
                            htmlFor="notes"
                            className="text-base font-semibold mb-2 block"
                          >
                            หมายเหตุสำหรับลูกค้า
                          </Label>
                          <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="ข้อความเพิ่มเติมหรือคำแนะนำพิเศษ"
                            rows={3}
                            disabled={updating}
                          />
                        </div>

                        {/* Footer */}
                        <div className="flex gap-4 pt-4 border-t">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                            disabled={updating}
                            className="flex-1"
                          >
                            ยกเลิก
                          </Button>
                          <Button
                            type="button"
                            onClick={() =>
                              handleShowConfirmDialog(
                                selectedOrder?.status || "pending"
                              )
                            }
                            disabled={
                              updating || 
                              !email.trim() || 
                              !password.trim()
                            }
                            className="flex-1 bg-gradient-to-r from-[#ff9800] to-[#f57c00] hover:from-[#e08800] hover:to-[#d56600] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {updating ? "กำลังส่ง..." : "ส่งรหัส"}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-900">
              ยืนยันการส่งรหัส
            </h3>
            <div className="space-y-3 text-sm">
              <p className="text-gray-700">
                คุณต้องการส่งข้อมูลรหัสเกมไปยังลูกค้าใช่หรือไม่?
              </p>
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                <p className="text-yellow-800 text-xs font-medium">
                  ⚠️ เมื่อส่งรหัสแล้ว รอลูกค้ายืนยันการรับสินค้า จึงจะได้รับเงิน (ไม่สามารถยกเลิกได้)
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 max-h-60 overflow-y-auto">
                <p className="font-semibold text-gray-900 mb-2">รายการที่จัดส่ง ({deliveredItems.length}):</p>
                {deliveredItems.map((item, idx) => (
                  <div key={idx} className="border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                    <p className="font-medium text-xs text-gray-500">{item.itemName}</p>
                    {(item.email || item.username) && (
                      <div className="text-xs truncate">
                        <span className="text-gray-600">ID:</span> {item.email || item.username}
                      </div>
                    )}
                    {item.password && (
                      <div className="text-xs truncate">
                        <span className="text-gray-600">Pass:</span> {item.password}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-orange-600 font-medium">
                ⚠️ ข้อมูลจะถูกส่งให้ลูกค้าทันที
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1"
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                onClick={handleConfirmUpdate}
                className="flex-1 bg-gradient-to-r from-[#ff9800] to-[#f57c00] hover:from-[#e08800] hover:to-[#d56600] text-white"
              >
                ยืนยันส่งรหัส
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Dialog */}
      {chatOrder && (
        <OrderChatDialog
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          orderId={chatOrder.id}
          orderNumber={chatOrder.id.slice(-8).toUpperCase()}
          userRole="seller"
        />
      )}
    </>
  );
}
