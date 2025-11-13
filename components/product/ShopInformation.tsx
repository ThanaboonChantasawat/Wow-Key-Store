"use client"

import { useState, useEffect } from "react";
import {
  Star,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { getShopById } from "@/lib/shop-client";
import type { Shop } from "@/lib/shop-client";

interface ShopInformationProps {
  shopId: string;
}

const ShopInformation = ({ shopId }: ShopInformationProps) => {
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadShop = async () => {
      try {
        setLoading(true);
        const shopData = await getShopById(shopId);
        setShop(shopData);
      } catch (error) {
        console.error("Error loading shop:", error);
      } finally {
        setLoading(false);
      }
    };

    if (shopId) {
      loadShop();
    }
  }, [shopId]);

  if (loading) {
    return (
      <Card className="bg-white border-[#d9d9d9] shadow-sm">
        <CardContent className="p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="flex-1 w-full space-y-3">
              <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!shop) {
    return (
      <Card className="bg-white border-[#d9d9d9] shadow-sm">
        <CardContent className="p-4 sm:p-6 lg:p-8">
          <div className="text-center py-8 text-gray-500">
            ไม่พบข้อมูลร้านค้า
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate completion rate (placeholder - implement actual logic later)
  const completionRate = 100;

  return (
    <Card className="bg-white border-[#d9d9d9] shadow-sm">
      <CardContent className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
          {/* Shop Avatar */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 flex-shrink-0">
            <Link href={`/sellerprofile/${shop.ownerId}`}>
              <div className="w-full h-full bg-[#f2f2f4] rounded-full flex items-center justify-center border-2 border-[#d9d9d9] overflow-hidden hover:shadow-lg hover:border-[#ff9800] transition-all duration-200">
                {shop.logoUrl ? (
                  <Image
                    src={shop.logoUrl}
                    alt={shop.shopName}
                    width={96}
                    height={96}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <Store className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                )}
              </div>
            </Link>
          </div>

          {/* Content Container */}
          <div className="flex-1 w-full">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 lg:gap-8">
              {/* Shop Details */}
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-base sm:text-lg lg:text-xl font-bold text-[#000000] mb-1 sm:mb-2">
                  {shop.shopName}
                </h2>
                <p className="text-[#999999] text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2">
                  {shop.description}
                </p>

                <Link href={`/sellerprofile/${shop.ownerId}`}>
                  <Button
                    variant="outline"
                    className="border-[#d9d9d9] text-[#3c3c3c] hover:bg-[#f2f2f4] hover:border-[#ff9800] w-full sm:w-auto px-4 sm:px-6 text-sm sm:text-base transition-all duration-200"
                  >
                    <Store className="w-4 h-4 mr-2" />
                    ดูร้านค้า
                  </Button>
                </Link>
              </div>

              {/* Shop Stats */}
              <div className="lg:text-right space-y-3 lg:min-w-[240px] bg-gradient-to-br from-gray-50 to-gray-100 lg:bg-none p-4 sm:p-5 lg:p-0 rounded-xl lg:rounded-none shadow-sm lg:shadow-none">
                <div className="flex items-center justify-between lg:justify-end gap-2 pb-3 border-b border-gray-200 lg:border-0">
                  <span className="text-[#3c3c3c] text-sm sm:text-base font-semibold">
                    คะแนนร้านค้า
                  </span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 sm:w-5 sm:h-5 ${
                          star <= Math.round(shop.rating)
                            ? "fill-[#fdd835] text-[#fdd835]"
                            : "fill-gray-300 text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-2.5">
                  <div className="flex justify-between items-center gap-4 text-xs sm:text-sm lg:text-base">
                    <span className="text-[#666666] font-medium">รายการสินค้า</span>
                    <span className="text-[#000000] font-bold text-sm sm:text-base">
                      {shop.totalProducts} รายการ
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-4 text-xs sm:text-sm lg:text-base">
                    <span className="text-[#666666] font-medium">ขายแล้ว</span>
                    <span className="text-[#000000] font-bold text-sm sm:text-base">
                      {shop.totalSales} รายการ
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-4 text-xs sm:text-sm lg:text-base">
                    <span className="text-[#666666] font-medium">ตรงตามกำหนด</span>
                    <span className="text-green-600 font-bold text-sm sm:text-base">{completionRate}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
export default ShopInformation;
