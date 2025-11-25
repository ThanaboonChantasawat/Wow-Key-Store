"use client";

import { useAuth } from "@/components/auth-context";
import { sendEmailVerification } from "firebase/auth";
import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { usePathname } from "next/navigation";

export function VerificationBanner() {
  const { user, isInitialized } = useAuth();
  const { toast } = useToast();
  const pathname = usePathname();
  const hasShownToast = useRef(false);

  useEffect(() => {
    if (!isInitialized || !user) return;

    // Don't show on auth action page
    if (pathname?.startsWith('/auth/action')) return;

    // If verified, don't show anything
    if (user.emailVerified) return;

    // Only show once per session/mount
    if (hasShownToast.current) return;

    const handleSendVerification = async () => {
      if (!user) return;
      try {
        await sendEmailVerification(user);
        toast({
          title: "ส่งอีเมลแล้ว",
          description: "โปรดตรวจสอบกล่องจดหมายของคุณ",
          variant: "default",
        });
      } catch (error: any) {
        console.error("Error sending verification:", error);
        if (error.code === 'auth/too-many-requests') {
          toast({
            title: "ส่งบ่อยเกินไป",
            description: "โปรดรอสักครู่แล้วลองใหม่",
            variant: "destructive",
          });
        } else {
          toast({
            title: "เกิดข้อผิดพลาด",
            description: "ไม่สามารถส่งอีเมลยืนยันได้",
            variant: "destructive",
          });
        }
      }
    };

    // Show toast
    toast({
      title: "อีเมลของคุณยังไม่ได้รับการยืนยัน",
      description: "กรุณายืนยันอีเมลเพื่อใช้งานฟีเจอร์ทั้งหมด",
      variant: "destructive",
      duration: Infinity, // Show until dismissed
      action: (
        <ToastAction altText="ส่งอีเมลยืนยันอีกครั้ง" onClick={handleSendVerification}>
          ส่งอีเมลยืนยันอีกครั้ง
        </ToastAction>
      ),
    });

    hasShownToast.current = true;
  }, [user, isInitialized, toast]);

  return null;
}
