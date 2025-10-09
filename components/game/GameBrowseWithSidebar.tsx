'use client'

import { useState } from 'react';
import GameCategorySidebar from '@/components/category/GameCategorySidebar';
import { useGamesByGameId } from '@/hooks/useFirestore';
import GameCard from '@/components/card/GameCard';
import Link from 'next/link';

const GameBrowseWithSidebar = () => {
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  
  // Fetch games based on selected game ID
  const { games, loading, error } = useGamesByGameId(selectedGameId);

  return (
    <section className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex gap-6">
          {/* Left Sidebar */}
          <div className="w-80 flex-shrink-0">
            <GameCategorySidebar 
              onGameSelect={setSelectedGameId}
              selectedGameId={selectedGameId}
            />
          </div>

          {/* Right Content */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              {selectedGameId ? 'สินค้าที่เลือก' : 'เกมยอดนิยม'}
            </h2>
            
            <GameCard 
              games={games}
              loading={loading}
              error={error}
              limit={selectedGameId ? undefined : 6}
            />

            {!selectedGameId && (
              <div className="text-center mt-8">
                <Link 
                  href="/products" 
                  className="inline-block bg-[#ff9800] hover:bg-[#e08800] text-white px-8 py-3 rounded-lg font-medium transition-colors"
                >
                  ดูสินค้าทั้งหมด
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default GameBrowseWithSidebar;
