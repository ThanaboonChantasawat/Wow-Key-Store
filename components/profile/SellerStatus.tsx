"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-context";
import { getShopByOwnerId, type Shop } from "@/lib/shop-client";
import { 
  Store, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Ban, 
  AlertCircle,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function SellerStatusContent() {
  const { user, isInitialized } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasShop, setHasShop] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadShop = async () => {
      if (!user) {
        setLoading(false);
        setHasShop(false);
        return;
      }

      try {
        // First check if user has a shopId in their profile to avoid unnecessary API call
        const userProfileRes = await fetch(`/api/users/${user.uid}`);
        if (userProfileRes.ok) {
          const userProfile = await userProfileRes.json();
          if (!userProfile.shopId) {
            // User doesn't have a shop - no need to call shop API
            setHasShop(false);
            setShop(null);
            setLoading(false);
            return;
          }
          setHasShop(true);
        }

        // User has a shop, fetch the details
        const shopData = await getShopByOwnerId(user.uid);
        setShop(shopData);
        setHasShop(shopData !== null);
      } catch (error) {
        console.error("Error loading shop:", error);
        setShop(null);
        setHasShop(false);
      } finally {
        setLoading(false);
      }
    };

    if (isInitialized) {
      loadShop();
    }
  }, [user, isInitialized]);

  // Loading state
  if (!isInitialized || loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Not logged in - แสดงเฉพาะเมื่อ initialized แล้วและไม่มี user
  if (isInitialized && !user) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-10 h-10 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-[#292d32] mb-2">กรุณาเข้าสู่ระบบ</h2>
        <p className="text-gray-600">คุณต้องเข้าสู่ระบบเพื่อดูสถานะร้านค้า</p>
      </div>
    );
  }

  // No shop
  if (!shop) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Store className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-[#292d32] mb-2">ยังไม่มีร้านค้า</h2>
        <p className="text-gray-600 mb-6">คุณยังไม่ได้สร้างร้านค้า</p>
        <Button
          onClick={() => router.push("/seller")}
          className="bg-gradient-to-r from-[#ff9800] to-[#f57c00] hover:from-[#e08800] hover:to-[#d56600] text-white"
        >
          สร้างร้านค้า
        </Button>
      </div>
    );
  }

  // Get status info
  const getStatusInfo = () => {
    switch (shop.status) {
      case "pending":
        return {
          icon: <Clock className="w-10 h-10 text-white" />,
          bgColor: "from-yellow-400 to-yellow-500",
          title: "กำลังรอการตรวจสอบ",
          description: "ร้านค้าของคุณกำลังรอ Admin ตรวจสอบและอนุมัติ",
          color: "yellow",
        };
      case "active":
        return {
          icon: <CheckCircle2 className="w-10 h-10 text-white" />,
          bgColor: "from-green-500 to-green-600",
          title: "ร้านค้าเปิดใช้งาน",
          description: "ร้านค้าของคุณผ่านการตรวจสอบและเปิดใช้งานแล้ว",
          color: "green",
        };
      case "rejected":
        return {
          icon: <XCircle className="w-10 h-10 text-white" />,
          bgColor: "from-red-500 to-red-600",
          title: "ไม่ผ่านการตรวจสอบ",
          description: "ร้านค้าของคุณไม่ผ่านการตรวจสอบจาก Admin",
          color: "red",
        };
      case "suspended":
        return {
          icon: <Ban className="w-10 h-10 text-white" />,
          bgColor: "from-orange-500 to-orange-600",
          title: "ร้านค้าถูกระงับ",
          description: "ร้านค้าของคุณถูกระงับการใช้งานชั่วคราว",
          color: "orange",
        };
      default:
        return {
          icon: <Store className="w-10 h-10 text-white" />,
          bgColor: "from-gray-400 to-gray-500",
          title: "สถานะไม่ทราบ",
          description: "ไม่สามารถระบุสถานะร้านค้าได้",
          color: "gray",
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-[#ff9800] to-[#f57c00] rounded-lg flex items-center justify-center">
            <Store className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-[#292d32]">สถานะร้านค้า</h2>
        </div>

        {/* Status Badge */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 mb-6">
          <div className="flex items-center gap-6">
            <div className={`w-20 h-20 bg-gradient-to-br ${statusInfo.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
              {statusInfo.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-[#292d32] mb-2">
                {statusInfo.title}
              </h3>
              <p className="text-gray-600 text-lg">{statusInfo.description}</p>
            </div>
          </div>
        </div>

        {/* Shop Details */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-3">
                <Store className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-600 font-medium">ชื่อร้านค้า</p>
                  <p className="text-lg font-bold text-blue-900">{shop.shopName}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-purple-600 font-medium">วันที่สร้าง</p>
                  <p className="text-lg font-bold text-purple-900">
                    {new Date(shop.createdAt).toLocaleDateString("th-TH")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Suspended Details */}
      {shop.status === "suspended" && shop.suspensionReason && (
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-orange-900 mb-3">
                  🚫 เหตุผลในการระงับร้านค้า
                </h3>
                <div className="bg-white rounded-lg p-4 mb-4">
                  <p className="text-orange-800 text-lg leading-relaxed">
                    {shop.suspensionReason}
                  </p>
                </div>
                {shop.suspendedAt && (
                  <div className="flex items-center gap-2 text-orange-600">
                    <Calendar className="w-4 h-4" />
                    <p className="text-sm font-medium">
                      ระงับเมื่อ: {new Date(shop.suspendedAt).toLocaleDateString("th-TH")}{" "}
                      {new Date(shop.suspendedAt).toLocaleTimeString("th-TH")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="mt-6 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6">
            <h4 className="font-bold text-blue-900 mb-3 text-lg flex items-center gap-2">
              💡 แนะนำ
            </h4>
            <ul className="space-y-2 text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>ตรวจสอบเหตุผลในการระงับอย่างละเอียด</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>ติดต่อ Admin เพื่อสอบถามรายละเอียดเพิ่มเติม</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>แก้ไขปัญหาที่เกิดขึ้นตามที่ระบุ</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>รอการพิจารณาจาก Admin หรือติดต่อเพื่อขอเปิดร้านใหม่</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Rejected Details */}
      {shop.status === "rejected" && shop.rejectionReason && (
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-red-900 mb-3">
                  ❌ เหตุผลในการปฏิเสธ
                </h3>
                <div className="bg-white rounded-lg p-4 mb-4">
                  <p className="text-red-800 text-lg leading-relaxed">
                    {shop.rejectionReason}
                  </p>
                </div>
                {shop.verifiedAt && (
                  <div className="flex items-center gap-2 text-red-600">
                    <Calendar className="w-4 h-4" />
                    <p className="text-sm font-medium">
                      ปฏิเสธเมื่อ: {new Date(shop.verifiedAt).toLocaleDateString("th-TH")}{" "}
                      {new Date(shop.verifiedAt).toLocaleTimeString("th-TH")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button
              onClick={() => router.push("/seller")}
              className="bg-gradient-to-r from-[#ff9800] to-[#f57c00] hover:from-[#e08800] hover:to-[#d56600] text-white"
            >
              แก้ไขและส่งใหม่
            </Button>
          </div>
        </div>
      )}

      {/* Pending Info */}
      {shop.status === "pending" && (
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-yellow-900 mb-3">
                  ⏳ กำลังรอการตรวจสอบ
                </h3>
                <p className="text-yellow-800 mb-4">
                  Admin จะทำการตรวจสอบและอนุมัติภายใน 24-48 ชั่วโมง
                </p>
                <p className="text-sm text-yellow-700">
                  📧 คุณจะได้รับการแจ้งเตือนผ่านอีเมลเมื่อร้านค้าได้รับการอนุมัติ
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Shop Actions */}
      {shop.status === "active" && (
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-green-900 mb-1">
                    ✅ ร้านค้าพร้อมใช้งาน
                  </h3>
                  <p className="text-green-700">คุณสามารถเข้าสู่ Dashboard เพื่อจัดการร้านค้าได้</p>
                </div>
              </div>
              <Button
                onClick={() => router.push("/seller")}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
              >
                เข้าสู่ Dashboard
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
