'use client'

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useCategories } from '@/hooks/useFirestore';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/components/firebase-config';

interface Game {
  id: string;
  name: string;
  categoryIds: string[];
}

interface GameCategorySidebarProps {
  onGameSelect?: (gameId: string | null) => void;
  selectedGameId?: string | null;
}

const GameCategorySidebar = ({ onGameSelect, selectedGameId }: GameCategorySidebarProps) => {
  const { categories, loading: categoriesLoading } = useCategories();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [games, setGames] = useState<Game[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);

  // Fetch all games
  useEffect(() => {
    const fetchGames = async () => {
      try {
        const gamesSnapshot = await getDocs(collection(db, 'games'));
        const gamesData = gamesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Game[];
        setGames(gamesData);
      } catch (error) {
        console.error('Error fetching games:', error);
      } finally {
        setGamesLoading(false);
      }
    };

    fetchGames();
  }, []);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  };

  const getGamesByCategory = (categoryId: string) => {
    return games.filter(game => game.categoryIds?.includes(categoryId));
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
        
        <div className="space-y-1">
          {categories.map((category) => {
            const categoryGames = getGamesByCategory(category.id);
            const isExpanded = expandedCategories.has(category.name);

            return (
              <div key={category.id} className="border-b border-gray-100 last:border-b-0 py-1">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.name)}
                  className="w-full flex items-center justify-between py-3 px-3 hover:bg-gray-50 rounded-lg transition-all duration-200 group"
                >
                  <span className={`font-semibold text-left transition-colors ${isExpanded ? 'text-[#ff9800]' : 'text-gray-800 group-hover:text-[#ff9800]'}`}>
                    {category.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {categoryGames.length > 0 && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                        {categoryGames.length}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-[#ff9800]" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-[#ff9800] transition-colors" />
                    )}
                  </div>
                </button>

                {/* Games List (Dropdown) */}
                {isExpanded && (
                  <div className="ml-3 mb-3 mt-1 space-y-1 animate-in slide-in-from-top-2 duration-200">
                    {categoryGames.length > 0 ? (
                      categoryGames.map((game) => (
                        <button
                          key={game.id}
                          onClick={() => handleGameClick(game.id)}
                          className={`w-full text-left py-2.5 px-4 rounded-lg text-sm transition-all duration-200 ${
                            selectedGameId === game.id
                              ? 'bg-[#ff9800] text-white font-medium shadow-sm'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 hover:pl-5'
                          }`}
                        >
                          {game.name}
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400 py-2 px-4 italic">ไม่มีเกมในหมวดหมู่นี้</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GameCategorySidebar;
