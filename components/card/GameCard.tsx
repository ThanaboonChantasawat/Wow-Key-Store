'use client'

import { ShoppingBag, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
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
  
  // ใช้ props ก่อน ถ้าไม่มีให้ใช้ hook
  const games = propGames || hookGames;
  const loading = propLoading !== undefined ? propLoading : hookLoading;
  const error = propError !== undefined ? propError : hookError;
  
  // จำกัดจำนวนเกมที่แสดงถ้ามี limit
  const displayGames = limit ? games.slice(0, limit) : games;

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
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
      
      {displayGames.map((game) => (
        <div
          key={game.id}
          className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full"
        >
          <div className="h-72 overflow-hidden flex-shrink-0">
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
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </Link>
          </div>
          <div className="p-4 flex-grow flex flex-col">
            <p className="font-bold text-lg text-[#ff9800]">{game.price.toLocaleString()} ฿</p>
            <h4 className="font-medium text-gray-900 mb-2">{game.name}</h4>
            <p className="text-sm text-gray-500 line-clamp-2 mb-2 flex-grow">{game.description}</p>
            
            {/* แสดง categories */}
            {game.categories && game.categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {game.categories.slice(0, 2).map((category) => (
                  <span 
                    key={category.id}
                    className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                  >
                    {category.name}
                  </span>
                ))}
                {game.categories.length > 2 && (
                  <span className="text-xs text-gray-400">+{game.categories.length - 2}</span>
                )}
              </div>
            )}
            
            {/* ปุ่มจะอยู่ด้านล่างเสมอ */}
            <button className="w-full bg-[#ff9800] hover:bg-[#e08800] text-white py-2 rounded flex items-center justify-center transition-colors mt-auto">
              <ShoppingBag className="h-4 w-4 mr-2" />
              ใส่ตะกร้า
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default GameCard;
