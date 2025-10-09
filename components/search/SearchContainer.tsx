"use client";

import React from 'react';
import GameListWithFilter from '@/components/game/GameListWithFilter';
import Link from 'next/link';

export default function SearchContainer() {
  return (
    <section className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <GameListWithFilter 
          title="เกมยอดนิยม" 
          limit={6} 
          showCategoryFilter={false}
        />
        <div className="text-center mt-8">
          <Link href="/products" className="inline-block bg-[#ff9800] hover:bg-[#e08800] text-white px-8 py-3 rounded-lg font-medium transition-colors">
            ดูสินค้าทั้งหมด
          </Link>
        </div>
      </div>
    </section>
  );
}
