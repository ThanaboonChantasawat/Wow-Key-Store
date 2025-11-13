'use client'

import { useEffect, useState, Suspense } from 'react';
import { HomeSliderClient } from '@/components/home/home-slider-client';
import { GameContainerClient } from '@/components/home/GameContainerClient';
import { TopShopsClient } from '@/components/home/TopShopsClient';

function HomeSliderSkeleton() {
  return (
    <div className="relative w-full h-[350px] md:h-[500px] lg:h-[600px] bg-gradient-to-r from-gray-100 to-gray-200 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff9800]"></div>
    </div>
  )
}

function HomeContent() {
  const [sliderImages, setSliderImages] = useState<any[]>([])
  const [popularGames, setPopularGames] = useState<any[]>([])
  const [topShops, setTopShops] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [sliderRes, gamesRes, shopsRes] = await Promise.all([
          fetch('/api/slider?activeOnly=true'),
          fetch('/api/games/popular'),
          fetch('/api/shops/top-sales?limit=5')
        ])

        const [sliderData, gamesData, shopsData] = await Promise.all([
          sliderRes.ok ? sliderRes.json() : { images: [] },
          gamesRes.ok ? gamesRes.json() : { games: [] },
          shopsRes.ok ? shopsRes.json() : []
        ])

        setSliderImages(sliderData.images || [])
        setPopularGames(gamesData.games || [])
        setTopShops(Array.isArray(shopsData) ? shopsData : [])
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <main className="bg-[#f2f2f4]">
        <section className="hidden lg:block max-w-[1920px] mx-auto px-6 py-8">
          <HomeSliderSkeleton />
        </section>
        <section className="lg:hidden">
          <HomeSliderSkeleton />
        </section>
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff9800]"></div>
        </div>
      </main>
    )
  }

  return (
    <main className="bg-[#f2f2f4]">
      {/* Slider Section - Only on larger screens */}
      <section className="hidden lg:block max-w-[1920px] mx-auto px-6 py-8">
        <HomeSliderClient images={sliderImages} />
      </section>

      {/* Mobile Slider - Full width */}
      <section className="lg:hidden">
        <HomeSliderClient images={sliderImages} />
      </section>

      {/* Popular Games Section */}
      <GameContainerClient games={popularGames} />

      {/* Top Shops Section */}
      <TopShopsClient shops={topShops} />

      {/* Why Section */}
      <section className="py-8 sm:py-12 lg:py-16 bg-stone-800 text-white">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl font-bold mb-6">Why WowKeystore?</h3>
          <p className="text-center mb-8 max-w-5xl mx-auto text-lg">
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
  )
}

export default function Home() {
  return <HomeContent />
}