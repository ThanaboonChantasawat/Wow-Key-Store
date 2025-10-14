'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

export function EmailPromptToast() {
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    const handleShowPrompt = (event: CustomEvent) => {
      setMessage(event.detail.message);
      setShow(true);
    };

    window.addEventListener('show-email-prompt', handleShowPrompt as EventListener);

    return () => {
      window.removeEventListener('show-email-prompt', handleShowPrompt as EventListener);
    };
  }, []);

  const handleGoToProfile = () => {
    setShow(false);
    router.push('/profile?tab=account');
  };

  const handleDismiss = () => {
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-500">
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl shadow-2xl p-6 max-w-md border-2 border-orange-300">
        <div className="flex items-start gap-4">
          <div className="text-4xl animate-bounce">📧</div>
          <div className="flex-1">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-lg">ยืนยันอีเมลของคุณ</h3>
              <button
                onClick={handleDismiss}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-white/90 text-sm mb-4 leading-relaxed">
              {message}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleGoToProfile}
                className="bg-white text-orange-600 hover:bg-orange-50 px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-md hover:shadow-lg"
              >
                ✏️ กรอกอีเมลเลย
              </button>
              <button
                onClick={handleDismiss}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all"
              >
                ภายหลัง
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
