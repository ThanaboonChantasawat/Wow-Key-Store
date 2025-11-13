'use client'
import { Card, CardContent } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import { Heart, ShoppingCart, Loader2, Star, MessageCircle, Eye, TrendingUp } from "lucide-react";
import { Game, GameImage } from "@/lib/types";
import { ReviewList } from "@/components/review/review-list";
import { CommentList } from "@/components/comment/comment-list";
import { ShopCard } from "@/components/product/shop-card";
import { SimilarProducts } from "@/components/product/similar-products";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-context";
import { addToFavorites, removeFromFavorites, isFavorited } from "@/lib/favorites-client";
import { addToCart, removeFromCart, isInCart } from "@/lib/cart-client";

interface ProductStats {
  views: number
  sales: number
  rating: number
  reviewCount: number
  shopId: string
  shopName: string
}

const ProductCard = ({ game }: { game: Game }) => {
  const { name, gameImages, description, price } = game;
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [checkingFavorite, setCheckingFavorite] = useState(true);
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [checkingCart, setCheckingCart] = useState(true);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  
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

  // Fetch product stats and increment view count (unique per session)
  useEffect(() => {
    if (!game.id) return;

    const fetchStats = async () => {
      try {
        // Check if already viewed in this session
        const viewedKey = `product_viewed_${game.id}`;
        const hasViewed = sessionStorage.getItem(viewedKey);

        // Only increment view if not viewed in this session
        if (!hasViewed) {
          await fetch(`/api/products/${game.id}/view`, {
            method: 'POST',
          });
          // Mark as viewed in this session
          sessionStorage.setItem(viewedKey, 'true');
        }

        // Fetch stats
        const response = await fetch(`/api/products/${game.id}/stats`);
        if (response.ok) {
          const data = await response.json();
          console.log('Product stats:', data);
          setStats(data);
        } else {
          const errorData = await response.json();
          console.error('Stats API Error:', errorData);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, [game.id]);

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
        const itemType = (game as Game & { shopId?: string }).shopId ? 'product' : 'game';
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
        const itemType = (game as Game & { shopId?: string }).shopId ? 'product' : 'game';
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
    <>
    <Card className="mb-4 sm:mb-6 lg:mb-8 bg-white border-gray-100 shadow-sm">
      <CardContent className="p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Product Image */}
          <div className="space-y-3 sm:space-y-4">
            <div 
              className="relative w-full h-[300px] sm:h-[400px] lg:h-[500px] rounded-lg overflow-hidden cursor-zoom-in hover:opacity-95 transition-opacity"
              onClick={() => setIsImageModalOpen(true)}
            >
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
                {!statsLoading && stats && (
                  <>
                    <span className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full font-medium">
                      <TrendingUp className="w-3 h-3" />
                      <span className="font-bold text-green-800">{stats.sales}</span> ขายแล้ว
                    </span>
                    <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">
                      <Eye className="w-3 h-3" />
                      <span className="font-bold text-blue-800">{stats.views}</span> เข้าชม
                    </span>
                    {stats.reviewCount > 0 && (
                      <span className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full font-medium">
                        <Star className="w-3 h-3 fill-yellow-500" />
                        <span className="font-bold text-yellow-800">{stats.rating.toFixed(1)}</span>
                        <span className="text-yellow-600">({stats.reviewCount})</span>
                      </span>
                    )}
                  </>
                )}
                {statsLoading && (
                  <>
                    <div className="h-6 w-24 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="h-6 w-24 bg-gray-200 rounded-full animate-pulse"></div>
                  </>
                )}
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
                <span>{isFavorite ? "ลบออกจากชื่นชอบ" : "ชื่นชอบ"}</span>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Shop Card */}
    {stats && stats.shopId && (
      <div className="mt-6">
        <ShopCard shopId={stats.shopId} />
      </div>
    )}

    {/* Similar Products */}
    {game.id && (
      <div className="mt-6">
        <SimilarProducts productId={game.id} />
      </div>
    )}

    {/* Reviews and Comments Section */}
    <Card className="mt-6">
      <CardContent className="p-6">
        <Tabs defaultValue="reviews" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="reviews" className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              รีวิวสินค้า
            </TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              คำถาม & ความคิดเห็น
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="reviews">
            <ReviewList
              type="product"
              productId={game.id}
              currentUserId={user?.uid}
            />
          </TabsContent>
          
          <TabsContent value="comments">
            <CommentList
              type="product"
              shopId={(game as any).shopId || ''}
              shopName="ร้านค้า"
              productId={game.id}
              productName={game.name}
              currentUserId={user?.uid}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>

    {/* Image Modal */}
    {isImageModalOpen && (
      <div 
        className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center"
        onClick={() => setIsImageModalOpen(false)}
      >
        {/* Close Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsImageModalOpen(false);
          }}
          className="absolute top-4 right-4 z-[60] bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-2 text-white transition-all duration-200 hover:scale-110"
          aria-label="ปิด"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* Main Image Container */}
        <div className="relative w-full flex-1 flex items-center justify-center px-4 pb-24">
          <div className="relative w-full h-full max-w-6xl max-h-[calc(100vh-120px)]">
            <Image
              src={getDisplayImage()}
              alt={name}
              fill
              className="object-contain"
              onClick={(e) => e.stopPropagation()}
              priority
            />
          </div>
        </div>

        {/* Thumbnail navigation in modal */}
        {finalGameImages && finalGameImages.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pt-8 pb-4 px-4">
            <div className="flex justify-center">
              <div className="flex gap-2 overflow-x-auto max-w-4xl hide-scrollbar">
                {finalGameImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImageIndex(index);
                    }}
                    className={`relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 rounded-lg border-2 overflow-hidden transition-all duration-200 ${
                      selectedImageIndex === index 
                        ? 'border-[#ff9800] ring-2 ring-[#ff9800]/50 scale-110' 
                        : 'border-white/30 hover:border-white/60 hover:scale-105'
                    }`}
                  >
                    <Image
                      src={image.url}
                      alt={`${name} รูปที่ ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    )}
    </>
  );
};
export default ProductCard;
