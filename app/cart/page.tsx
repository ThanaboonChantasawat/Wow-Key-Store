import { CartContent } from "@/components/cart/CartContent";

export default function CartPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f2f2f4]">
      <main className="flex-1">
        <CartContent />
      </main>
    </div>
  )
}
