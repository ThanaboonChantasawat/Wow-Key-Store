import { Suspense } from 'react';

// Server Components - Fetch data
async function getSliderImages() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/slider?activeOnly=true`, {
      cache: 'no-store',
      next: { revalidate: 60 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.images || [];
  } catch (error) {
    console.error('Error fetching slider:', error);
    return [];
  }
}

async function getPopularGames() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/games/popular`, {
      cache: 'no-store',
      next: { revalidate: 60 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.games || [];
  } catch (error) {
    console.error('Error fetching games:', error);
    return [];
  }
}

async function getTopShops() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/shops/top-sales?limit=5`, {
      cache: 'no-store',
      next: { revalidate: 60 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching shops:', error);
    return [];
  }
}

// Client Components
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

export default async function Home() {
  // Fetch all data in parallel
  const [sliderImages, popularGames, topShops] = await Promise.all([
    getSliderImages(),
    getPopularGames(),
    getTopShops()
  ]);

  return (
    <main className="bg-[#f2f2f4]">
      {/* Slider Section - Only on larger screens */}
      <section className="hidden lg:block max-w-[1920px] mx-auto px-6 py-8">
        <Suspense fallback={<HomeSliderSkeleton />}>
          <HomeSliderClient images={sliderImages} />
        </Suspense>
      </section>

      {/* Mobile Slider - Full width */}
      <section className="lg:hidden">
        <Suspense fallback={<HomeSliderSkeleton />}>
          <HomeSliderClient images={sliderImages} />
        </Suspense>
      </section>

      {/* Popular Games Section */}
      <Suspense fallback={<div className="min-h-[400px]" />}>
        <GameContainerClient games={popularGames} />
      </Suspense>

      {/* Top Shops Section */}
      <Suspense fallback={<div className="min-h-[400px]" />}>
        <TopShopsClient shops={topShops} />
      </Suspense>

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
  );
}