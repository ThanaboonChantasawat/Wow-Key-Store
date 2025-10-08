import {
  Star,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";

const ShopInformation = () => {
  return (
    <Card className="bg-white border-[#d9d9d9] mb-8">
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6">
          {/* Shop Avatar */}
          <div className="w-20 h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 flex-shrink-0">
            <div className="w-full h-full bg-[#f2f2f4] rounded-full flex items-center justify-center border-2 border-[#d9d9d9] overflow-hidden hover:shadow-lg transition-shadow">
              <Link href={"/sellerprofile/1"}>
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
                    <span className="text-[#000000] font-semibold">100%</span>
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
