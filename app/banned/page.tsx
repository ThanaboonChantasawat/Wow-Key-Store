import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AlertTriangle, Mail } from "lucide-react";

export default function BannedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="h-24 w-24 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-12 w-12 text-red-600" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">บัญชีถูกระงับ</h1>
        <p className="text-gray-600 mb-6">
          บัญชีของคุณถูกระงับการใช้งานเนื่องจากละเมิดกฎของชุมชน หรือมีการใช้งานที่ผิดปกติ
        </p>
        
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 text-left">
          <h3 className="font-semibold text-red-800 mb-1">สิ่งที่เกิดขึ้น:</h3>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            <li>คุณไม่สามารถซื้อหรือขายสินค้าได้</li>
            <li>คุณไม่สามารถโพสต์ข้อความหรือรีวิวได้</li>
            <li>คุณไม่สามารถเข้าถึงข้อมูลส่วนตัวได้</li>
          </ul>
        </div>
        
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            หากคุณคิดว่านี่เป็นข้อผิดพลาด หรือต้องการยื่นอุทธรณ์
          </p>
          <Link href="/support">
            <Button className="w-full gap-2" variant="outline">
              <Mail className="h-4 w-4" />
              ติดต่อฝ่ายสนับสนุน
            </Button>
          </Link>
          
          <div className="pt-4 border-t border-gray-100 mt-4">
            <Link href="/">
              <Button variant="ghost" className="text-gray-400 hover:text-gray-600">
                กลับสู่หน้าหลัก (Guest Mode)
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
