'use client'

import { useState, useEffect } from "react";
import { Star, ShoppingCart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ReviewAndCommentSection } from "@/components/review/ReviewAndCommentSection";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";

interface Shop {
  shopId: string;
  ownerId: string;
  shopName: string;
  description?: string;
  logoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  lineId?: string;
  status: string;
  verificationStatus: string;
  totalProducts: number;
  totalSales: number;
  totalRevenue: number;
  rating: number;
}

interface UserProfile {
  lastLoginAt?: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  categoryId: string;
  gameId: string;
  gameName: string;
  stock: number;
  sold: number;
  status: string;
  shopId: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function SellerProfile() {
  const params = useParams();
  const id = params?.id as string;
  
  const [shop, setShop] = useState<Shop | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFoundError, setNotFoundError] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        let shopData: Shop | null = null;

        // Check if id is shopId (starts with "shop_") or ownerId
        if (id.startsWith('shop_')) {
          // Fetch by shopId
          const shopRes = await fetch(`/api/shops/${id}`);
          if (shopRes.ok) {
            const data = await shopRes.json();
            shopData = data.shop || data;
          }
        } else {
          // Fetch by ownerId
          const shopRes = await fetch(`/api/shops/get-by-owner/${id}`);
          if (shopRes.ok) {
            const data = await shopRes.json();
            shopData = data.shop || data;
          }
        }

        if (!shopData) {
          setNotFoundError(true);
          setLoading(false);
          return;
        }

        setShop(shopData);

        // Fetch user profile using ownerId from shop data
        if (shopData.ownerId) {
          try {
            const userRes = await fetch(`/api/users/${shopData.ownerId}`);
            if (userRes.ok) {
              const userData = await userRes.json();
              setUserProfile(userData);
            }
          } catch {
            console.log("Could not fetch user profile");
          }
        }

        // Fetch products
        const productsRes = await fetch(`/api/products/shop/${shopData.shopId}`);
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setNotFoundError(true);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchData();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f2f2f4]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#ff9800] mx-auto mb-4" />
          <p className="text-gray-600">กำลังโหลดข้อมูลร้านค้า...</p>
        </div>
      </div>
    );
  }

  if (notFoundError || !shop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f2f2f4]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ไม่พบร้านค้า</h1>
          <p className="text-gray-600 mb-4">ร้านค้าที่คุณค้นหาไม่มีอยู่ในระบบ</p>
          <Link href="/shops">
            <Button className="bg-[#ff9800] hover:bg-[#e08800]">
              กลับไปหน้าร้านค้าทั้งหมด
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Calculate shop stats
  const activeProducts = products.filter(p => p.status === 'active');

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
    return lastLogin.toLocaleString('th-TH');
  };
  return (
    <div className="bg-[#f2f2f4]">
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Shop Profile Section */}
        <Card className="mb-8 bg-white items-center md:items-start">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="relative w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0">
                <Image
                  src={shop.logoUrl || "/landscape-placeholder-svgrepo-com.svg"}
                  alt={shop.shopName}
                  fill
                  className="object-cover rounded-full shadow-xl border-4 border-white"
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
                    {activeProducts.length} รายการ
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#3c3c3c]">ขายแล้ว</span>
                  <span className="text-[#000000] font-semibold">
                    {shop.totalSales} รายการ
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
        <ReviewAndCommentSection
          type="shop"
          shopId={shop.shopId}
          shopName={shop.shopName}
        />
      </main>
    </div>
  );
}