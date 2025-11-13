"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { getShopByOwnerId, type Shop } from "@/lib/shop-client";
import {
  createReopenRequest,
  hasPendingReopenRequest,
  getReopenRequestsByShopId,
} from "@/lib/reopen-request-service";
import type { ReopenRequest } from "@/lib/reopen-request-service";
import { Store } from "lucide-react";

export default function ReopenShopForm() {
  const { user, loading: authLoading, isInitialized } = useAuth();
  const router = useRouter();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [existingRequests, setExistingRequests] = useState<ReopenRequest[]>([]);

  // Form data
  const [reason, setReason] = useState("");
  const [explanation, setExplanation] = useState("");
  const [improvements, setImprovements] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    console.log("=== ReopenShopForm useEffect ===");
    console.log("authLoading:", authLoading);
    console.log("isInitialized:", isInitialized);
    console.log("user:", user);

    // รอให้ auth initialize ก่อน
    if (!isInitialized) {
      console.log("Auth not initialized yet, waiting...");
      return;
    }

    if (!user) {
      console.log("No user found after initialization, redirecting to home...");
      router.push("/");
    } else {
      console.log("User found:", user.uid, user.email);
      setContactEmail(user.email || "");
      loadShopData();
    }
  }, [user, isInitialized, router]);

  const loadShopData = async () => {
    console.log("=== loadShopData called ===");
    if (!user) {
      console.log("No user in loadShopData");
      setLoading(false);
      return;
    }

    console.log("Loading shop for user:", user.uid);
    setLoading(true);
    try {
      const shopData = await getShopByOwnerId(user.uid);
      console.log("Shop data loaded:", shopData);
      console.log("Shop status:", shopData?.status);
      setShop(shopData);

      if (shopData && shopData.shopId) {
        // ตรวจสอบว่ามีคำขอที่รออนุมัติหรือไม่
        const pending = await hasPendingReopenRequest(shopData.shopId);
        setHasPendingRequest(pending);

        // ดึงประวัติคำขอทั้งหมด
        const requests = await getReopenRequestsByShopId(shopData.shopId);
        setExistingRequests(requests);
      }
    } catch (error) {
      console.error("Error loading shop:", error);
      setError("เกิดข้อผิดพลาดในการโหลดข้อมูลร้านค้า");
    } finally {
      setLoading(false);
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files);

      // จำกัดจำนวนไฟล์ไม่เกิน 5 ไฟล์
      if (fileList.length > 5) {
        setError("สามารถอัปโหลดได้สูงสุด 5 ไฟล์");
        return;
      }

      // จำกัดขนาดไฟล์ไม่เกิน 5MB ต่อไฟล์
      const oversizedFiles = fileList.filter(
        (file) => file.size > 5 * 1024 * 1024
      );
      if (oversizedFiles.length > 0) {
        setError("ขนาดไฟล์ต้องไม่เกิน 5MB ต่อไฟล์");
        return;
      }

      setFiles(fileList);
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !shop) return;

    // ตรวจสอบข้อมูล
    if (!reason.trim() || !explanation.trim() || !improvements.trim()) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    if (hasPendingRequest) {
      setError("คุณมีคำขอที่รออนุมัติอยู่แล้ว");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await createReopenRequest(
        {
          shopId: shop.shopId,
          shopName: shop.shopName,
          ownerId: user.uid,
          ownerEmail: user.email || "",
          ownerName: user.displayName || user.email || "Unknown",
          reason,
          explanation,
          improvements,
          contactPhone,
          contactEmail,
        },
        files
      );

      setSuccess(true);

      // รีเซ็ตฟอร์ม
      setReason("");
      setExplanation("");
      setImprovements("");
      setContactPhone("");
      setFiles([]);

      // รีโหลดข้อมูล
      await loadShopData();

      // ซ่อนข้อความสำเร็จหลัง 5 วินาที
      setTimeout(() => setSuccess(false), 5000);
    } catch (error) {
      console.error("Error submitting reopen request:", error);
      setError("เกิดข้อผิดพลาดในการส่งคำขอ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
            🕐 รอตรวจสอบ
          </span>
        );
      case "approved":
        return (
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            ✅ อนุมัติ
          </span>
        );
      case "rejected":
        return (
          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
            ❌ ปฏิเสธ
          </span>
        );
      default:
        return null;
    }
  };

  // Show loading while auth is initializing or data is loading
  if (!isInitialized || authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff9800] mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  // Redirect will happen in useEffect if no user
  if (!user) {
    return null;
  }

  // Redirect will happen in useEffect if no user
  if (!user) {
    return null;
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="text-6xl mb-4">🏪</div>
          <h2 className="text-2xl font-bold mb-2">ไม่พบร้านค้า</h2>
          <p className="text-gray-600 mb-6">
            คุณยังไม่มีร้านค้าในระบบ กรุณาสร้างร้านค้าก่อน
          </p>
          <Button onClick={() => router.push("/seller")}>กลับหน้าผู้ขาย</Button>
        </Card>
      </div>
    );
  }

  if (shop.status !== "suspended") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold mb-2">
            ร้านค้าของคุณใช้งานได้ปกติ
          </h2>
          <p className="text-gray-600 mb-6">ร้านค้าของคุณไม่ได้ถูกระงับ</p>
          <Button onClick={() => router.push("/seller")}>
            ไปหน้า Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#ff9800] to-[#f57c00] bg-clip-text text-transparent mb-2">
            ขอเปิดร้านใหม่
          </h1>
          <p className="text-gray-600">
            กรอกข้อมูลเพื่อขอให้ Admin ตรวจสอบและพิจารณาเปิดร้านค้าของคุณใหม่
          </p>
        </div>

        {/* Shop Info */}
        <Card className="p-6 mb-6 bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
              {shop.logoUrl ? (
                <img
                  src={shop.logoUrl}
                  alt={shop.shopName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Store className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-xl text-gray-800">
                {shop.shopName}
              </h3>
              <p className="text-sm text-gray-600">
                สถานะ:{" "}
                <span className="font-semibold text-red-600">
                  ระงับการใช้งาน
                </span>
              </p>
            </div>
          </div>

          {shop.suspensionReason && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-semibold text-red-800 mb-1">
                เหตุผลที่ถูกระงับ:
              </p>
              <p className="text-sm text-red-700">{shop.suspensionReason}</p>
            </div>
          )}
        </Card>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-semibold text-green-800">ส่งคำขอสำเร็จ!</p>
                <p className="text-sm text-green-700">
                  Admin จะทำการตรวจสอบและติดต่อกลับโดยเร็วที่สุด
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Pending Request Warning */}
        {hasPendingRequest && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🕐</span>
              <div>
                <p className="font-semibold text-yellow-800">
                  มีคำขอที่รอตรวจสอบอยู่
                </p>
                <p className="text-sm text-yellow-700">
                  กรุณารอการตรวจสอบจาก Admin คำขอที่ส่งไว้ก่อนหน้านี้
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Request Form */}
        <Card className="p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                1. เหตุผลที่ต้องการเปิดร้านใหม่{" "}
                <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="เช่น: ได้แก้ไขปัญหาเรื่องการขายสินค้าละเมิดลิขสิทธิ์แล้ว"
                className="min-h-[100px]"
                required
                disabled={hasPendingRequest || submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                2. อธิบายการแก้ไขปัญหา <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="อธิบายว่าคุณได้แก้ไขปัญหาที่ทำให้ร้านค้าถูกระงับอย่างไรบ้าง"
                className="min-h-[120px]"
                required
                disabled={hasPendingRequest || submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                3. มาตรการป้องกันไม่ให้เกิดปัญหาซ้ำ{" "}
                <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={improvements}
                onChange={(e) => setImprovements(e.target.value)}
                placeholder="อธิบายแผนหรือมาตรการที่จะใช้เพื่อป้องกันไม่ให้เกิดปัญหาซ้ำในอนาคต"
                className="min-h-[120px]"
                required
                disabled={hasPendingRequest || submitting}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  เบอร์โทรศัพท์ติดต่อ
                </label>
                <Input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="08X-XXX-XXXX"
                  disabled={hasPendingRequest || submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  อีเมลติดต่อ
                </label>
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="email@example.com"
                  disabled={hasPendingRequest || submitting}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                4. เอกสารประกอบ (ถ้ามี)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                อัปโหลดเอกสาร เช่น สำเนาบัตรประชาชน, หลักฐานความน่าเชื่อถือ,
                ใบอนุญาต ฯลฯ (สูงสุด 5 ไฟล์, ขนาดไม่เกิน 5MB/ไฟล์)
              </p>
              <Input
                type="file"
                onChange={handleFileChange}
                multiple
                accept="image/*,.pdf,.doc,.docx"
                disabled={hasPendingRequest || submitting}
                className="cursor-pointer"
              />
              {files.length > 0 && (
                <div className="mt-2 space-y-1">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="text-sm text-gray-600 flex items-center gap-2"
                    >
                      <span>📎</span>
                      <span>{file.name}</span>
                      <span className="text-gray-400">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={hasPendingRequest || submitting}
                className="flex-1 bg-gradient-to-r from-[#ff9800] to-[#f57c00] hover:from-[#e08800] hover:to-[#d56600] text-white font-bold py-6 text-lg"
              >
                {submitting ? "⏳ กำลังส่งคำขอ..." : "📨 ส่งคำขอเปิดร้านใหม่"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => (window.location.href = "/seller")}
                className="px-8 py-6"
              >
                ยกเลิก
              </Button>
            </div>
          </form>
        </Card>

        {/* Request History */}
        {existingRequests.length > 0 && (
          <Card className="p-6">
            <h3 className="font-bold text-xl mb-4">📋 ประวัติคำขอ</h3>
            <div className="space-y-4">
              {existingRequests.map((request) => (
                <div key={request.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">
                        ส่งเมื่อ:{" "}
                        {request.createdAt
                          .toDate()
                          .toLocaleDateString("th-TH", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                      </p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>

                  <div className="text-sm text-gray-700 space-y-1">
                    <p>
                      <span className="font-semibold">เหตุผล:</span>{" "}
                      {request.reason}
                    </p>
                  </div>

                  {request.status === "rejected" && request.reviewNote && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-sm font-semibold text-red-800 mb-1">
                        หมายเหตุจาก Admin:
                      </p>
                      <p className="text-sm text-red-700">
                        {request.reviewNote}
                      </p>
                    </div>
                  )}

                  {request.status === "approved" && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm text-green-700">
                        ✅ ร้านค้าของคุณได้รับการอนุมัติให้เปิดใหม่แล้ว
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
