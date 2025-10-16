"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Loader2,
  Wallet,
  Settings,
  Info
} from "lucide-react"
import { getShopByOwnerId } from "@/lib/shop-service"
import { useAuth } from "@/components/auth-context"
import { LoadingScreen } from "@/components/ui/loading"

interface StripeAccountStatus {
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  isComplete: boolean;
}

export function SellerPaymentSettings() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [accountStatus, setAccountStatus] = useState<StripeAccountStatus>({
    accountId: null,
    chargesEnabled: false,
    payoutsEnabled: false,
    detailsSubmitted: false,
    isComplete: false,
  })
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null)

  useEffect(() => {
    if (user) {
      loadAccountStatus()
      
      // Check if returned from Stripe onboarding
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('success') === 'true') {
        setMessage({ type: "success", text: "เชื่อมต่อบัญชี Stripe สำเร็จ! กำลังโหลดข้อมูล..." })
        // Remove success parameter from URL
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }, [user])

  const loadAccountStatus = async () => {
    if (!user) return

    try {
      setLoading(true)
      setMessage(null)
      
      const shop = await getShopByOwnerId(user.uid)

      console.log('Shop data:', shop)

      if (!shop) {
        setMessage({ type: "error", text: "ไม่พบข้อมูลร้านค้า กรุณาสร้างร้านค้าก่อน" })
        setLoading(false)
        return
      }

      const stripeAccountId = shop.stripeAccountId

      console.log('Stripe Account ID:', stripeAccountId)

      if (stripeAccountId) {
        // Fetch account status from Stripe
        console.log('Fetching account status from Stripe...')
        const response = await fetch(`/api/stripe/get-account-status?accountId=${stripeAccountId}`)
        const data = await response.json()

        console.log('Account status response:', data)

        if (data.success) {
          setAccountStatus({
            accountId: stripeAccountId,
            chargesEnabled: data.account.chargesEnabled,
            payoutsEnabled: data.account.payoutsEnabled,
            detailsSubmitted: data.account.detailsSubmitted,
            isComplete: data.account.chargesEnabled && data.account.payoutsEnabled,
          })
          
          // 🔥 อัปเดตข้อมูลลง Firestore ผ่าน API
          try {
            const updateResponse = await fetch('/api/stripe/update-shop-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.uid,
                accountId: stripeAccountId,
                chargesEnabled: data.account.chargesEnabled,
                payoutsEnabled: data.account.payoutsEnabled,
                detailsSubmitted: data.account.detailsSubmitted,
              }),
            })
            
            const updateData = await updateResponse.json()
            
            if (updateResponse.ok) {
              console.log('✅ อัปเดต Firestore สำเร็จ')
            } else {
              console.error('❌ อัปเดต Firestore ล้มเหลว:', updateData.error)
              console.error('Details:', updateData.details)
            }
          } catch (updateError) {
            console.error('❌ เกิดข้อผิดพลาดในการอัปเดต:', updateError)
          }
          
          setMessage({ type: "success", text: "โหลดข้อมูลบัญชีสำเร็จ!" })
        } else {
          console.error('Failed to get account status:', data.error)
          setMessage({ type: "error", text: `ไม่สามารถโหลดสถานะบัญชี: ${data.error}` })
        }
      } else {
        console.log('No Stripe account ID found in shop')
        setAccountStatus({
          accountId: null,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          isComplete: false,
        })
      }
    } catch (error) {
      console.error("Error loading account status:", error)
      setMessage({ type: "error", text: "โหลดสถานะบัญชีไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" })
    } finally {
      setLoading(false)
    }
  }

  const handleConnectStripe = async () => {
    if (!user) return

    try {
      setConnecting(true)
      setMessage(null)

      const shop = await getShopByOwnerId(user.uid)

      if (!shop) {
        setMessage({ type: "error", text: "ไม่พบข้อมูลร้านค้า" })
        return
      }

      // Create or re-onboard Stripe Connect account
      const response = await fetch('/api/stripe/create-connect-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email || '',
          shopName: shop.shopName,
        }),
      })

      const data = await response.json()

      console.log('Create account response:', data)

      if (data.success) {
        // Redirect to Stripe onboarding
        window.location.href = data.onboardingUrl
      } else {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error
        setMessage({ type: "error", text: errorMsg || "เชื่อมต่อไม่สำเร็จ" })
      }
    } catch (error) {
      console.error("Error connecting to Stripe:", error)
      setMessage({ type: "error", text: "เกิดข้อผิดพลาดในการเชื่อมต่อ" })
    } finally {
      setConnecting(false)
    }
  }

  const handleContinueOnboarding = async () => {
    if (!accountStatus.accountId) return

    try {
      setConnecting(true)
      setMessage(null)

      const response = await fetch('/api/stripe/create-account-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: accountStatus.accountId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        window.location.href = data.onboardingUrl
      } else {
        setMessage({ type: "error", text: "สร้างลิงก์ไม่สำเร็จ" })
      }
    } catch (error) {
      console.error("Error creating account link:", error)
      setMessage({ type: "error", text: "เกิดข้อผิดพลาด" })
    } finally {
      setConnecting(false)
    }
  }

  const handleOpenDashboard = async () => {
    if (!accountStatus.accountId) return

    try {
      setConnecting(true)
      setMessage(null)

      console.log('Opening dashboard for account:', accountStatus.accountId)

      // สำหรับ Standard Account ใน Test Mode
      // ใช้ direct link ไปยัง Stripe Dashboard
      const testMode = true; // เปลี่ยนเป็น false เมื่อใช้ Live Mode
      const dashboardUrl = testMode
        ? `https://dashboard.stripe.com/test/connect/accounts/${accountStatus.accountId}`
        : `https://dashboard.stripe.com/connect/accounts/${accountStatus.accountId}`;

      console.log('Opening URL:', dashboardUrl);
      
      window.open(dashboardUrl, '_blank');
      setMessage({ type: "success", text: "เปิด Stripe Dashboard สำเร็จ!" });

      setConnecting(false);
    } catch (error) {
      console.error("Error opening dashboard:", error)
      setMessage({ type: "error", text: "เกิดข้อผิดพลาดในการเปิด Dashboard" })
      setConnecting(false)
    }
  }

  if (loading) {
    return <LoadingScreen text="กำลังโหลดข้อมูลบัญชีรับเงิน..." />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Wallet className="w-10 h-10" />
          <h2 className="text-3xl font-bold">บัญชีรับเงิน</h2>
        </div>
        <p className="text-white/90">เชื่อมต่อบัญชี Stripe เพื่อรับเงินจากการขายสินค้า</p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border-2 border-green-200"
              : message.type === "error"
              ? "bg-red-50 text-red-800 border-2 border-red-200"
              : "bg-blue-50 text-blue-800 border-2 border-blue-200"
          }`}
        >
          {message.type === "success" && <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
          {message.type === "error" && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {message.type === "info" && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Status Card */}
      <Card className="border-2">
        <CardContent className="p-6">
          {!accountStatus.accountId ? (
            /* No Account */
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                ยังไม่ได้เชื่อมต่อบัญชีรับเงิน
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                เชื่อมต่อบัญชี Stripe เพื่อเริ่มรับเงินจากลูกค้าได้ทันที
                <br />
                <span className="text-sm text-purple-600 font-semibold">(Test Mode)</span>
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={handleConnectStripe}
                  disabled={connecting}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-lg px-8 py-6"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      กำลังเชื่อมต่อ...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      เชื่อมต่อ Stripe
                    </>
                  )}
                </Button>
                <Button
                  onClick={loadAccountStatus}
                  variant="outline"
                  disabled={loading}
                  className="text-lg px-6 py-6"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Settings className="w-5 h-5 mr-2" />
                      รีเฟรช
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Has Account */
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    accountStatus.isComplete ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    {accountStatus.isComplete ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-yellow-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {accountStatus.isComplete ? 'บัญชีพร้อมใช้งาน' : 'บัญชียังไม่สมบูรณ์'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Account ID: {accountStatus.accountId.slice(0, 20)}...
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className={`p-4 rounded-lg border-2 ${
                  accountStatus.chargesEnabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {accountStatus.chargesEnabled ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-gray-400" />
                    )}
                    <span className="font-semibold">รับชำระเงิน</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {accountStatus.chargesEnabled ? 'เปิดใช้งาน' : 'ยังไม่พร้อม'}
                  </p>
                </div>

                <div className={`p-4 rounded-lg border-2 ${
                  accountStatus.payoutsEnabled 
                    ? 'bg-green-50 border-green-200' 
                    : accountStatus.detailsSubmitted 
                    ? 'bg-yellow-50 border-yellow-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {accountStatus.payoutsEnabled ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : accountStatus.detailsSubmitted ? (
                      <Loader2 className="w-5 h-5 text-yellow-600 animate-spin" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-gray-400" />
                    )}
                    <span className="font-semibold">โอนเงินออก</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {accountStatus.payoutsEnabled 
                      ? 'เปิดใช้งาน' 
                      : accountStatus.detailsSubmitted 
                      ? 'กำลังตรวจสอบ...' 
                      : 'ยังไม่พร้อม'}
                  </p>
                </div>

                <div className={`p-4 rounded-lg border-2 ${
                  accountStatus.detailsSubmitted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {accountStatus.detailsSubmitted ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-gray-400" />
                    )}
                    <span className="font-semibold">ข้อมูลครบถ้วน</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {accountStatus.detailsSubmitted ? 'ส่งแล้ว' : 'ยังไม่ครบ'}
                  </p>
                </div>
              </div>

              {/* Pending Verification Alert */}
              {accountStatus.detailsSubmitted && !accountStatus.payoutsEnabled && (
                <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 mb-2">
                        🔄 กำลังตรวจสอบบัญชีของคุณ
                      </h4>
                      <div className="text-sm text-blue-800 space-y-2">
                        <p>
                          <strong>Stripe กำลังตรวจสอบข้อมูลธนาคารของคุณ</strong> เพื่อเปิดใช้งานการโอนเงินออก
                        </p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>⏱️ <strong>ใช้เวลา:</strong> ประมาณ 10-30 นาที (Test Mode)</li>
                          <li>✅ <strong>สถานะปัจจุบัน:</strong> ข้อมูลส่งครบแล้ว กำลังรอตรวจสอบ</li>
                          <li>🔁 <strong>แนะนำ:</strong> รอสักครู่ แล้วคลิก &quot;รีเฟรชสถานะ&quot; เพื่อเช็คอีกครั้ง</li>
                        </ul>
                        <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                          <p className="font-medium text-blue-900 mb-1">💡 คุณสามารถทำอะไรได้บ้าง?</p>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li><strong>รับชำระเงิน:</strong> พร้อมใช้งานแล้ว ✓</li>
                            <li><strong>โอนเงินออก:</strong> รอการตรวจสอบให้เสร็จก่อน ⏳</li>
                          </ul>
                        </div>
                        <p className="text-xs text-blue-700 mt-2">
                          💬 หากรอนานเกิน 30 นาที แนะนำให้ &quot;เปิด Stripe Dashboard&quot; เพื่อเช็ครายละเอียดเพิ่มเติม
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* All Ready Alert */}
              {accountStatus.chargesEnabled && accountStatus.payoutsEnabled && accountStatus.detailsSubmitted && (
                <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-green-900 mb-1">
                        🎉 บัญชีของคุณพร้อมใช้งานแล้ว!
                      </h4>
                      <p className="text-sm text-green-800">
                        คุณสามารถรับชำระเงินและโอนเงินออกได้ตามปกติ
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                {!accountStatus.isComplete && (
                  <Button
                    onClick={handleContinueOnboarding}
                    disabled={connecting}
                    className="bg-[#ff9800] hover:bg-[#e08800] text-white"
                  >
                    {connecting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        กำลังโหลด...
                      </>
                    ) : (
                      <>
                        <Settings className="w-4 h-4 mr-2" />
                        กรอกข้อมูลเพิ่มเติม
                      </>
                    )}
                  </Button>
                )}
                
                <Button
                  onClick={handleOpenDashboard}
                  disabled={connecting}
                  variant="outline"
                  className="border-2"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      กำลังโหลด...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      เปิด Stripe Dashboard
                    </>
                  )}
                </Button>

                <Button
                  onClick={loadAccountStatus}
                  variant="outline"
                  className="border-2"
                >
                  รีเฟรชสถานะ
                </Button>
              </div>

              {/* Info */}
              <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">ข้อมูลสำคัญ:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>บัญชีนี้อยู่ใน Test Mode สำหรับทดสอบเท่านั้น</li>
                      <li>ใช้เลขบัตรทดสอบ: 4242 4242 4242 4242</li>
                      <li>วันหมดอายุ: ใช้วันที่ในอนาคต เช่น 12/25</li>
                      <li>CVC: ใช้เลข 3 หลักใดก็ได้ เช่น 123</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
