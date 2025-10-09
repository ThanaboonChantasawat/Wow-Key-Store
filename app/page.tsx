import Link from "next/link";
import Hero from "@/components/hero/Hero";
import SearchContainer from '@/components/search/SearchContainer';

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <Hero/>

      {/* Products Section (client wrapper decides preview or default) */}
      <SearchContainer />

      {/* Why Section */}
      <section className="py-12 bg-[#ff9800] text-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h3 className="text-2xl font-bold mb-6">Why WowKeystore?</h3>
          <p className="text-center mb-8">
            แหล่งจำหน่ายสินค้าเกมส์ราคาถูกที่ขายเฉพาะสินค้าดิจิตอล
            ครอบคลุมทั้งแพลตฟอร์ม PC, Mac และมือถือ
            เรารวบรวมเกมดังๆทุกค่ายมาไว้ที่นี่เดียว ไม่ว่าจะเป็นเกมแอคชั่น
            อาร์พีจี ยิงปืน หรือเกมแนวอื่นๆอีกมากมาย
            สูตรความสำเร็จของเราคือการมุ่งเน้นคุณภาพสินค้า ปลอดภัย
            ดีที่สุดจะอยู่กับคุณไปนี้เลย
          </p>
        </div>
      </section>
    </main>
  );
}