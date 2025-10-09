'use client'

import { useState } from 'react';
import CategoryFilter from '../category/CategoryFilter';
import GameCard from '../card/GameCard';
import { useGamesByCategory, useSearchGames } from '@/hooks/useFirestore';

interface GameListWithFilterProps {
  limit?: number;
  showCategoryFilter?: boolean;
  title?: string;
  query?: string | null;
}

const GameListWithFilter = ({ 
  limit, 
  showCategoryFilter = true, 
  title = "เกมทั้งหมด",
  query = null,
}: GameListWithFilterProps) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Always call hooks (don't call hooks conditionally)
  const searchResult = useSearchGames(query, selectedCategoryId);
  const categoryResult = useGamesByCategory(selectedCategoryId);

  // If query is provided, prefer searchResult; otherwise use categoryResult
  const games = query && query.trim() !== '' ? searchResult.games : categoryResult.games;
  const loading = query && query.trim() !== '' ? searchResult.loading : categoryResult.loading;
  const error = query && query.trim() !== '' ? searchResult.error : categoryResult.error;

  return (
    <div className="w-full">
      {title && (
        <h2 className="text-2xl font-bold mb-6 text-gray-900">{title}</h2>
      )}
      
      {showCategoryFilter && (
        <CategoryFilter 
          selectedCategoryId={selectedCategoryId}
          onCategoryChange={setSelectedCategoryId}
        />
      )}
      
      <GameCard 
        games={games}
        loading={loading}
        error={error}
        limit={limit}
      />
    </div>
  );
};

export default GameListWithFilter;