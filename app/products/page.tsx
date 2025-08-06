import { Search, ShoppingCart, Bell, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";

export default function WowKeystore() {
  const gameCategories = [
    { name: "MOBA", count: null, active: false, highlighted: false },
    { name: "Battle Royale", count: null, active: false, highlighted: false },
    { name: "FPS", count: null, active: false, highlighted: false },
    { name: "MMORPG", count: null, active: false, highlighted: false },
    { name: "RPG", count: null, active: false, highlighted: false },
    { name: "Sports", count: null, active: false, highlighted: false },
    { name: "Fighting", count: null, active: false, highlighted: false },
    { name: "Strategy", count: null, active: false, highlighted: false },
    { name: "TCG", count: null, active: false, highlighted: false },
    { name: "Sandbox / Creative", count: null, active: false, highlighted: false },
    { name: "Horror / Survival", count: null, active: false, highlighted: false },
    { name: "Casual / Party", count: null, active: false, highlighted: false },
  ];

  const pokemonProducts = Array(18).fill({
    name: "Pokémon TCG Pocket",
    price: "200 ฿",
    description: "200 เข้าชมแล้ว",
  });

  return (
    <div className="min-h-screen bg-[#f2f2f4]">
      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6">
        {/* Sidebar */}
        <aside className="w-72 bg-[#ffffff] rounded-lg p-6 h-fit">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#999999] w-4 h-4" />
              <Input
                placeholder="ค้นหา"
                className="pl-10 bg-[#f2f2f4] border-[#d9d9d9]"
              />
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-[#1e1e1e] mb-4">
              หมวดหมู่สินค้า
            </h3>
            <div className="space-y-2">
              {gameCategories.map((category, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2 rounded ${
                    category.active
                      ? "bg-[#ff9800] text-[#ffffff]"
                      : category.highlighted
                      ? "text-[#ff9800]"
                      : "text-[#3c3c3c] hover:bg-[#f2f2f4]"
                  }`}
                >
                  <span className="text-sm">{category.name}</span>
                  <div className="flex items-center gap-2">
                    {category.count && (
                      <span className="text-sm">{category.count}</span>
                    )}
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <div className="bg-[#292d32] text-[#ffffff] rounded-lg p-6 mb-6">
            <h1 className="text-2xl font-bold">สินค้าทั้งหมด</h1>
          </div>

          <div className="bg-[#ffffff] rounded-lg p-6">
            <div className="flex justify-end mb-6">
              <div className="flex items-center gap-4">
                <Select defaultValue="popular">
                  <SelectTrigger className="w-32 border-[#ff9800] text-[#ff9800]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">ยอดนิยม</SelectItem>
                    <SelectItem value="newest">ใหม่ล่าสุด</SelectItem>
                    <SelectItem value="price-low">ราคาต่ำ-สูง</SelectItem>
                    <SelectItem value="price-high">ราคาสูง-ต่ำ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-6">
              {pokemonProducts.map((product, index) => (
                <div key={index} className="bg-[#f2f2f4] rounded-lg p-4">
                  <Image
                    src="/landscape-placeholder-svgrepo-com.svg"
                    alt=""
                    width={200}
                    height={200}
                    className="object-contain"
                  />
                  <div className="text-xl font-bold text-[#1e1e1e] mb-1">
                    {product.price}
                  </div>
                  <div className="text-[#1e1e1e] font-medium mb-2">
                    {product.name}
                  </div>
                  <div className="text-[#999999] text-sm mb-4">
                    {product.description}
                  </div>
                  <Button className="w-full bg-[#ff9800] hover:bg-[#ff9800]/90 text-[#ffffff] rounded-lg">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    ใส่ตะกร้า
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
