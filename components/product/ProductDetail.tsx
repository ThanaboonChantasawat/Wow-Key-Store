'use client'
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Heart, ShoppingCart, Loader2 } from "lucide-react";
import { Game, GameImage } from "@/lib/types";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-context";
import { addToFavorites, removeFromFavorites, isFavorited } from "@/lib/favorites-service";
import { addToCart, removeFromCart, isInCart } from "@/lib/cart-service";

const ProductCard = ({ game }: { game: Game }) => {
  const { name, gameImages, description, price } = game;
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [checkingFavorite, setCheckingFavorite] = useState(true);
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [checkingCart, setCheckingCart] = useState(true);
  
  // แยก images array จาก gameImages structure
  const getImagesArray = (): GameImage[] => {
    console.log('Raw gameImages from database:', gameImages);
    
    // ถ้าไม่มี gameImages หรือเป็น array ว่าง
    if (!gameImages || gameImages.length === 0) {
      return [];
    }
    
    // ถ้า gameImages[0] มี images array
    if (gameImages[0] && gameImages[0].images && Array.isArray(gameImages[0].images)) {
      console.log('Found images in gameImages[0].images:', gameImages[0].images);
      return gameImages[0].images;
    }
    
    // ถ้า gameImages เป็น array ของ images โดยตรง (backward compatibility)
    // ต้องแปลง type เพราะใน database อาจจะเป็นโครงสร้างเก่า
    if (gameImages[0] && 'url' in gameImages[0]) {
      console.log('gameImages is direct array of image objects:', gameImages);
      return gameImages as unknown as GameImage[];
    }
    
    return [];
  };
  
  const finalGameImages: GameImage[] = getImagesArray();
  
  // Initialize with cover image index or 0
  const getInitialImageIndex = () => {
    if (!finalGameImages || finalGameImages.length === 0) return 0;
    const coverIndex = finalGameImages.findIndex(img => img.isCover);
    return coverIndex !== -1 ? coverIndex : 0;
  };
  
  const [selectedImageIndex, setSelectedImageIndex] = useState(() => getInitialImageIndex());

  // Check if game is favorited
  useEffect(() => {
    const checkFavorite = async () => {
      if (!user || !game.id) {
        setCheckingFavorite(false);
        return;
      }

      try {
        const favorited = await isFavorited(user.uid, game.id);
        setIsFavorite(favorited);
      } catch (error) {
        console.error("Error checking favorite:", error);
      } finally {
        setCheckingFavorite(false);
      }
    };

    checkFavorite();
  }, [user, game.id]);

  // Check if game is in cart
  useEffect(() => {
    const checkCart = async () => {
      if (!user || !game.id) {
        setCheckingCart(false);
        return;
      }

      try {
        const inCart = await isInCart(user.uid, game.id);
        setIsAddedToCart(inCart);
      } catch (error) {
        console.error("Error checking cart:", error);
      } finally {
        setCheckingCart(false);
      }
    };

    checkCart();
  }, [user, game.id]);

  // Handle cart toggle
  const handleCartToggle = async () => {
    if (!user) {
      alert("กรุณาเข้าสู่ระบบเพื่อใส่ตะกร้า");
      return;
    }

    try {
      setCartLoading(true);
      
      if (isAddedToCart) {
        await removeFromCart(user.uid, game.id);
        setIsAddedToCart(false);
      } else {
        // Check if this is a product by looking at the game object structure
        const itemType = (game as any).shopId ? 'product' : 'game';
        await addToCart(user.uid, game.id, 1, itemType);
        setIsAddedToCart(true);
      }
    } catch (error) {
      console.error("Error toggling cart:", error);
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setCartLoading(false);
    }
  };

  // Handle favorite toggle
  const handleFavoriteToggle = async () => {
    if (!user) {
      alert("กรุณาเข้าสู่ระบบเพื่อเพิ่มในรายการที่อยากได้");
      return;
    }

    try {
      setFavoriteLoading(true);
      
      if (isFavorite) {
        await removeFromFavorites(user.uid, game.id);
        setIsFavorite(false);
      } else {
        // Check if this is a product by looking at the game object structure
        const itemType = (game as any).shopId ? 'product' : 'game';
        await addToFavorites(user.uid, game.id, itemType);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setFavoriteLoading(false);
    }
  };

  // Get display image URL
  const getDisplayImage = () => {
    console.log('ProductCard - original gameImages:', gameImages);
    console.log('ProductCard - finalGameImages:', finalGameImages);
    console.log('ProductCard - selectedImageIndex:', selectedImageIndex);
    
    if (!finalGameImages || finalGameImages.length === 0) {
      console.log('ProductCard - No finalGameImages, using Firebase fallback');
      const firebaseFallback = "https://firebasestorage.googleapis.com/v0/b/wowkeystore.firebasestorage.app/o/PU%20(1).jpg?alt=media&token=42da6cd0-98fa-4d3b-a607-907af9e666ab";
      return firebaseFallback;
    }
    
    const selectedImage = finalGameImages[selectedImageIndex]?.url;
    const firstImage = finalGameImages[0]?.url;
    
    console.log('ProductCard - selectedImage:', selectedImage);
    console.log('ProductCard - firstImage:', firstImage);
    
    const firebaseFallback = "https://firebasestorage.googleapis.com/v0/b/wowkeystore.firebasestorage.app/o/PU%20(1).jpg?alt=media&token=42da6cd0-98fa-4d3b-a607-907af9e666ab";
    const finalUrl = selectedImage || firstImage || firebaseFallback;
    console.log('ProductCard - final URL:', finalUrl);
    
    return finalUrl;
  };

  return (
    <Card className="mb-4 sm:mb-6 lg:mb-8 bg-white border-gray-100 shadow-sm">
      <CardContent className="p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Product Image */}
          <div className="space-y-3 sm:space-y-4">
            <div className="relative w-full h-[300px] sm:h-[400px] lg:h-[500px] rounded-lg overflow-hidden">
              <Image
                src={getDisplayImage()}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px"
                alt={name}
                fill
                className="object-cover"
                priority
              />
            </div>
            
            {/* Thumbnail Gallery */}
            {finalGameImages && finalGameImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {finalGameImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 flex-shrink-0 rounded-md border-2 overflow-hidden transition-all duration-200 ${
                      selectedImageIndex === index 
                        ? 'border-[#ff9800] scale-105' 
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <Image
                      src={image.url}
                      alt={`${name} image ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-4 sm:space-y-5 lg:space-y-6">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#000000] mb-2 sm:mb-3">
                {name}
              </h1>
              <div className="flex flex-wrap gap-3 sm:gap-4 text-[#999999] text-xs sm:text-sm">
                <span className="flex items-center">
                  <span className="font-medium text-[#000000] mr-1">100</span> ขายแล้ว
                </span>
                <span className="flex items-center">
                  <span className="font-medium text-[#000000] mr-1">200</span> เข้าชมแล้ว
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-50 to-orange-100 text-[#ff9800] font-bold text-xl sm:text-2xl lg:text-3xl px-4 sm:px-6 py-3 sm:py-4 rounded-lg shadow-sm border border-orange-200">
              ฿{price.toLocaleString()}
            </div>

            <div className="bg-gray-50 p-4 sm:p-5 rounded-lg">
              <h3 className="font-semibold text-[#000000] mb-2 sm:mb-3 text-base sm:text-lg">
                รายละเอียด
              </h3>
              <p className="text-[#3c3c3c] text-sm sm:text-base leading-relaxed whitespace-pre-line">
                {description}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2 sm:pt-4">
              <Button 
                variant="outline"
                onClick={handleCartToggle}
                disabled={cartLoading || checkingCart}
                className={`px-6 sm:px-8 py-5 sm:py-6 rounded-lg text-base sm:text-lg font-semibold shadow-md transition-all duration-200 flex-1 ${
                  isAddedToCart
                    ? " border-red-400 border-2 text-red-400 hover:bg-red-400  hover:border-red-700"
                    : "border-2 border-[#d9d9d9] text-gray-700 hover:border-[#ff9800] hover:text-[#ff9800] hover:bg-orange-50"
                }`}
              >
                {cartLoading || checkingCart ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  </>
                ) : (
                  <>
                    <ShoppingCart 
                      className="w-5 h-5 mr-2" 
                      fill={isAddedToCart ? "currentColor" : "none"}
                    />
                  </>
                )}
                <span>{isAddedToCart ? "เอาออกจากตะกร้า" : "ใส่ตะกร้า"}</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleFavoriteToggle}
                disabled={favoriteLoading || checkingFavorite}
                className={`px-6 sm:px-8 py-5 sm:py-6 rounded-lg text-base sm:text-lg font-semibold shadow-md transition-all duration-200 flex-1 ${
                  isFavorite 
                    ? " border-red-400 border-2 text-red-400 hover:bg-red-400  hover:border-red-700" 
                    : "border-2 border-[#d9d9d9] text-gray-700 hover:border-[#ff9800] hover:text-[#ff9800] hover:bg-orange-50"
                }`}
              >
                {favoriteLoading || checkingFavorite ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Heart 
                    className="w-5 h-5 mr-2" 
                    fill={isFavorite ? "currentColor" : "none"}
                  />
                )}
                <span>{isFavorite ? "ลบออกจากรายการที่อยากได้" : "เพิ่มในรายการที่อยากได้"}</span>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
export default ProductCard;
