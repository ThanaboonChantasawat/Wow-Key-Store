"use client"

import { useState } from "react"
import type { Game } from "@/lib/game-service"
import Image from "next/image"
import Link from "next/link"
import { Star, Gamepad2 } from "lucide-react"

interface GameContainerClientProps {
  games: Game[]
}

export function GameContainerClient({ games }: GameContainerClientProps) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  const handleImageError = (gameId: string) => {
    console.error('Failed to load game image:', gameId)
    setImageErrors(prev => new Set(prev).add(gameId))
  }

  const validGames = games.filter(game => game && game.id && game.imageUrl && !imageErrors.has(game.id))

  if (validGames.length === 0) {
    return null
  }

  return (
    <section className="py-8 sm:py-12 lg:py-16 bg-white">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 2xl:w-16 2xl:h-16 bg-gradient-to-br from-[#ff9800] to-[#f57c00] rounded-xl flex items-center justify-center shadow-lg">
              <Gamepad2 className="w-5 h-5 sm:w-6 sm:h-6 2xl:w-8 2xl:h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl 2xl:text-5xl font-bold text-[#292d32]">เกมยอดนิยม</h2>
              <p className="text-sm sm:text-base 2xl:text-xl text-gray-600 mt-0.5">เกมที่ผู้เล่นสนใจมากที่สุด</p>
            </div>
          </div>
          <Link 
            href="/products" 
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#ff9800] to-[#f57c00] hover:from-[#e08800] hover:to-[#e06c00] text-white px-4 sm:px-6 2xl:px-8 py-2 sm:py-3 2xl:py-4 rounded-full font-medium shadow-lg hover:shadow-xl transition-all duration-300 text-sm sm:text-base 2xl:text-xl"
          >
            ดูทั้งหมด
            <Star className="w-4 h-4 sm:w-5 sm:h-5 2xl:w-6 2xl:h-6" />
          </Link>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6 2xl:gap-8">
          {validGames.map((game) => (
            <Link
              key={game.id}
              href={`/products?game=${game.id}`}
              className="group bg-white rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100"
            >
              <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800">
                <Image
                  src={game.imageUrl || "/landscape-placeholder-svgrepo-com.svg"}
                  alt={game.name || 'Game'}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  onError={() => handleImageError(game.id)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {game.isPopular && (
                  <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    ยอดนิยม
                  </div>
                )}
              </div>

              <div className="p-3 sm:p-4">
                <h3 className="font-semibold text-[#292d32] text-sm sm:text-base line-clamp-2 mb-1 group-hover:text-[#ff9800] transition-colors">
                  {game.name}
                </h3>

              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
