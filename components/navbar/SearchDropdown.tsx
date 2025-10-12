"use client";

import React from 'react';
import { GameWithCategories } from '@/lib/types';

interface Props {
  query?: string; // optional, provided by Navbar for context/search term
  suggestionGames: GameWithCategories[];
  suggestionLoading: boolean;
  onSelectProduct: (id: string) => void;
  onViewAll: () => void;
}

export default function SearchDropdown({ query, suggestionGames, suggestionLoading, onSelectProduct, onViewAll }: Props) {
  return (
    <div className="absolute left-0 right-0 mt-2 bg-white shadow-lg rounded-lg z-50">
      <div className="p-3">
        {suggestionLoading ? (
          <div className="text-sm text-gray-500">กำลังค้นหา...</div>
        ) : suggestionGames.length === 0 ? (
          <div className="text-sm text-gray-500">ไม่พบสินค้า</div>
        ) : (
          <ul className="divide-y">
            {suggestionGames.slice(0, 4).map((g) => (
              <li key={g.id} className="py-2">
                <a
                  onClick={() => onSelectProduct(g.id)}
                  className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
                >
                  <img
                    src={g.gameImages?.[0]?.images?.[0]?.url || '/landscape-placeholder-svgrepo-com.svg'}
                    alt={g.name}
                    className="w-12 h-8 object-cover rounded"
                  />
                  <div>
                    <div className="text-sm font-medium">{g.name}</div>
                    <div className="text-xs text-gray-500">{g.price?.toLocaleString()} ฿</div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="border-t p-3 text-right">
        <button onClick={onViewAll} className="text-sm text-[#ff9800]">ดูสินค้าทั้งหมด</button>
      </div>
    </div>
  );
}
