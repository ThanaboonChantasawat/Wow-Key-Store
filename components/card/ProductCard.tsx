'use client'
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Heart, ShoppingCart } from "lucide-react";
import { Game, GameImage } from "@/lib/types";
import Image from "next/image";
import { useState } from "react";

const ProductCard = ({ game }: { game: Game }) => {
  const { name, gameImages, description, price } = game;
  
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
    <Card className="mb-8 bg-white border-gray-100">
      <CardContent className="p-6">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="space-y-4">
            <div className="relative w-full h-[500px]">
              <Image
                src={getDisplayImage()}
                sizes="400px"
                alt={name}
                fill
                className="object-cover rounded-md"
              />
            </div>
            
            {/* Thumbnail Gallery */}
            {finalGameImages && finalGameImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {finalGameImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative w-16 h-16 flex-shrink-0 rounded border-2 overflow-hidden ${
                      selectedImageIndex === index 
                        ? 'border-[#ff9800]' 
                        : 'border-gray-200 hover:border-gray-300'
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
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-[#000000] mb-2">{name}</h1>
              <div className="flex gap-4 text-[#999999] text-sm">
                <span>100 ขายแล้ว</span>
                <span>200 เข้าชมแล้ว</span>
              </div>
            </div>

            <div
              className="bg-gray-100 text-orange-400
                font-bold text-2xl px-4 py-2 rounded inline-block
                w-full
                "
            >
              {price}฿
            </div>

            <div>
              <h3 className="font-semibold text-[#000000] mb-2">รายละเอียด</h3>
              <p className="text-[#3c3c3c] text-sm leading-relaxed">
                {description}
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button className="bg-[#ff9800] hover:bg-[#ff9800]/90 text-white px-8 py-2 rounded">
                <ShoppingCart className="w-4 h-4 mr-2" />
                ใส่ตะกร้า
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="border-[#d9d9d9] hover:bg-[#f2f2f4]"
              >
                <Heart className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
export default ProductCard;
