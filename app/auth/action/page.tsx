'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { auth } from '@/components/firebase-config';
import { applyActionCode, verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, Loader2, Mail, KeyRound, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AuthActionPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get('mode');
  const actionCode = searchParams.get('oobCode');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  
  // Password Reset State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [isResetSuccess, setIsResetSuccess] = useState(false);

  useEffect(() => {
    if (!actionCode) {
      setStatus('error');
      setMessage('ไม่พบรหัสยืนยัน (Invalid Action Code)');
      return;
    }

    // Skip effect if we just successfully reset password
    if (isResetSuccess) return;

    const handleAction = async () => {
      try {
        switch (mode) {
          case 'verifyEmail':
            await applyActionCode(auth, actionCode);
            setStatus('success');
            setMessage('ยืนยันอีเมลสำเร็จ! คุณสามารถใช้งานฟีเจอร์ทั้งหมดได้แล้ว');
            break;
            
          case 'resetPassword':
            const email = await verifyPasswordResetCode(auth, actionCode);
            setResetEmail(email);
            setStatus('success'); // Using success state to show the form
            break;
            
          default:
            setStatus('error');
            setMessage('การดำเนินการไม่ถูกต้อง (Invalid Mode)');
        }
      } catch (error: any) {
        console.error('Auth action error:', error);
        setStatus('error');
        if (error.code === 'auth/expired-action-code') {
          setMessage('ลิงก์หมดอายุแล้ว กรุณาขอลิงก์ใหม่');
        } else if (error.code === 'auth/invalid-action-code') {
          setMessage('ลิงก์ไม่ถูกต้องหรือถูกใช้งานไปแล้ว');
        } else {
          setMessage('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        }
      }
    };

    handleAction();
  }, [mode, actionCode, isResetSuccess]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionCode) return;
    
    if (newPassword !== confirmPassword) {
      alert('รหัสผ่านไม่ตรงกัน');
      return;
    }
    
    if (newPassword.length < 6) {
      alert('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    try {
      setStatus('loading');
      await confirmPasswordReset(auth, actionCode, newPassword);
      setStatus('success');
      setIsResetSuccess(true);
      setMessage('เปลี่ยนรหัสผ่านสำเร็จ! กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่');
    } catch (error: any) {
      setStatus('error');
      setMessage('เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
    }
  };

  // Render content based on mode and status
  const renderContent = () => {
    if (status === 'loading') {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-16 h-16 text-[#ff9800] animate-spin mb-4" />
          <p className="text-gray-600">กำลังดำเนินการ...</p>
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">เกิดข้อผิดพลาด</h3>
          <p className="text-gray-600 mb-6">{message}</p>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              กลับไปหน้าหลัก
            </Button>
          </Link>
        </div>
      );
    }

    // Success State handling
    if (mode === 'verifyEmail') {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">ยืนยันอีเมลสำเร็จ</h3>
          <p className="text-gray-600 mb-6">{message}</p>
          <Link href="/">
            <Button className="bg-[#ff9800] hover:bg-[#ff9800]/90 text-white gap-2">
              กลับไปหน้าหลัก
            </Button>
          </Link>
        </div>
      );
    }

    if (mode === 'resetPassword' && !isResetSuccess) {
      return (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-8 h-8 text-[#ff9800]" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">ตั้งค่ารหัสผ่านใหม่</h3>
            <p className="text-sm text-gray-500">สำหรับบัญชี: {resetEmail}</p>
          </div>

          <div className="space-y-2">
            <Input
              type="password"
              placeholder="รหัสผ่านใหม่"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="ยืนยันรหัสผ่านใหม่"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <Button type="submit" className="w-full bg-[#ff9800] hover:bg-[#ff9800]/90 text-white">
            เปลี่ยนรหัสผ่าน
          </Button>
        </form>
      );
    }
    
    // Reset Password Success
    if (isResetSuccess) {
       return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">เปลี่ยนรหัสผ่านสำเร็จ</h3>
          <p className="text-gray-600 mb-6">{message}</p>
          <Link href="/">
            <Button className="bg-[#ff9800] hover:bg-[#ff9800]/90 text-white gap-2">
              กลับไปเข้าสู่ระบบ
            </Button>
          </Link>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-[#ff9800]">
        <CardContent className="pt-6">
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
