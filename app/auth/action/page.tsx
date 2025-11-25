'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { auth } from '@/components/firebase-config';
import { applyActionCode, verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, Loader2, Mail, KeyRound, ArrowLeft, Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetSuccess, setIsResetSuccess] = useState(false);
  const effectRan = useRef(false);
  const [randomId1] = useState(() => `pwd-${Math.random().toString(36).substr(2, 9)}`);
  const [randomId2] = useState(() => `conf-${Math.random().toString(36).substr(2, 9)}`);
  const [inputType1, setInputType1] = useState<'text' | 'password'>('text');
  const [inputType2, setInputType2] = useState<'text' | 'password'>('text');

  useEffect(() => {
    if (!actionCode) {
      setStatus('error');
      setMessage('ไม่พบรหัสยืนยัน (Invalid Action Code)');
      return;
    }

    // Prevent double execution (React Strict Mode or fast re-renders)
    if (effectRan.current) return;
    effectRan.current = true;

    // Skip effect if we just successfully reset password
    if (isResetSuccess) return;

    const handleAction = async () => {
      try {
        switch (mode) {
          case 'verifyEmail':
            try {
              await applyActionCode(auth, actionCode);
              setStatus('success');
              setMessage('ยืนยันอีเมลสำเร็จ! คุณสามารถใช้งานฟีเจอร์ทั้งหมดได้แล้ว');
            } catch (error: any) {
              // If code is invalid, check if user is already verified
              if (error.code === 'auth/invalid-action-code') {
                await auth.currentUser?.reload();
                if (auth.currentUser?.emailVerified) {
                  setStatus('success');
                  setMessage('อีเมลของคุณได้รับการยืนยันเรียบร้อยแล้ว');
                  return;
                }
              }
              throw error;
            }
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

  const handleResetPassword = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
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
        <div className="space-y-4" data-form-type="other">
          <div className="text-center mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <KeyRound className="w-6 h-6 text-[#ff9800]" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">ตั้งค่ารหัสผ่านใหม่</h3>
            <p className="text-sm text-gray-500">สำหรับบัญชี: {resetEmail}</p>
          </div>

          <div className="space-y-2 relative">
            <Input
              id={randomId1}
              name={randomId1}
              type="text"
              placeholder="รหัสผ่านใหม่"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleResetPassword(e)}
              required
              minLength={6}
              data-lpignore="true"
              data-form-type="other"
              style={showPassword ? {} : {
                WebkitTextSecurity: 'disc',
                fontFamily: 'text-security-disc'
              } as React.CSSProperties}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <div className="space-y-2 relative">
            <Input
              id={randomId2}
              name={randomId2}
              type="text"
              placeholder="ยืนยันรหัสผ่านใหม่"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleResetPassword(e)}
              required
              minLength={6}
              data-lpignore="true"
              data-form-type="other"
              style={showConfirmPassword ? {} : {
                WebkitTextSecurity: 'disc',
                fontFamily: 'text-security-disc'
              } as React.CSSProperties}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <Button 
            type="button" 
            onClick={handleResetPassword}
            className="w-full bg-[#ff9800] hover:bg-[#ff9800]/90 text-white"
          >
            เปลี่ยนรหัสผ่าน
          </Button>
        </div>
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
    <div className="py-6 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-[#ff9800]">
        <CardContent className="pt-6">
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
