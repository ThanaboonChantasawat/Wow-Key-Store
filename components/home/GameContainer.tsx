"use client"

import { useState, useEffect } from "react"
import { getPopularGames, type Game } from "@/lib/game-service"
import Image from "next/image"
import Link from "next/link"
import { Star, Gamepad2 } from "lucide-react"

const GameContainer = () => {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadPopularGames = async () => {
      try {
        setLoading(true)
        const popularGames = await getPopularGames()
        setGames(popularGames)
      } catch (error) {
        console.error("Error loading popular games:", error)
      } finally {
        setLoading(false)
      }
    }

    loadPopularGames()
  }, [])

  if (loading) {
    return (
      <section className="py-8 sm:py-12 lg:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff9800] mx-auto"></div>
            <p className="text-gray-500 mt-4 text-sm sm:text-base">กำลังโหลดเกมยอดนิยม...</p>
          </div>
        </div>
      </section>
    )
  }

  if (games.length === 0) {
    return null
  }

  return (
    <section className="py-8 sm:py-12 lg:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#ff9800] to-[#f57c00] rounded-xl flex items-center justify-center shadow-lg">
              <Star className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#292d32]">เกมยอดนิยม</h2>
          </div>
          <Link 
            href="/products" 
            className="hidden sm:flex text-[#ff9800] hover:text-[#e08800] font-semibold items-center gap-2 transition-colors group"
          >
            <span>ดูทั้งหมด</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
          {games.map((game) => (
            <Link
              key={game.id}
              href={`/products?game=${game.id}`}
              className="group"
            >
              <div className="bg-white rounded-lg sm:rounded-xl overflow-hidden border-2 border-gray-200 hover:border-[#ff9800] transition-all duration-300 hover:shadow-xl hover:shadow-orange-100 hover:scale-105">
                {/* Game Image */}
                <div className="relative w-full aspect-square overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800">
                  <Image
                    src={game.imageUrl}
                    alt={game.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                    priority={false}
                  />
                  {/* Popular Badge */}
                  <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-gradient-to-r from-[#ff9800] to-[#f57c00] text-white px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full flex items-center gap-1 shadow-lg">
                    <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-white" />
                    <span className="text-[10px] sm:text-xs font-bold">ยอดนิยม</span>
                  </div>
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                {/* Game Info */}
                <div className="p-2 sm:p-3 lg:p-4">
                  <h3 className="font-bold text-sm sm:text-base text-[#292d32] group-hover:text-[#ff9800] transition-colors line-clamp-2 text-center mb-1">
                    {game.name}
                  </h3>
                  {game.description && (
                    <p className="text-[10px] sm:text-xs text-gray-500 text-center line-clamp-1 overflow-hidden text-ellipsis">
                      {game.description.length > 30 ? `${game.description.substring(0, 30)}...` : game.description}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* View All Button (Mobile) */}
        <div className="mt-6 sm:mt-8 text-center sm:hidden">
          <Link 
            href="/products" 
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-[#ff9800] to-[#f57c00] text-white font-semibold rounded-xl hover:from-[#e08800] hover:to-[#d56600] transition-all shadow-lg hover:shadow-xl active:scale-95 w-full max-w-xs"
          >
            <Gamepad2 className="w-5 h-5" />
            <span>ดูเกมทั้งหมด</span>
          </Link>
        </div>
      </div>
    </section>
  )
}

export default GameContainer