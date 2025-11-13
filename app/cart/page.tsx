import { Suspense } from "react"
import { CartContent } from "@/components/cart/CartContent"
import { Toaster } from "@/components/ui/toaster"

export default function CartPage() {
  return (
    <div className="flex flex-col bg-[#f2f2f4]">
      <main className="py-8">
        <Suspense fallback={<div className="text-center py-8">กำลังโหลด...</div>}>
          <CartContent />
        </Suspense>
      </main>
      <Toaster />
    </div>
  )
}
