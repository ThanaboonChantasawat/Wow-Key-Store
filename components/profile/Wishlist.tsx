"use client";

import { Button } from "@/components/ui/button";
import { Heart, ShoppingBag, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/components/auth-context";
import { useFavoriteGames } from "@/hooks/useFirestore";
import { removeFromFavorites } from "@/lib/favorites-client";
import { useState, useEffect } from "react";
import { GameImage, GameWithCategories } from "@/lib/types";

export function WishlistContent() {
  const { user } = useAuth();
  const { games: fetchedGames, loading, error } = useFavoriteGames(user?.uid || null);
  const [games, setGames] = useState<GameWithCategories[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Update local games state when fetched games change
  useEffect(() => {
    setGames(fetchedGames);
  }, [fetchedGames]);

  const handleRemoveFavorite = async (gameId: string) => {
    if (!user) return;

    try {
      setRemovingId(gameId);
      await removeFromFavorites(user.uid, gameId);
      
      // Remove game from local state instead of reloading
      setGames(prevGames => prevGames.filter(game => game.id !== gameId));
    } catch (error) {
      console.error("Error removing favorite:", error);
      alert("เกิดข้อผิดพลาดในการลบรายการ");
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-[#292d32] mb-6">
            รายการที่ชอบ
          </h2>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#ff9800]" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-[#292d32] mb-6">
            รายการที่ชอบ
          </h2>
          <div className="text-center py-12 text-red-600">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-8">
        <h2 className="text-2xl font-semibold text-[#292d32] mb-6">
          รายการที่ชอบ
        </h2>

        {games.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">ยังไม่มีรายการที่ชื่นชอบ</p>
            <Link href="/products">
              <Button className="mt-4 bg-[#ff9800] hover:bg-[#ff9800]/90 text-white">
                เลือกดูสินค้า
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
            {games.map((game) => {
              // แยก images array จาก gameImages structure
              let imagesArray: GameImage[] = [];
              
              if (game.gameImages && game.gameImages.length > 0) {
                // ถ้า gameImages[0] มี images array
                if (game.gameImages[0] && game.gameImages[0].images && Array.isArray(game.gameImages[0].images)) {
                  imagesArray = game.gameImages[0].images;
                }
                // ถ้า gameImages เป็น array ของ images โดยตรง (backward compatibility)
                else if (game.gameImages[0] && 'url' in game.gameImages[0]) {
                  imagesArray = game.gameImages as unknown as GameImage[];
                }
              }
              
              const coverImage = imagesArray.length > 0 
                ? (imagesArray.find(img => img.isCover)?.url || imagesArray[0]?.url)
                : "https://firebasestorage.googleapis.com/v0/b/wowkeystore.firebasestorage.app/o/PU%20(1).jpg?alt=media&token=42da6cd0-98fa-4d3b-a607-907af9e666ab";

              return (
                <div
                  key={game.id}
                  className="bg-white rounded-lg sm:rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full group border border-gray-100"
                >
                  {/* Image Container with Overlay */}
                  <div className="relative h-40 sm:h-48 md:h-56 lg:h-64 overflow-hidden flex-shrink-0 bg-gray-200">
                    <Link href={`/products/${game.id}`}>
                      <Image
                        src={coverImage}
                        alt={game.name}
                        width={400}
                        height={400}
                        className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500"
                        loading="lazy"
                      />
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </Link>
                    
                    {/* Price Badge */}
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-[#ff9800] text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg shadow-lg font-bold text-xs sm:text-sm md:text-base">
                      ฿{game.price.toLocaleString()}
                    </div>

                    {/* Favorite Button */}
                    <button
                      onClick={() => handleRemoveFavorite(game.id)}
                      disabled={removingId === game.id}
                      className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-white/90 hover:bg-white text-red-500 p-1.5 sm:p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110 disabled:opacity-50"
                    >
                      {removingId === game.id ? (
                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      ) : (
                        <Heart className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" />
                      )}
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-3 sm:p-3.5 md:p-4 flex-grow flex flex-col">
                    <Link href={`/products/${game.id}`}>
                      <h4 className="font-bold text-sm sm:text-base md:text-lg text-gray-900 mb-1.5 sm:mb-2 line-clamp-2 hover:text-[#ff9800] transition-colors min-h-[2.5rem] sm:min-h-[2.8rem] md:min-h-[3rem]">
                        {game.name}
                      </h4>
                    </Link>
                    
                    <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mb-2 sm:mb-3 flex-grow leading-relaxed">
                      {typeof game.description === 'string' 
                        ? game.description 
                        : 'ไม่มีรายละเอียด'}
                    </p>
                    
                    {/* Categories Tags */}
                    {game.categories && game.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2 sm:mb-3">
                        {game.categories.slice(0, 2).map((category) => (
                          <span 
                            key={typeof category === 'string' ? category : category.id}
                            className="text-[10px] sm:text-xs bg-gradient-to-r from-orange-50 to-orange-100 text-[#ff9800] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-medium border border-orange-200"
                          >
                            {typeof category === 'string' ? category : category.name}
                          </span>
                        ))}
                        {game.categories.length > 2 && (
                          <span className="text-[10px] sm:text-xs text-gray-400 px-1 py-0.5 sm:py-1">+{game.categories.length - 2}</span>
                        )}
                      </div>
                    )}
                    
                    {/* Action Button */}
                    <Link href={`/products/${game.id}`} className="mt-auto">
                      <button className="w-full bg-gradient-to-r from-[#ff9800] to-[#ff6f00] hover:from-[#e08800] hover:to-[#e06000] text-white py-1.5 sm:py-2 md:py-2.5 rounded-md sm:rounded-lg flex items-center justify-center transition-all duration-300 font-medium text-xs sm:text-sm md:text-base shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                        <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        <span className="hidden sm:inline">ดูรายละเอียด</span>
                        <span className="sm:hidden">ดูสินค้า</span>
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
