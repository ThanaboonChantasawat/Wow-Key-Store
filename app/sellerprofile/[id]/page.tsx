import { Star, ShoppingCart, User, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SellerReviewsSection } from "@/components/sellerprofile/seller-reviews-section";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getShopByOwnerId } from "@/lib/shop-service";
import { getUserProfile } from "@/lib/user-service";
import { getProductsByShop } from "@/lib/product-service";

interface SellerProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function SellerProfile({ params }: SellerProfilePageProps) {
  const { id: ownerId } = await params;

  // Fetch shop data
  const shop = await getShopByOwnerId(ownerId);
  
  if (!shop) {
    notFound();
  }

  // Fetch user profile for additional info
  const userProfile = await getUserProfile(ownerId);

  // Fetch products
  const products = await getProductsByShop(shop.shopId);

  // Calculate shop stats
  const activeProducts = products.filter(p => p.status === 'active');
  const totalViews = products.reduce((sum, p) => sum + ((p as any).views || 0), 0);

  // Format last active time
  const getLastActiveTime = () => {
    if (!userProfile?.lastLoginAt) return "ไม่ทราบ";
    
    const now = new Date();
    const lastLogin = new Date(userProfile.lastLoginAt);
    const diffMs = now.getTime() - lastLogin.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "เมื่อสักครู่";
    if (diffMins < 60) return `${diffMins} นาทีที่ผ่านมา`;
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่ผ่านมา`;
    if (diffDays < 30) return `${diffDays} วันที่ผ่านมา`;
    return lastLogin.toLocaleDateString('th-TH');
  };
  return (
    <div className="bg-[#f2f2f4]">
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Shop Profile Section */}
        <Card className="mb-8 bg-white items-center md:items-start">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="w-40 h-40 flex items-center justify-center">
                <Image
                  src={shop.logoUrl || "/landscape-placeholder-svgrepo-com.svg"}
                  alt={shop.shopName}
                  width={400}
                  height={200}
                  className="object-contain rounded-full shadow-xl"
                />
              </div>

              {/* Shop Details */}
              <div className="flex-1 w-full">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-[#000000]">
                    {shop.shopName}
                  </h1>
                  {shop.verificationStatus === 'verified' && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                      ✓ ยืนยันแล้ว
                    </span>
                  )}
                </div>
                <p className="text-[#999999] text-sm mb-4">
                  เข้าสู่ระบบล่าสุดเมื่อ {getLastActiveTime()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-xl font-bold text-[#000000]">
              สินค้าทั้งหมด
            </h2>
            <span className="text-[#999999]">จำนวน {activeProducts.length} รายการ</span>
          </div>

          {/* Products Grid */}
          {activeProducts.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
              {activeProducts.map((product) => (
                <Card
                  key={product.id}
                  className="bg-white hover:shadow-lg transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="aspect-square mb-4 overflow-hidden rounded-lg bg-gray-100">
                      <Link href={`/products/${product.id}`}>
                        <Image
                          src={product.images?.[0] || "/landscape-placeholder-svgrepo-com.svg"}
                          alt={product.name}
                          width={400}
                          height={400}
                          className="object-cover w-full h-full hover:scale-105 transition-transform"
                        />
                      </Link>
                    </div>
                    <Link href={`/products/${product.id}`}>
                      <h3 className="font-semibold text-[#000000] mb-2 text-sm hover:text-[#ff9800] transition-colors">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="text-xs text-gray-500 mb-2">{product.gameName}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-[#ff9800]">
                        ฿{product.price.toLocaleString()}
                      </span>
                    </div>
                    {product.stock !== -1 && (
                      <p className="text-xs text-gray-500 mt-1">
                        คงเหลือ: {product.stock} ชิ้น
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-white">
              <CardContent className="p-12 text-center">
                <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">ร้านนี้ยังไม่มีสินค้า</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Shop Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* About Shop */}
          <Card className="bg-white">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-[#000000] mb-4">
                ข้อมูลร้านค้า
              </h3>
              <p className="text-[#3c3c3c] text-sm leading-relaxed whitespace-pre-wrap">
                {shop.description || "ยังไม่มีคำอธิบายร้านค้า"}
              </p>
              {shop.contactEmail && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">อีเมล:</span> {shop.contactEmail}
                  </p>
                </div>
              )}
              {shop.contactPhone && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">โทร:</span> {shop.contactPhone}
                  </p>
                </div>
              )}
              {shop.lineId && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">LINE ID:</span> {shop.lineId}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shop Stats */}
          <Card className="bg-white">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-[#000000] mb-4">
                คะแนนร้านค้า
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[#3c3c3c]">คะแนนร้านค้า</span>
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= Math.floor(shop.rating)
                              ? "fill-[#fdd835] text-[#fdd835]"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-semibold">
                      {shop.rating > 0 ? shop.rating.toFixed(1) : "ยังไม่มีคะแนน"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#3c3c3c]">รายการสินค้า</span>
                  <span className="text-[#000000] font-semibold">
                    {shop.totalProducts} รายการ
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#3c3c3c]">ขายแล้ว</span>
                  <span className="text-[#000000] font-semibold">
                    {shop.totalSales} รายการ
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#3c3c3c]">รายได้รวม</span>
                  <span className="text-[#000000] font-semibold">
                    ฿{shop.totalRevenue.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#3c3c3c]">สถานะร้าน</span>
                  <span className={`font-semibold ${
                    shop.status === 'active' ? 'text-green-600' :
                    shop.status === 'pending' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {shop.status === 'active' ? 'เปิดให้บริการ' :
                     shop.status === 'pending' ? 'รอการอนุมัติ' :
                     shop.status === 'suspended' ? 'ถูกระงับ' :
                     'ปิดให้บริการ'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reviews and Comments Section */}
        <SellerReviewsSection shopId={shop.shopId} shopName={shop.shopName} />
      </main>
    </div>
  );
}