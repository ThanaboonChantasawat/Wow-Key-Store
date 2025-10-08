"use client";

import GameListWithFilter from "@/components/game/GameListWithFilter";

export default function Products() {
  return (
    <div>
      <div className="min-h-screen bg-[#f2f2f4]">
        <div className="max-w-10/12 mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Main Content */}
          <main className="flex-1 order-1 lg:order-2">
            <div className="bg-[#292d32] text-[#ffffff] rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="flex items-center justify-between">
                <h1 className="text-xl sm:text-2xl font-bold">สินค้า</h1>
              </div>
            </div>

            <div className="bg-[#ffffff] rounded-lg p-4 sm:p-6">
              <GameListWithFilter title="" showCategoryFilter={true} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
