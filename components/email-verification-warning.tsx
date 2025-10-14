"use client";

import { useAuth } from "@/components/auth-context";
import { canProceedWithTransaction } from "@/lib/email-verification";
import { Button } from "@/components/ui/button";
import { Mail, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { sendEmailVerification } from "firebase/auth";
import { useState } from "react";

interface EmailVerificationWarningProps {
  action?: "buy" | "sell" | "create-shop" | "general";
  onVerificationSent?: () => void;
}

export function EmailVerificationWarning({
  action = "general",
  onVerificationSent,
}: EmailVerificationWarningProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const verification = canProceedWithTransaction(user);

  // ถ้า verified แล้ว ไม่ต้องแสดงอะไร
  if (verification.canProceed) return null;

  const getActionText = () => {
    switch (action) {
      case "buy":
        return "ซื้อสินค้า";
      case "sell":
        return "ขายสินค้า";
      case "create-shop":
        return "สร้างร้านค้า";
      default:
        return "ทำธุรกรรม";
    }
  };

  const handleSendVerification = async () => {
    if (!user || !user.email) return;

    try {
      setSending(true);
      setMessage(null);
      await sendEmailVerification(user);
      setMessage("✅ ส่งอีเมลยืนยันสำเร็จ! กรุณาตรวจสอบกล่องจดหมายของคุณ");
      onVerificationSent?.();
    } catch (error) {
      console.error("Error sending verification:", error);
      setMessage("❌ เกิดข้อผิดพลาดในการส่งอีเมลยืนยัน กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-orange-300 rounded-xl p-5 shadow-lg mb-6">
      <div className="flex items-start gap-3">
        <div className="text-3xl animate-pulse">🔒</div>
        <div className="flex-1">
          <h4 className="font-bold text-orange-900 mb-2 text-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            ต้องยืนยันอีเมลก่อน{getActionText()}
          </h4>
          <p className="text-sm text-orange-800 mb-3 leading-relaxed">
            {verification.message}
          </p>

          {message && (
            <div className="mb-3 p-3 bg-white/60 rounded-lg text-sm">
              {message}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {!user?.email ? (
              <Button
                onClick={() => router.push("/profile")}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold shadow-md"
                size="sm"
              >
                📧 ไปกรอกอีเมล
              </Button>
            ) : !user.emailVerified ? (
              <>
                <Button
                  onClick={handleSendVerification}
                  disabled={sending}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold shadow-md"
                  size="sm"
                >
                  {sending ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                      กำลังส่ง...
                    </>
                  ) : (
                    <>
                      <Mail className="w-3 h-3 mr-2" />
                      ส่งอีเมลยืนยัน
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => router.push("/profile")}
                  variant="outline"
                  size="sm"
                >
                  ไปหน้า Profile
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
