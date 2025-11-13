'use client'

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useCategories } from '@/hooks/useFirestore';

interface Game {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  categories: string[];
  isPopular: boolean;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

interface ProductCategorySidebarProps {
  onGameSelect?: (gameId: string | null) => void;
  selectedGameId?: string | null;
}

const ProductCategorySidebar = ({ onGameSelect, selectedGameId }: ProductCategorySidebarProps) => {
  const { categories, loading: categoriesLoading } = useCategories();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [games, setGames] = useState<Game[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);

  // Fetch all games via API
  useEffect(() => {
    const fetchGames = async () => {
      try {
        const response = await fetch('/api/games');
        if (!response.ok) throw new Error('Failed to fetch games');
        const data = await response.json();
        // API returns array directly
        setGames(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching games:', error);
        setGames([]);
      } finally {
        setGamesLoading(false);
      }
    };

    fetchGames();
  }, []);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const getGamesByCategory = (categorySlug: string) => {
    // Filter games that have this category slug in their categories array and are active
    console.log('Filtering games for category:', categorySlug);
    console.log('Available games:', games);
    
    const filteredGames = games.filter(game => {
      const hasCategory = game.categories?.includes(categorySlug);
      const isActive = game.status === 'active';
      console.log(`Game ${game.name}: categories=${game.categories}, hasCategory=${hasCategory}, isActive=${isActive}`);
      return hasCategory && isActive;
    });
    
    console.log('Filtered games:', filteredGames);
    return filteredGames;
  };

  const handleGameClick = (gameId: string) => {
    if (onGameSelect) {
      // Toggle selection - if already selected, deselect
      onGameSelect(selectedGameId === gameId ? null : gameId);
    }
  };

  if (categoriesLoading || gamesLoading) {
    return (
      <div className="w-full bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-md overflow-hidden h-fit sticky top-4">
      {/* Categories Section */}
      <div className="p-6">
        <h2 className="text-xl font-bold mb-6 text-gray-900 border-b pb-3">หมวดหมู่สินค้า</h2>
        
        {/* All Products Button */}
        <button
          onClick={() => onGameSelect?.(null)}
          className={`w-full flex items-center justify-between py-3 px-3 rounded-lg transition-all duration-200 mb-2 ${
            selectedGameId === null
              ? 'bg-[#ff9800] text-white font-semibold'
              : 'hover:bg-gray-50 text-gray-700'
          }`}
        >
          <span className="text-base">สินค้าทั้งหมด</span>
          {selectedGameId === null && (
            <span className="text-sm bg-white/20 px-2 py-1 rounded">✓</span>
          )}
        </button>

        <div className="space-y-1">
          {categories.map((category) => {
            const categorySlug = category.slug;
            const categoryGames = getGamesByCategory(categorySlug);
            const isExpanded = expandedCategories.has(categorySlug);

            return (
              <div key={categorySlug} className="border-b border-gray-100 last:border-b-0 py-1">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(categorySlug)}
                  className="w-full flex items-center justify-between py-3 px-3 hover:bg-gray-50 rounded-lg transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900 group-hover:text-[#ff9800] transition-colors">
                      {category.name}
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {categoryGames.length}
                    </span>
                  </div>
                  
                  <div className="text-gray-400 group-hover:text-[#ff9800] transition-colors">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </button>

                {/* Games List */}
                {isExpanded && categoryGames.length > 0 && (
                  <div className="ml-4 mt-1 mb-2 space-y-1 bg-gray-50 rounded-md">
                    {categoryGames.map((game) => {
                      const isSelected = selectedGameId === game.id;
                      
                      return (
                        <button
                          key={game.id}
                          onClick={() => handleGameClick(game.id)}
                          className={`w-full text-left py-2 px-3 rounded-md transition-all duration-200 text-sm ${
                            isSelected
                              ? 'bg-[#ff9800] text-white font-medium ml-0 border-l-4 border-[#ff9800]'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-[#ff9800] ml-0 border-l-4 border-transparent hover:border-[#ff9800]'
                          }`}
                        >
                          {game.name}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Empty State */}
                {isExpanded && categoryGames.length === 0 && (
                  <div className="ml-4 mt-1 mb-2 py-2 px-3 text-sm text-gray-400 italic">
                    ไม่มีเกมในหมวดหมู่นี้
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {categories.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">ยังไม่มีหมวดหมู่</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCategorySidebar;
