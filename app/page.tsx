import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-[#111111] text-white">
        <div className="w-full h-[800px] overflow-hidden">
          <Image
            src="/landscape-placeholder-svgrepo-com.svg"
            alt=""
            width={1000}
            height={800}
            className="w-full h-full object-none"
          />
        </div>
      </section>

      {/* Products Section */}
      <section className="py-12 bg-[#fcfbfc]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-center items-center mb-8">
            <h3 className="text-5xl font-bold text-[#ff9800]">
              อันดับเกมขายดี
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {games.map((game, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-sm overflow-hidden"
              >
                <div className="h-48 overflow-hidden">
                  <Link href={`/products/${index + 1}`}>
                    <Image
                      src={game.image || "/placeholder.svg"}
                      alt={game.title}
                      width={400}
                      height={200}
                      className="w-full h-full object-cover"
                    />
                  </Link>
                </div>
                <div className="p-4">
                  <p className="font-bold text-lg">200 ฿</p>
                  <h4 className="font-medium">{game.title}</h4>
                  <p className="text-sm text-gray-500">200 เหรียญเกม</p>
                </div>
                <div className="px-4 pb-4">
                  <button className="w-full bg-[#ff9800] hover:bg-[#e08800] text-white py-2 rounded flex items-center justify-center">
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    ใส่ตะกร้า
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

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

// Game data
const games = [
  {
    title: "ROV (Arena Of Valor)",
    image: "/landscape-placeholder-svgrepo-com.svg",
  },
  {
    title: "Garena Free Fire",
    image: "/landscape-placeholder-svgrepo-com.svg",
  },
  {
    title: "Valorant",
    image: "/landscape-placeholder-svgrepo-com.svg",
  },
];
