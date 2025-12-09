'use client'

import { Loader2, Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useGames } from "@/hooks/useFirestore";
import { GameWithCategories, GameImage } from "@/lib/types";
import { useAuth } from "@/components/auth-context";
import { addToFavorites, removeFromFavorites, isFavorited } from "@/lib/favorites-client";

interface GameCardProps {
  games?: GameWithCategories[];
  loading?: boolean;
  error?: string | null;
  limit?: number;
}

const GameCard = ({ games: propGames, loading: propLoading, error: propError, limit }: GameCardProps) => {
  const { games: hookGames, loading: hookLoading, error: hookError } = useGames();
  const { user } = useAuth();
  const [loadingImages, setLoadingImages] = useState<{ [key: string]: boolean }>({});
  const [favorites, setFavorites] = useState<{ [key: string]: boolean }>({});
  const [favoriteLoading, setFavoriteLoading] = useState<{ [key: string]: boolean }>({});
  
  // ใช้ props ก่อน ถ้าไม่มีให้ใช้ hook
  const games = propGames || hookGames;
  const loading = propLoading !== undefined ? propLoading : hookLoading;
  const error = propError !== undefined ? propError : hookError;
  
  // จำกัดจำนวนเกมที่แสดงถ้ามี limit และใช้ useMemo เพื่อป้องกัน re-render
  const displayGames = useMemo(() => {
    return limit ? games.slice(0, limit) : games;
  }, [games, limit]);

  // Check favorites for all games
  useEffect(() => {
    if (!user || displayGames.length === 0) return;
    
    let isMounted = true;
    
    const checkFavorites = async () => {
      const favoriteStatuses: { [key: string]: boolean } = {};
      
      for (const game of displayGames) {
        try {
          const favorited = await isFavorited(user.uid, game.id);
          if (isMounted) {
            favoriteStatuses[game.id] = favorited;
          }
        } catch (error) {
          console.error(`Error checking favorite for ${game.id}:`, error);
        }
      }
      
      if (isMounted) {
        setFavorites(favoriteStatuses);
      }
    };

    checkFavorites();
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, displayGames.length]);

  // Handle favorite toggle
  const handleFavoriteToggle = async (gameId: string, e: React.MouseEvent, game?: GameWithCategories) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      alert("กรุณาเข้าสู่ระบบเพื่อเพิ่มในรายการที่อยากได้");
      return;
    }

    try {
      setFavoriteLoading(prev => ({ ...prev, [gameId]: true }));
      
      // Check if this is a product by looking for shopId
      const itemType = (game as GameWithCategories & { shopId?: string })?.shopId ? 'product' : 'game';
      
      if (favorites[gameId]) {
        await removeFromFavorites(user.uid, gameId);
        setFavorites(prev => ({ ...prev, [gameId]: false }));
      } else {
        await addToFavorites(user.uid, gameId, itemType);
        setFavorites(prev => ({ ...prev, [gameId]: true }));
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setFavoriteLoading(prev => ({ ...prev, [gameId]: false }));
    }
  };

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
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4  gap-4 sm:gap-5 lg:gap-6">
      
      {displayGames.map((game) => (
        <Link 
          key={game.id} 
          href={`/products/${game.id}`}
          className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-2xl hover:shadow-orange-100 transition-all duration-300 flex flex-col h-full group border-2 border-gray-200 hover:border-[#ff9800] hover:scale-[1.02] cursor-pointer"
        >
          {/* Image Container with Overlay */}
          <div className="relative w-full aspect-square overflow-hidden flex-shrink-0 bg-gradient-to-br from-gray-900 to-gray-800">
            {/* Skeleton Loader */}
            {loadingImages[game.id] !== false && (
              <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              </div>
            )}
            
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
                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iIzIxMjEyMSIvPjwvc3ZnPg=="
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Price Badge */}
            <div className="absolute top-3 right-3 bg-gradient-to-r from-[#ff9800] to-[#f57c00] text-white px-3 py-2 rounded-lg shadow-lg font-bold text-sm sm:text-base">
              ฿{game.price.toLocaleString()}
            </div>

            {/* Shop Name Badge */}
            {(game as GameWithCategories & { shopName?: string }).shopName && (
              <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg flex items-center gap-2.5 max-w-[calc(100%-1.5rem)]">
                {(game as GameWithCategories & { shopLogoUrl?: string }).shopLogoUrl ? (
                  <Image
                    src={(game as GameWithCategories & { shopLogoUrl?: string }).shopLogoUrl!}
                    alt="Shop Logo"
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-md object-cover border border-gray-200 flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-md bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <span className="text-sm font-semibold text-gray-800 truncate">
                  {(game as GameWithCategories & { shopName?: string }).shopName}
                </span>
              </div>
            )}

            {/* Favorite Button */}
            <button
              onClick={(e) => handleFavoriteToggle(game.id, e, game)}
              disabled={favoriteLoading[game.id]}
              className="absolute top-3 left-3 bg-white/90 hover:bg-white text-red-500 p-2 sm:p-2.5 rounded-full shadow-lg transition-all duration-200 hover:scale-110 disabled:opacity-50 z-10"
            >
              {favoriteLoading[game.id] ? (
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
              ) : (
                <Heart 
                  className="w-5 h-5 sm:w-6 sm:h-6" 
                  fill={favorites[game.id] ? "currentColor" : "none"}
                />
              )}
            </button>
          </div>

          {/* Content */}
          <div className="p-3 sm:p-4 lg:p-5 flex-grow flex flex-col">
            <h4 className="font-bold text-base sm:text-lg text-gray-900 mb-2 line-clamp-2 hover:text-[#ff9800] transition-colors text-center min-h-[3rem]">
              {game.name}
            </h4>
            
            <p className="text-sm sm:text-base text-gray-500 text-center line-clamp-3 mb-3 overflow-hidden text-ellipsis min-h-[4rem]">
              {game.description && game.description.length > 150
                ? `${game.description.substring(0, 150)}...` 
                : game.description || 'ไม่มีคำอธิบาย'}
            </p>
            
            {/* Categories Tags */}
            {game.categories && game.categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center mb-4">
                {game.categories.slice(0, 2).map((category) => (
                  <span 
                    key={category.id}
                    className="text-xs sm:text-sm bg-gradient-to-r from-orange-50 to-orange-100 text-[#ff9800] px-2.5 py-1 rounded-full font-medium border border-orange-200"
                  >
                    {category.name}
                  </span>
                ))}
                {game.categories.length > 2 && (
                  <span className="text-xs sm:text-sm text-gray-400 px-1 py-1">+{game.categories.length - 2}</span>
                )}
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
};

export default GameCard;
