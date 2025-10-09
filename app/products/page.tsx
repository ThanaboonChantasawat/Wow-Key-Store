"use client";

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import GameCategorySidebar from '@/components/category/GameCategorySidebar';
import { useGamesByGameId, useSearchGames } from '@/hooks/useFirestore';
import GameCard from '@/components/card/GameCard';

function ProductsContent() {
  const searchParams = useSearchParams();
  const q = searchParams ? searchParams.get('q') ?? '' : '';
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Use search hook if there's a query, otherwise use game filter
  const searchResult = useSearchGames(q || null, null);
  const gameFilterResult = useGamesByGameId(selectedGameId);
  
  // Determine which result to use
  const { games, loading, error } = q ? searchResult : gameFilterResult;

  const handleGameSelect = (gameId: string | null) => {
    setSelectedGameId(gameId);
    setIsSidebarOpen(false); // Close sidebar on mobile after selection
  };

  return (
    <div className="min-h-screen bg-[#f2f2f4]">
      <div className="flex flex-col lg:flex-row gap-6 py-4 sm:py-6 px-4 sm:px-6">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden fixed bottom-6 left-6 z-40 bg-[#ff9800] hover:bg-[#e08800] text-white p-4 rounded-full shadow-lg transition-colors"
          aria-label="เปิดเมนู"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar - Desktop & Mobile Drawer */}
        <aside
          className={`
            fixed lg:relative
            top-0 left-0
            h-full lg:h-auto
            w-80
            bg-white lg:bg-transparent
            z-50 lg:z-auto
            transform lg:transform-none
            transition-transform duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            overflow-y-auto lg:overflow-visible
            flex-shrink-0
          `}
        >
          {/* Close Button - Mobile Only */}
          <div className="lg:hidden flex justify-end p-4">
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="text-gray-500 hover:text-gray-700"
              aria-label="ปิดเมนู"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="px-4 lg:px-0">
            <GameCategorySidebar 
              onGameSelect={handleGameSelect}
              selectedGameId={selectedGameId}
            />
          </div>
        </aside>

        {/* Right Content */}
        <main className="flex-1">
          {/* Header */}
          <div className="bg-[#292d32] text-[#ffffff] rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex items-center justify-between">
              <h1 className="text-xl sm:text-2xl font-bold">สินค้าทั้งหมด</h1>
            </div>
          </div>

          {/* Products Content */}
          <div className="bg-[#ffffff] rounded-lg p-4 sm:p-6">
            {q && (
              <div className="mb-4">
                <p className="text-gray-600">ผลการค้นหา: <span className="font-semibold text-gray-900">{q}</span></p>
              </div>
            )}
            
            <GameCard 
              games={games}
              loading={loading}
              error={error}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function Products() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f2f2f4] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff9800]"></div>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
