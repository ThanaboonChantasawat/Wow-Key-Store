import { Store, Star, Package, ShoppingBag, Search, MapPin, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { getAllShops } from "@/lib/shop-service";

export default async function ShopsPage() {
  // Fetch all active shops
  let allShops: Awaited<ReturnType<typeof getAllShops>> = [];
  
  try {
    allShops = await getAllShops('active');
  } catch (error) {
    console.error("Failed to fetch shops:", error);
    // Return empty array on error
    allShops = [];
  }
  
  // Sort by rating and total sales
  const shops = allShops.sort((a, b) => {
    // First by rating
    if (b.rating !== a.rating) {
      return b.rating - a.rating;
    }
    // Then by total sales
    return b.totalSales - a.totalSales;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-orange-500 via-[#ff9800] to-orange-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Store className="w-12 h-12" />
              <h1 className="text-4xl md:text-5xl font-bold">ร้านค้าทั้งหมด</h1>
            </div>
            <p className="text-xl text-white/90 mb-8">
              เลือกซื้อจากร้านค้าที่ผ่านการรับรอง พร้อมบริการคุณภาพ
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <Store className="w-8 h-8 mx-auto mb-2" />
                <div className="text-3xl font-bold">{shops.length}</div>
                <div className="text-sm text-white/80">ร้านค้า</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <Package className="w-8 h-8 mx-auto mb-2" />
                <div className="text-3xl font-bold">
                  {shops.reduce((sum, shop) => sum + shop.totalProducts, 0)}
                </div>
                <div className="text-sm text-white/80">สินค้า</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2" />
                <div className="text-3xl font-bold">
                  {shops.reduce((sum, shop) => sum + shop.totalSales, 0)}
                </div>
                <div className="text-sm text-white/80">ยอดขาย</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <Star className="w-8 h-8 mx-auto mb-2 fill-white" />
                <div className="text-3xl font-bold">
                  {shops.length > 0 
                    ? (shops.reduce((sum, shop) => sum + shop.rating, 0) / shops.length).toFixed(1)
                    : "0.0"
                  }
                </div>
                <div className="text-sm text-white/80">คะแนนเฉลี่ย</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {shops.length === 0 ? (
          /* Empty State */
          <Card className="border-2 border-dashed">
            <CardContent className="p-12 text-center">
              <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                ยังไม่มีร้านค้าในระบบ
              </h3>
              <p className="text-gray-600 mb-6">
                เป็นคนแรกที่เปิดร้านค้ากับเรา
              </p>
              <Link href="/seller">
                <Button className="bg-[#ff9800] hover:bg-[#e08800]">
                  <Store className="w-4 h-4 mr-2" />
                  เปิดร้านค้าเลย
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Filter & Sort Section */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="ค้นหาร้านค้า..."
                  className="pl-10 border-2 focus:border-[#ff9800]"
                />
              </div>
              <select className="px-4 py-2 border-2 rounded-md focus:border-[#ff9800] focus:outline-none">
                <option value="rating">เรียงตามคะแนน</option>
                <option value="sales">เรียงตามยอดขาย</option>
                <option value="products">เรียงตามจำนวนสินค้า</option>
                <option value="newest">ล่าสุด</option>
              </select>
            </div>

            {/* Top Shops Section */}
            {shops.slice(0, 3).some(shop => shop.rating >= 4.5 || shop.totalSales >= 50) && (
              <div className="mb-12">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-6 h-6 text-[#ff9800]" />
                  <h2 className="text-2xl font-bold text-gray-900">
                    ร้านค้ายอดนิยม
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {shops
                    .filter(shop => shop.rating >= 4.5 || shop.totalSales >= 50)
                    .slice(0, 3)
                    .map((shop, index) => (
                      <Link key={shop.shopId} href={`/sellerprofile/${shop.ownerId}`}>
                        <Card className="group hover:shadow-2xl transition-all duration-300 border-2 border-[#ff9800]/20 hover:border-[#ff9800] relative overflow-hidden">
                          {/* Badge */}
                          <div className="absolute top-4 right-4 z-10">
                            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                              <Star className="w-3 h-3 fill-white" />
                              TOP {index + 1}
                            </div>
                          </div>
                          
                          <CardContent className="p-6">
                            {/* Logo */}
                            <div className="relative w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-4 border-[#ff9800] group-hover:scale-110 transition-transform">
                              <Image
                                src={shop.logoUrl || "/landscape-placeholder-svgrepo-com.svg"}
                                alt={shop.shopName}
                                fill
                                className="object-cover"
                              />
                            </div>

                            {/* Shop Info */}
                            <div className="text-center">
                              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#ff9800] transition-colors">
                                {shop.shopName}
                              </h3>
                              
                              {/* Rating */}
                              <div className="flex items-center justify-center gap-1 mb-3">
                                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                <span className="font-bold text-lg">{shop.rating.toFixed(1)}</span>
                                <span className="text-gray-500 text-sm">({shop.totalSales} ขาย)</span>
                              </div>

                              {/* Description */}
                              <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                                {shop.description || "ร้านค้าคุณภาพ พร้อมให้บริการ"}
                              </p>

                              {/* Stats */}
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="bg-orange-50 rounded-lg p-2">
                                  <Package className="w-4 h-4 text-[#ff9800] mx-auto mb-1" />
                                  <div className="font-bold text-gray-900">{shop.totalProducts}</div>
                                  <div className="text-gray-600 text-xs">สินค้า</div>
                                </div>
                                <div className="bg-green-50 rounded-lg p-2">
                                  <ShoppingBag className="w-4 h-4 text-green-600 mx-auto mb-1" />
                                  <div className="font-bold text-gray-900">{shop.totalSales}</div>
                                  <div className="text-gray-600 text-xs">ขายแล้ว</div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                </div>
              </div>
            )}

            {/* All Shops Grid */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                ร้านค้าทั้งหมด ({shops.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {shops.map((shop) => (
                <Link key={shop.shopId} href={`/sellerprofile/${shop.ownerId}`}>
                  <Card className="group hover:shadow-xl transition-all duration-300 border hover:border-[#ff9800] h-full">
                    <CardContent className="p-4">
                      {/* Logo */}
                      <div className="relative w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-2 border-gray-200 group-hover:border-[#ff9800] group-hover:scale-105 transition-all">
                        <Image
                          src={shop.logoUrl || "/landscape-placeholder-svgrepo-com.svg"}
                          alt={shop.shopName}
                          fill
                          className="object-cover"
                        />
                      </div>

                      {/* Verified Badge */}
                      <div className="text-center mb-3">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900 group-hover:text-[#ff9800] transition-colors line-clamp-1">
                            {shop.shopName}
                          </h3>
                          {shop.verificationStatus === 'verified' && (
                            <div className="flex-shrink-0">
                              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-bold">✓</span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Rating */}
                        <div className="flex items-center justify-center gap-1">
                          <Star className={`w-4 h-4 ${shop.rating > 0 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                          <span className="text-sm font-semibold">
                            {shop.rating.toFixed(1)}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({shop.totalSales})
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-gray-600 text-center line-clamp-2 mb-3 min-h-[2.5rem]">
                        {shop.description || "ร้านค้าคุณภาพ"}
                      </p>

                      {/* Stats */}
                      <div className="flex items-center justify-around text-xs pt-3 border-t border-gray-100">
                        <div className="text-center">
                          <div className="font-bold text-gray-900">{shop.totalProducts}</div>
                          <div className="text-gray-500">สินค้า</div>
                        </div>
                        <div className="w-px h-8 bg-gray-200"></div>
                        <div className="text-center">
                          <div className="font-bold text-gray-900">{shop.totalSales}</div>
                          <div className="text-gray-500">ยอดขาย</div>
                        </div>
                        <div className="w-px h-8 bg-gray-200"></div>
                        <div className="text-center">
                          <div className="font-bold text-[#ff9800]">
                            ฿{(shop.totalRevenue / 1000).toFixed(1)}K
                          </div>
                          <div className="text-gray-500">รายได้</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}