import {
  ShoppingCart,
  Heart,
  Star,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";

// Generate static params for static export
export async function generateStaticParams() {
  // สร้าง static paths สำหรับ demo
  const ids = ['1', '2', '3', '4', '5']
  
  return ids.map((id) => ({
    id: id,
  }))
}

const ProductDetailPage = () => {
  return (
    <div className="min-h-screen bg-[#f2f2f4]">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Product Card */}
        <Card className="mb-8 bg-white border-gray-100">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Product Image */}
              <div className="relative">
                <Image
                  src={"/landscape-placeholder-svgrepo-com.svg"}
                  alt=""
                  width={400}
                  height={200}
                  className="w-full"
                />
              </div>

              {/* Product Details */}
              <div className="space-y-4">
                <div>
                  <h1 className="text-3xl font-bold text-[#000000] mb-2">
                    Rov
                  </h1>
                  <div className="flex gap-4 text-[#999999] text-sm">
                    <span>100 ชายเมล์ว</span>
                    <span>200 เข้าชมแล้ว</span>
                  </div>
                </div>

                <div
                  className="bg-gray-100 text-orange-400
                font-bold text-2xl px-4 py-2 rounded inline-block
                w-full
                "
                >
                  200฿
                </div>

                <div>
                  <h3 className="font-semibold text-[#000000] mb-2">
                    รายละเอียด
                  </h3>
                  <p className="text-[#3c3c3c] text-sm leading-relaxed">
                    Lorem Ipsum is simply dummy text of the printing and
                    typesetting industry. Lorem Ipsum has been the industry&apos;s
                    standard dummy text ever since the 1500s, when an unknown
                    printer took a galley of type and scrambled it to make a
                    type specimen book.
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

        {/* Shop Information */}
        {/* Shop Information */}
        <Card className="bg-white border-[#d9d9d9] mb-8">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6">
              {/* Shop Avatar */}
              <div className="w-20 h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 flex-shrink-0">
                  <div className="w-full h-full bg-[#f2f2f4] rounded-full flex items-center justify-center border-2 border-[#d9d9d9] overflow-hidden hover:shadow-lg transition-shadow">
                    <Link href={"/sellerprofile/{id}"}>
                      <Image
                        src={"/landscape-placeholder-svgrepo-com.svg"}
                        alt=""
                        width={400}
                        height={200}
                        className="object-contain"
                      />
                    </Link>
                  </div>
              </div>

              {/* Content Container */}
              <div className="flex-1 w-full">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 lg:gap-8">
                  {/* Shop Details */}
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-[#000000] mb-2">
                      Lorem ipsum dolor sit amet.
                    </h2>
                    <p className="text-[#999999] text-sm md:text-base mb-4">
                      เข้าสู่ระบบล่าสุดเมื่อ 1 ชั่วโมง ที่ผ่านมา
                    </p>

                    <Link href={"/sellerprofile/1"}>
                      <Button
                        variant="outline"
                        className="border-[#d9d9d9] text-[#3c3c3c] hover:bg-[#f2f2f4] w-full sm:w-auto px-4 md:px-6"
                      >
                        <Store className="w-4 h-4 mr-2" />
                        ดูร้านค้า
                      </Button>
                    </Link>
                  </div>

                  {/* Shop Stats */}
                  <div className="lg:text-right space-y-3 lg:min-w-[220px] bg-gray-50 lg:bg-transparent p-4 lg:p-0 rounded-lg lg:rounded-none">
                    <div className="flex items-center justify-between lg:justify-end gap-2 mb-3">
                      <span className="text-[#3c3c3c] text-sm md:text-base font-medium">
                        คะแนนร้านค้า
                      </span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className="w-4 h-4 md:w-5 md:h-5 fill-[#fdd835] text-[#fdd835]"
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between lg:justify-between gap-4 text-sm md:text-base">
                        <span className="text-[#999999]">รายการสินค้า</span>
                        <span className="text-[#000000] font-semibold">
                          9 รายการ
                        </span>
                      </div>
                      <div className="flex justify-between lg:justify-between gap-4 text-sm md:text-base">
                        <span className="text-[#999999]">ขายแล้ว</span>
                        <span className="text-[#000000] font-semibold">
                          20 รายการ
                        </span>
                      </div>
                      <div className="flex justify-between lg:justify-between gap-4 text-sm md:text-base">
                        <span className="text-[#999999]">ตรงตามกำหนด</span>
                        <span className="text-[#000000] font-semibold">
                          100%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Related Products Section */}
        <Card className="bg-white border-[#d9d9d9]">
          <CardContent className="p-4 md:p-6">
            <h3 className="text-lg md:text-xl font-bold text-[#000000] mb-4 md:mb-6">
              สินค้าอื่นจากร้านนี้
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="bg-gray-50 rounded-lg p-3 hover:shadow-md transition-shadow"
                >
                  <div className="aspect-square bg-gray-200 rounded-lg mb-2 overflow-hidden">
                    <Link href={"/products/{id}"}>
                      <Image
                        src={"/landscape-placeholder-svgrepo-com.svg"}
                        alt=""
                        width={400}
                        height={200}
                        className="object-contain"
                      />
                    </Link>
                  </div>
                  <h4 className="text-sm font-medium text-[#000000] mb-1 truncate">
                    สินค้า {item}
                  </h4>
                  <p className="text-[#ff9800] font-bold text-sm">200฿</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ProductDetailPage;
