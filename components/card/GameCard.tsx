'use client'

import { ShoppingBag, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useGames } from "@/hooks/useFirestore";
import { GameWithCategories, GameImage } from "@/lib/types";

interface GameCardProps {
  games?: GameWithCategories[];
  loading?: boolean;
  error?: string | null;
  limit?: number;
}

const GameCard = ({ games: propGames, loading: propLoading, error: propError, limit }: GameCardProps) => {
  const { games: hookGames, loading: hookLoading, error: hookError } = useGames();
  const [loadingImages, setLoadingImages] = useState<{ [key: string]: boolean }>({});
  
  // ใช้ props ก่อน ถ้าไม่มีให้ใช้ hook
  const games = propGames || hookGames;
  const loading = propLoading !== undefined ? propLoading : hookLoading;
  const error = propError !== undefined ? propError : hookError;
  
  // จำกัดจำนวนเกมที่แสดงถ้ามี limit
  const displayGames = limit ? games.slice(0, limit) : games;

  const handleImageLoad = (gameId: string) => {
    setLoadingImages(prev => ({ ...prev, [gameId]: false }));
  };

  const handleImageLoadStart = (gameId: string) => {
    setLoadingImages(prev => ({ ...prev, [gameId]: true }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff9800]" />
        <span className="ml-2 text-gray-600">กำลังโหลดข้อมูล...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-[#ff9800] hover:bg-[#e08800] text-white px-4 py-2 rounded"
        >
          ลองใหม่
        </button>
      </div>
    );
  }

  if (displayGames.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">ไม่พบข้อมูลเกม</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      
      {displayGames.map((game) => (
        <div
          key={game.id}
          className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full group border border-gray-100"
        >
          {/* Image Container with Overlay */}
          <div className="relative h-48 md:h-64 overflow-hidden flex-shrink-0 bg-gray-200">
            {/* Skeleton Loader */}
            {loadingImages[game.id] !== false && (
              <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              </div>
            )}
            
            <Link href={`/products/${game.id}`}>
              <Image
                src={(() => {
                  console.log(`GameCard - ${game.name} raw gameImages:`, game.gameImages);
                  
                  // แยก images array จาก gameImages structure
                  let imagesArray: GameImage[] = [];
                  
                  if (game.gameImages && game.gameImages.length > 0) {
                    // ถ้า gameImages[0] มี images array
                    if (game.gameImages[0] && game.gameImages[0].images && Array.isArray(game.gameImages[0].images)) {
                      imagesArray = game.gameImages[0].images;
                      console.log(`GameCard - ${game.name} found images in gameImages[0].images:`, imagesArray);
                    }
                    // ถ้า gameImages เป็น array ของ images โดยตรง (backward compatibility)
                    else if (game.gameImages[0] && 'url' in game.gameImages[0]) {
                      imagesArray = game.gameImages as unknown as GameImage[];
                      console.log(`GameCard - ${game.name} gameImages is direct array:`, imagesArray);
                    }
                  }
                  
                  if (imagesArray.length === 0) {
                    console.log(`GameCard - ${game.name} no images found, using Firebase fallback`);
                    return "https://firebasestorage.googleapis.com/v0/b/wowkeystore.firebasestorage.app/o/PU%20(1).jpg?alt=media&token=42da6cd0-98fa-4d3b-a607-907af9e666ab";
                  }
                  
                  const coverImage = imagesArray.find(img => img.isCover)?.url;
                  const firstImage = imagesArray[0]?.url;
                  
                  console.log(`GameCard - ${game.name} coverImage:`, coverImage);
                  console.log(`GameCard - ${game.name} firstImage:`, firstImage);
                  
                  const firebaseFallback = "https://firebasestorage.googleapis.com/v0/b/wowkeystore.firebasestorage.app/o/PU%20(1).jpg?alt=media&token=42da6cd0-98fa-4d3b-a607-907af9e666ab";
                  const finalUrl = coverImage || firstImage || firebaseFallback;
                  console.log(`GameCard - ${game.name} final URL:`, finalUrl);
                  
                  return finalUrl;
                })()}
                alt={game.name}
                width={400}
                height={400}
                className={`w-full h-full object-cover group-hover:scale-110 transition-all duration-500 ${
                  loadingImages[game.id] !== false ? 'opacity-0' : 'opacity-100'
                }`}
                onLoadingComplete={() => handleImageLoad(game.id)}
                onLoadStart={() => handleImageLoadStart(game.id)}
                loading="lazy"
                placeholder="blur"
                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2UwZTBlMCIvPjwvc3ZnPg=="
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
            
            {/* Price Badge */}
            <div className="absolute top-3 right-3 bg-[#ff9800] text-white px-3 py-1.5 rounded-lg shadow-lg font-bold text-sm md:text-base">
              ฿{game.price.toLocaleString()}
            </div>
          </div>

          {/* Content */}
          <div className="p-3 md:p-4 flex-grow flex flex-col">
            <Link href={`/products/${game.id}`}>
              <h4 className="font-bold text-sm md:text-base text-gray-900 mb-2 line-clamp-2 hover:text-[#ff9800] transition-colors min-h-[2.5rem] md:min-h-[3rem]">
                {game.name}
              </h4>
            </Link>
            
            <p className="text-xs md:text-sm text-gray-600 line-clamp-2 mb-3 flex-grow">
              {game.description}
            </p>
            
            {/* Categories Tags */}
            {game.categories && game.categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {game.categories.slice(0, 2).map((category) => (
                  <span 
                    key={category.id}
                    className="text-xs bg-gradient-to-r from-orange-50 to-orange-100 text-[#ff9800] px-2 py-1 rounded-full font-medium border border-orange-200"
                  >
                    {category.name}
                  </span>
                ))}
                {game.categories.length > 2 && (
                  <span className="text-xs text-gray-400 px-1 py-1">+{game.categories.length - 2}</span>
                )}
              </div>
            )}
            
            {/* Action Button */}
            <Link href={`/products/${game.id}`} className="mt-auto">
              <button className="w-full bg-gradient-to-r from-[#ff9800] to-[#ff6f00] hover:from-[#e08800] hover:to-[#e06000] text-white py-2 md:py-2.5 rounded-lg flex items-center justify-center transition-all duration-300 font-medium text-sm md:text-base shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                <ShoppingBag className="h-4 w-4 mr-2" />
                <span>ดูรายละเอียด</span>
              </button>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
};

export default GameCard;
