import { Suspense } from 'react'
import { adminDb } from '@/lib/firebase-admin-config'
import { HomeSliderClient } from '@/components/home/home-slider-client'
import { GameContainerClient } from '@/components/home/GameContainerClient'
import { TopShopsClient } from '@/components/home/TopShopsClient'

// Server-side data fetching functions using Admin SDK
async function getSliderImages() {
  try {
    const sliderRef = adminDb.collection('sliders')
    const snapshot = await sliderRef.get()
    
    let images = snapshot.docs.map((doc: any) => {
      const data = doc.data()
      return {
        id: doc.id,
        url: data.url || '',
        order: data.order || 0,
        active: data.active || false,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      }
    })
    
    // Filter active only
    images = images.filter((img: any) => img.active === true)
    
    // Sort by order
    images.sort((a: any, b: any) => a.order - b.order)
    
    return images
  } catch (error) {
    console.error('Error fetching slider:', error)
    return []
  }
}

async function getPopularGames() {
  try {
    const gamesRef = adminDb.collection('gamesList')
    const q = gamesRef
      .where('isPopular', '==', true)
      .where('status', '==', 'active')
    
    const snapshot = await q.get()
    
    const games = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        name: data.name || '',
        description: data.description || '',
        imageUrl: data.imageUrl || '',
        categories: Array.isArray(data.categories) ? data.categories : [],
        isPopular: Boolean(data.isPopular),
        status: data.status || 'active',
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      }
    })
    
    return games
  } catch (error) {
    console.error('Error fetching games:', error)
    return []
  }
}

async function getTopShops() {
  try {
    const snapshot = await adminDb.collection('shops').get()
    const shops: any[] = []
    
    snapshot.forEach((doc: any) => {
      const data = doc.data()
      // Only include active shops
      if (data.status === 'active') {
        shops.push({
          shopId: data.shopId || '',
          ownerId: data.ownerId || '',
          shopName: data.shopName || '',
          description: data.description || '',
          logoUrl: data.logoUrl || '',
          contactEmail: data.contactEmail || null,
          contactPhone: data.contactPhone || null,
          facebookUrl: data.facebookUrl || null,
          lineId: data.lineId || null,
          status: data.status || 'active',
          verificationStatus: data.verificationStatus || 'pending',
          totalProducts: data.totalProducts || 0,
          totalSales: data.totalSales || 0,
          totalRevenue: data.totalRevenue || 0,
          rating: data.rating || 0,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        })
      }
    })
    
    // Sort by total sales and limit
    shops.sort((a, b) => (b.totalSales || 0) - (a.totalSales || 0))
    return shops.slice(0, 5)
  } catch (error) {
    console.error('Error fetching shops:', error)
    return []
  }
}

function HomeSliderSkeleton() {
  return (
    <div className="relative w-full h-[350px] md:h-[500px] lg:h-[600px] bg-gradient-to-r from-gray-100 to-gray-200 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff9800]"></div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
export const revalidate = 60 // Revalidate every 60 seconds

export default async function Home() {
  // Fetch all data in parallel on server
  const [sliderImages, popularGames, topShops] = await Promise.all([
    getSliderImages(),
    getPopularGames(),
    getTopShops()
  ])

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
  )
}