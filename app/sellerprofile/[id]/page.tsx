"use client";

import { Star, ShoppingCart, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import Image from "next/image";

const products = [
  {
    id: 1,
    name: "RoV (Arena of Valor)",
    price: "200 ฿",
    image: "/placeholder.svg?height=200&width=200",
  },
  {
    id: 2,
    name: "RoV (Arena of Valor)",
    price: "200 ฿",
    image: "/placeholder.svg?height=200&width=200",
  },
  {
    id: 3,
    name: "RoV (Arena of Valor)",
    price: "200 ฿",
    image: "/placeholder.svg?height=200&width=200",
  },
  {
    id: 4,
    name: "Garena Free Fire",
    price: "200 ฿",
    image: "/placeholder.svg?height=200&width=200",
  },
  {
    id: 5,
    name: "Garena Free Fire",
    price: "200 ฿",
    image: "/placeholder.svg?height=200&width=200",
  },
  {
    id: 6,
    name: "Garena Free Fire",
    price: "200 ฿",
    image: "/placeholder.svg?height=200&width=200",
  },
  {
    id: 7,
    name: "Marvel Snap",
    price: "200 ฿",
    image: "/placeholder.svg?height=200&width=200",
  },
  {
    id: 8,
    name: "Valorant",
    price: "200 ฿",
    image: "/placeholder.svg?height=200&width=200",
  },
  {
    id: 9,
    name: "FC Mobile",
    price: "200 ฿",
    image: "/placeholder.svg?height=200&width=200",
  },
];

const reviews = [
  {
    id: 1,
    username: "Username",
    rating: 5,
    comment:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since",
    date: "9 ม.ค. 2024",
  },
  {
    id: 2,
    username: "Username",
    rating: 5,
    comment:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since",
    date: "9 ม.ค. 2024",
  },
  {
    id: 3,
    username: "Username",
    rating: 5,
    comment:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since",
    date: "9 ม.ค. 2024",
  },
];

export default function SellerProfile() {
  return (
    <div className="min-h-screen bg-[#f2f2f4]">
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Shop Profile Section */}
        <Card className="mb-8 bg-white items-center md:items-start">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="w-40 h-40 flex items-center justify-center">
                <Link href={"/sellerprofile/{id}"}>
                  <Image
                    src={"/landscape-placeholder-svgrepo-com.svg"}
                    alt=""
                    width={400}
                    height={200}
                    className="object-contain rounded-full shadow-xl"
                  />
                </Link>
              </div>

              {/* Shop Details */}
              <div className="flex-1 w-full">
                <h1 className="text-2xl font-bold text-[#000000] mb-2">
                  ID Hunter Shop
                </h1>
                <p className="text-[#999999] text-sm mb-4">
                  เข้าสู่ระบบล่าสุดเมื่อ 1 ชั่วโมง ที่ผ่านมา
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-xl font-bold text-[#000000]">
              สินค้าสินค้าทั้งหมด
            </h2>
            <span className="text-[#999999]">จำนวน 9 รายการ</span>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card
                key={product.id}
                className="bg-white hover:shadow-lg transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="aspect-square mb-4 overflow-hidden rounded-lg">
                    <Image
                      src={"/landscape-placeholder-svgrepo-com.svg"}
                      alt=""
                      width={400}
                      height={400}
                      className="object-contain"
                    />
                  </div>
                  <h3 className="font-semibold text-[#000000] mb-2 text-sm">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-[#ff9800]">
                      {product.price}
                    </span>
                  </div>
                  <Button className="w-full mt-3 bg-[#ff9800] hover:bg-[#ff9800]/90 text-white">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    ใส่ตะกร้า
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Shop Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* About Shop */}
          <Card className="bg-white">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-[#000000] mb-4">
                ข้อมูลร้านค้า
              </h3>
              <p className="text-[#3c3c3c] text-sm leading-relaxed">
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Animi,
                perspiciatis saepe itaque minus nemo quibusdam sequi ipsam
                nesciunt ab cumque, aut totam sed voluptatibus perferendis
                inventore labore nobis ad rerum?
              </p>
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
                          className="w-4 h-4 fill-[#fdd835] text-[#fdd835]"
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#3c3c3c]">รายการสินค้า</span>
                  <span className="text-[#000000] font-semibold">9 รายการ</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#3c3c3c]">ขายแล้ว</span>
                  <span className="text-[#000000] font-semibold">
                    20 รายการ
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#3c3c3c]">ตรงตามกำหนด</span>
                  <span className="text-[#000000] font-semibold">100%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reviews Section */}
        <Card className="bg-white">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-[#000000] mb-6">
              รีวิวร้านค้า
            </h3>
            <div className="space-y-6">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="flex gap-4 pb-6 border-b border-gray-100 last:border-b-0"
                >
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarFallback className="bg-[#f2f2f4]">
                      <User className="w-5 h-5 text-[#999999]" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                      <h4 className="font-semibold text-[#000000]">
                        {review.username}
                      </h4>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= review.rating
                                  ? "fill-[#fdd835] text-[#fdd835]"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-[#999999]">
                          {review.date}
                        </span>
                      </div>
                    </div>
                    <p className="text-[#3c3c3c] text-sm leading-relaxed">
                      {review.comment}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
