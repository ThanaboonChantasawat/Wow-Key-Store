'use client'

import { Search, ShoppingCart, ChevronDown, Plus } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image"
import { useState } from 'react'
import Link from 'next/link'

export default function WowKeystore() {
  const gameCategories = [
    { name: "MOBA", count: null, active: false, highlighted: false },
    { name: "RoV (Arena of Valor)", count: null, active: false, highlighted: false },
    { name: "League of Legends", count: null, active: false, highlighted: false},
    { name: "Pokémon Unite", count: null, active: false, highlighted: false },
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
    { name: "Casual / Party", count: null, active: false, highlighted: false }
  ]

  const pokemonProducts = Array(8).fill({
    name: "Pokémon TCG Pocket",
    price: "200 ฿",
    description: "200 เข้าเกมแล้ว"
  })

  const [isCategoriesSectionOpen, setIsCategoriesSectionOpen] = useState(false)

  return (
    <div>
      <div className="min-h-screen bg-[#f2f2f4]">
        {/* Collapsible Categories Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="bg-[#ffffff] rounded-lg shadow-sm border border-[#d9d9d9]">
            <button 
              onClick={() => setIsCategoriesSectionOpen(!isCategoriesSectionOpen)}
              className="w-full flex items-center justify-between p-4 hover:bg-[#f2f2f4] transition-colors"
            >
              <h3 className="font-semibold text-[#1e1e1e] text-lg">หมวดหมู่สินค้า</h3>
              <ChevronDown className={`w-5 h-5 text-[#3c3c3c] transition-transform ${isCategoriesSectionOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isCategoriesSectionOpen && (
              <div className="px-4 pb-4">
                <div className="mb-4 mt-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#999999] w-4 h-4" />
                    <Input 
                      placeholder="ค้นหา" 
                      className="pl-10 bg-[#f2f2f4] border-[#d9d9d9]"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {gameCategories.map((category, index) => (
                    <div key={index} className={`flex items-center justify-between p-3 rounded cursor-pointer transition-colors ${
                      category.active ? 'bg-[#ff9800] text-[#ffffff]' : 
                      category.highlighted ? 'text-[#ff9800] bg-[#ff9800]/10' : 'text-[#3c3c3c] hover:bg-[#f2f2f4]'
                    }`}>
                      <span className="text-sm font-medium">{category.name}</span>
                      <div className="flex items-center gap-2">
                        {category.count && (
                          <span className="text-xs bg-[#d9d9d9] text-[#3c3c3c] px-2 py-1 rounded-full">{category.count}</span>
                        )}
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col lg:flex-row gap-4 lg:gap-6">
          

          {/* Main Content */}
          <main className="flex-1 order-1 lg:order-2">
            <div className="bg-[#292d32] text-[#ffffff] rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="flex items-center justify-between">
                <h1 className="text-xl sm:text-2xl font-bold">สินค้า</h1>               
              </div>
            </div>

            <div className="bg-[#ffffff] rounded-lg p-4 sm:p-6">
              <div className="flex items-center justify-end mb-6">
                <div className="flex items-center gap-4">
                  <span className="text-[#3c3c3c]">จำนวน 6 รายการ</span>
                  <Select defaultValue="popular">
                    <SelectTrigger className="w-36 sm:w-32 border-[#ff9800] text-[#ff9800]">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {pokemonProducts.map((product, index) => (
                  <div key={index} className="bg-[#f2f2f4] rounded-lg p-3 sm:p-4">
                    <Link href={'/products/{id}'}>
                    <Image
                    src={'/landscape-placeholder-svgrepo-com.svg'}
                    alt=''
                    width={400}
                    height={200}
                    className="object-contain"
                    />
                    </Link>
                    <div className="text-lg sm:text-xl font-bold text-[#1e1e1e] mb-1">{product.price}</div>
                    <div className="text-sm sm:text-base text-[#1e1e1e] font-medium mb-2">{product.name}</div>
                    <div className="text-[#999999] text-xs sm:text-sm mb-3 sm:mb-4">{product.description}</div>
                    <Button className="w-full bg-[#ff9800] hover:bg-[#ff9800]/90 text-[#ffffff] rounded-lg text-sm sm:text-base py-2 sm:py-3">
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
    </div>
  )
}
