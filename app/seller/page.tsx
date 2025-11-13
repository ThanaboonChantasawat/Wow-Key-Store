"use client"

import { useState, useEffect } from "react"
import { SellerDashboard } from "@/components/sellerdashboard/seller-dashboard"
import { CreateShopForm } from "@/components/sellerdashboard/create-shop-form"
import { useAuth } from "@/components/auth-context"
import { type Shop } from "@/lib/shop-client"
import { getUserProfile, type UserProfile } from "@/lib/user-client"
import { AlertCircle, Clock, XCircle, CheckCircle2, Ban } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function SellerPage() {
  const { user, isInitialized } = useAuth()
  const [shop, setShop] = useState<Shop | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [verifierProfile, setVerifierProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    const checkShop = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        // Call API instead of direct service
        const response = await fetch(`/api/shops/owner/${user.uid}`);
        if (response.ok) {
          const shopData = await response.json();
          
          // Convert date strings back to Date objects
          if (shopData.createdAt) shopData.createdAt = new Date(shopData.createdAt);
          if (shopData.updatedAt) shopData.updatedAt = new Date(shopData.updatedAt);
          if (shopData.verifiedAt) shopData.verifiedAt = new Date(shopData.verifiedAt);
          if (shopData.suspendedAt) shopData.suspendedAt = new Date(shopData.suspendedAt);
          
          setShop(shopData);
          
          // Load verifier profile if shop was verified/rejected
          if (shopData?.verifiedBy) {
            const profile = await getUserProfile(shopData.verifiedBy)
            setVerifierProfile(profile)
          }
        } else if (response.status === 404) {
          // Shop not found - user hasn't created one yet
          setShop(null);
        } else {
          console.error("Error fetching shop:", await response.text());
        }
      } catch (error) {
        console.error("Error checking shop:", error)
      } finally {
        setLoading(false)
      }
    }

    if (isInitialized) {
      checkShop()
    }
  }, [user, isInitialized])

  const handleShopCreated = async () => {
    // Reload shop data
    setIsEditing(false)
    if (user) {
      const response = await fetch(`/api/shops/owner/${user.uid}`);
      if (response.ok) {
        const shopData = await response.json();
        
        // Convert date strings back to Date objects
        if (shopData.createdAt) shopData.createdAt = new Date(shopData.createdAt);
        if (shopData.updatedAt) shopData.updatedAt = new Date(shopData.updatedAt);
        if (shopData.verifiedAt) shopData.verifiedAt = new Date(shopData.verifiedAt);
        if (shopData.suspendedAt) shopData.suspendedAt = new Date(shopData.suspendedAt);
        
        setShop(shopData);
      }
    }
  }

  // Loading state
  if (!isInitialized || loading) {
    return (
      <div className="flex flex-col bg-[#f2f2f4] items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff9800] mb-4"></div>
        <p className="text-gray-600">กำลังโหลด...</p>
      </div>
    )
  }

  // Not logged in
  if (!user) {
    return (
      <div className="flex flex-col bg-[#f2f2f4] py-20">
        <div className="flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center max-w-md">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-[#292d32] mb-2">กรุณาเข้าสู่ระบบ</h2>
            <p className="text-gray-600 mb-6">คุณต้องเข้าสู่ระบบเพื่อเข้าถึงหน้านี้</p>
          </div>
        </div>
      </div>
    )
  }

  // No shop yet - show create shop form
  if (!shop || isEditing) {
    return (
      <div className="flex flex-col bg-[#f2f2f4]">
        <CreateShopForm userId={user.uid} onShopCreated={handleShopCreated} existingShop={isEditing ? shop : null} />
      </div>
    )
  }

  // Shop is pending verification
  if (shop.status === 'pending') {
    return (
      <div className="flex flex-col bg-[#f2f2f4] items-center justify-center py-20 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center max-w-2xl">
          <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-[#292d32] mb-3">ร้านค้าของคุณกำลังรอการตรวจสอบ</h2>
          <p className="text-gray-600 mb-6 text-lg">
            Admin กำลังตรวจสอบข้อมูลร้านค้าของคุณ<br />
            โดยทั่วไปจะใช้เวลา 24-48 ชั่วโมง
          </p>
          
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3 text-left">
              <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2 text-lg">ข้อมูลร้านค้าของคุณ:</h3>
                <div className="space-y-2 text-blue-800">
                  <p><span className="font-medium">ชื่อร้าน:</span> {shop.shopName}</p>
                  {shop.contactEmail && <p><span className="font-medium">อีเมล:</span> {shop.contactEmail}</p>}
                  {shop.contactPhone && <p><span className="font-medium">เบอร์โทร:</span> {shop.contactPhone}</p>}
                  {shop.facebookUrl && <p><span className="font-medium">Facebook:</span> ✓ ระบุแล้ว</p>}
                  {shop.lineId && <p><span className="font-medium">Line ID:</span> {shop.lineId}</p>}
                  <p className="text-sm text-blue-600 mt-3">
                    ส่งคำขอเมื่อ: {shop.createdAt.toLocaleDateString('th-TH')} {shop.createdAt.toLocaleTimeString('th-TH')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="border-[#ff9800] text-[#ff9800] hover:bg-[#ff9800] hover:text-white px-6"
            >
              รีเฟรชสถานะ
            </Button>
            <Button
              onClick={() => window.location.href = '/'}
              className="bg-gradient-to-r from-[#ff9800] to-[#f57c00] hover:from-[#e08800] hover:to-[#d56600] text-white px-6"
            >
              กลับหน้าหลัก
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Shop is suspended - cannot access dashboard
  if (shop.status === 'suspended') {
    return (
      <div className="flex flex-col bg-[#f2f2f4] items-center justify-center py-20 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center max-w-2xl">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Ban className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-[#292d32] mb-3">ร้านค้าของคุณถูกระงับการใช้งาน</h2>
          <p className="text-gray-600 mb-6 text-lg">
            Admin ได้ทำการระงับร้านค้าของคุณชั่วคราว คุณไม่สามารถเข้าถึง Dashboard ได้
          </p>
          
          {shop.suspensionReason && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-3 text-left">
                <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-orange-900 mb-2 text-lg">เหตุผลในการระงับ:</h3>
                  <p className="text-orange-800">{shop.suspensionReason}</p>
                  {shop.suspendedBy && shop.suspendedAt && (
                    <p className="text-sm text-orange-600 mt-3">
                      ระงับโดย: Admin เมื่อ {shop.suspendedAt.toLocaleDateString('th-TH')} {shop.suspendedAt.toLocaleTimeString('th-TH')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6 mb-6">
            <div className="text-left">
              <h3 className="font-semibold text-blue-900 mb-2 text-lg">แนะนำ:</h3>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>ตรวจสอบเหตุผลในการระงับอย่างละเอียด</li>
                <li>ติดต่อ Admin เพื่อสอบถามรายละเอียดเพิ่มเติม</li>
                <li>แก้ไขปัญหาที่เกิดขึ้นก่อนขอเปิดร้านใหม่</li>
                <li>รอการพิจารณาจาก Admin</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => window.location.href = '/reopen-shop'}
              className="bg-gradient-to-r from-[#ff9800] to-[#f57c00] hover:from-[#e08800] hover:to-[#d56600] text-white px-8 py-6 text-lg font-bold shadow-lg hover:shadow-xl transition-all"
            >
              📧 ขอเปิดร้านใหม่
            </Button>
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="px-6 py-6 text-lg"
            >
              กลับหน้าหลัก
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Shop is rejected
  if (shop.status === 'rejected') {
    return (
      <div className="flex flex-col bg-[#f2f2f4] items-center justify-center py-20 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center max-w-2xl">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-[#292d32] mb-3">ร้านค้าของคุณไม่ผ่านการตรวจสอบ</h2>
          <p className="text-gray-600 mb-6 text-lg">
            Admin ได้ทำการตรวจสอบและพบปัญหากับข้อมูลร้านค้าของคุณ
          </p>
          
          {shop.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-3 text-left">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-red-900 mb-2 text-lg">เหตุผลในการปฏิเสธ:</h3>
                  <p className="text-red-800">{shop.rejectionReason}</p>
                  {shop.verifiedBy && shop.verifiedAt && (
                    <p className="text-sm text-red-600 mt-3">
                      ตรวจสอบโดย: Admin {verifierProfile?.displayName || verifierProfile?.email || shop.verifiedBy} เมื่อ {shop.verifiedAt.toLocaleDateString('th-TH')} {shop.verifiedAt.toLocaleTimeString('th-TH')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6 mb-6">
            <div className="text-left">
              <h3 className="font-semibold text-blue-900 mb-2 text-lg">แนะนำ:</h3>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>ตรวจสอบและแก้ไขข้อมูลตามที่ระบุ</li>
                <li>ติดต่อ Admin เพื่อขอคำแนะนำเพิ่มเติม</li>
                <li>ยื่นคำขอใหม่พร้อมข้อมูลที่ถูกต้อง</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => setIsEditing(true)}
              className="bg-gradient-to-r from-[#ff9800] to-[#f57c00] hover:from-[#e08800] hover:to-[#d56600] text-white px-6"
            >
              แก้ไขและส่งใหม่
            </Button>
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="px-6"
            >
              กลับหน้าหลัก
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Shop is active/verified - show dashboard
  if (shop.status === 'active') {
    return (
      <div className="flex flex-col bg-[#f2f2f4]">
        <SellerDashboard />
      </div>
    )
  }

  // Unknown status - redirect to home
  return (
    <div className="flex flex-col bg-[#f2f2f4] items-center justify-center py-20 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center max-w-md">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-10 h-10 text-gray-600" />
        </div>
        <h2 className="text-2xl font-bold text-[#292d32] mb-2">สถานะร้านค้าไม่ถูกต้อง</h2>
        <p className="text-gray-600 mb-6">กรุณาติดต่อ Admin</p>
        <Button
          onClick={() => window.location.href = '/'}
          className="bg-gradient-to-r from-[#ff9800] to-[#f57c00] hover:from-[#e08800] hover:to-[#d56600] text-white"
        >
          กลับหน้าหลัก
        </Button>
      </div>
    </div>
  )
}
